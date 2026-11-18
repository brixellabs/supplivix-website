"""
Complete Automated Test Suite for Sale Events / Campaign Management & PricingService.
Tests cover:
A. 16 PricingService Unit Tests (percentage, flat, start/end boundaries, priority resolution,
   category hierarchy, product targeting, exclusions, item overrides, caps, rounding, floor).
B. Cart & Checkout Integration (runtime recalculation, anti-tampering, coupon stacking, order item snapshots).
C. Admin Panel API & Guardrails (permissions, validations, 90% discount confirmation, duplicate, end-now).
D. Performance & Cache Invalidation (batch annotation query count, cache clearing).
"""

from datetime import timedelta
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem
from promotions.models import Coupon, SaleEvent, SaleEventItem
from promotions.services import PricingService

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_caches_and_data(db):
    cache.clear()
    PricingService.invalidate_cache()
    yield
    cache.clear()
    PricingService.invalidate_cache()


@pytest.fixture
def sample_categories(db):
    parent = Category.objects.create(name='Wellness', slug='wellness')
    child = Category.objects.create(name='Daily Multivitamins', slug='daily-multivitamins', parent=parent)
    other = Category.objects.create(name='Skincare', slug='skincare')
    return {'parent': parent, 'child': child, 'other': other}


@pytest.fixture
def sample_products(db, sample_categories):
    p1 = Product.objects.create(
        name='Daily Vitamin A',
        slug='daily-vitamin-a',
        sku='TEST-SKU-1',
        price=2000,
        compare_at_price=2500,
        category=sample_categories['child'],
        is_active=True,
        stock=50,
    )
    p2 = Product.objects.create(
        name='Glow Serum C',
        slug='glow-serum-c',
        sku='TEST-SKU-2',
        price=1500,
        compare_at_price=None,
        category=sample_categories['other'],
        is_active=True,
        stock=30,
    )
    p3 = Product.objects.create(
        name='Immunity Shield Tablet',
        slug='immunity-shield-tablet',
        sku='TEST-SKU-3',
        price=1000,
        compare_at_price=1200,
        category=sample_categories['parent'],
        is_active=True,
        stock=20,
    )
    return {'p1': p1, 'p2': p2, 'p3': p3}


@pytest.fixture
def admin_client(db):
    admin = User.objects.create_superuser(
        email='admin_sale_test@supplivix.com',
        full_name='Admin User',
        is_staff=True,
        is_superuser=True,
    )
    admin.set_password('Secret123!')
    admin.save()
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.fixture
def regular_client(db):
    user = User.objects.create_user(
        email='customer_sale_test@example.com',
        full_name='Regular Customer',
    )
    user.set_password('Secret123!')
    user.save()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ==============================================================================
# A. 16 PricingService Unit Tests
# ==============================================================================
@pytest.mark.django_db
class TestPricingServiceUnit:

    def test_01_active_event_applies_correct_percentage_discount(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Summer 20% Sale',
            slug='summer-20',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['is_on_sale'] is True
        assert res['original_price'] == 2000
        assert res['sale_price'] == 1600  # 2000 - 400
        assert res['discount_amount'] == 400
        assert res['discount_percent_effective'] == 20

    def test_02_active_event_applies_correct_flat_discount(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Flat Rs 300 Off',
            slug='flat-300',
            discount_type=SaleEvent.DISCOUNT_FLAT,
            discount_value=Decimal('300.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p2'], now=now)
        assert res['is_on_sale'] is True
        assert res['original_price'] == 1500
        assert res['sale_price'] == 1200
        assert res['discount_amount'] == 300

    def test_03_event_not_started_yet_returns_regular_price(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Future Sale',
            slug='future-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now + timedelta(days=2),
            end_at=now + timedelta(days=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['is_on_sale'] is False
        assert res['sale_price'] == 2000
        assert res['discount_amount'] == 0

    def test_04_event_expired_returns_regular_price(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Expired Sale',
            slug='expired-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(days=5),
            end_at=now - timedelta(hours=1),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['is_on_sale'] is False
        assert res['sale_price'] == 2000

    def test_05_disabled_event_returns_regular_price(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Disabled Sale',
            slug='disabled-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=False,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['is_on_sale'] is False
        assert res['sale_price'] == 2000

    def test_06_overlapping_events_higher_priority_wins(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Low Priority 50%',
            slug='low-priority',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            priority=5,
            is_enabled=True,
        )
        SaleEvent.objects.create(
            name='High Priority 10%',
            slug='high-priority',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('10.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            priority=20,
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['event_name'] == 'High Priority 10%'
        assert res['sale_price'] == 1800  # 10% wins because priority 20 > 5

    def test_07_overlapping_events_same_priority_lowest_price_wins(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Event A 15%',
            slug='event-a',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('15.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            priority=10,
            is_enabled=True,
        )
        SaleEvent.objects.create(
            name='Event B 25%',
            slug='event-b',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('25.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            priority=10,
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['event_name'] == 'Event B 25%'
        assert res['sale_price'] == 1500  # 25% gives lower price (1500 < 1700)

    def test_08_category_match_applies_to_product_in_that_category(self, sample_products, sample_categories):
        now = timezone.now()
        ev = SaleEvent.objects.create(
            name='Skincare Only Sale',
            slug='skincare-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('30.00'),
            apply_on=SaleEvent.APPLY_CATEGORIES,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        SaleEventItem.objects.create(
            sale_event=ev,
            target_type=SaleEventItem.TARGET_CATEGORY,
            target_id=sample_categories['other'].id,
        )
        # p2 is in skincare category
        res2 = PricingService.calculate_sale_price(sample_products['p2'], now=now)
        assert res2['is_on_sale'] is True
        assert res2['sale_price'] == 1050

        # p1 is in wellness/multivitamins category
        res1 = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res1['is_on_sale'] is False
        assert res1['sale_price'] == 2000

    def test_09_category_match_applies_to_product_in_child_category(self, sample_products, sample_categories):
        now = timezone.now()
        ev = SaleEvent.objects.create(
            name='Parent Category Sale',
            slug='parent-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_CATEGORIES,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        SaleEventItem.objects.create(
            sale_event=ev,
            target_type=SaleEventItem.TARGET_CATEGORY,
            target_id=sample_categories['parent'].id,
        )
        # p1 is in child category 'Daily Multivitamins' whose parent is 'Wellness'
        res1 = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res1['is_on_sale'] is True
        assert res1['sale_price'] == 1600

    def test_10_product_target_applies_only_to_targeted_product(self, sample_products):
        now = timezone.now()
        ev = SaleEvent.objects.create(
            name='Targeted Product Sale',
            slug='target-p1',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('10.00'),
            apply_on=SaleEvent.APPLY_PRODUCTS,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        SaleEventItem.objects.create(
            sale_event=ev,
            target_type=SaleEventItem.TARGET_PRODUCT,
            target_id=sample_products['p1'].id,
        )
        res1 = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        res2 = PricingService.calculate_sale_price(sample_products['p2'], now=now)
        assert res1['is_on_sale'] is True
        assert res2['is_on_sale'] is False

    def test_11_excluded_product_does_not_apply_sale(self, sample_products):
        now = timezone.now()
        ev = SaleEvent.objects.create(
            name='All Except P2',
            slug='all-except-p2',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('25.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        SaleEventItem.objects.create(
            sale_event=ev,
            target_type=SaleEventItem.TARGET_PRODUCT,
            target_id=sample_products['p2'].id,
            is_excluded=True,
        )
        res1 = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        res2 = PricingService.calculate_sale_price(sample_products['p2'], now=now)
        assert res1['is_on_sale'] is True
        assert res2['is_on_sale'] is False

    def test_12_custom_per_item_discount_overrides_event_discount(self, sample_products):
        now = timezone.now()
        ev = SaleEvent.objects.create(
            name='Campaign 10%',
            slug='campaign-10',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('10.00'),
            apply_on=SaleEvent.APPLY_PRODUCTS,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        SaleEventItem.objects.create(
            sale_event=ev,
            target_type=SaleEventItem.TARGET_PRODUCT,
            target_id=sample_products['p1'].id,
            custom_discount_value=Decimal('40.00'),
        )
        res1 = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res1['is_on_sale'] is True
        assert res1['discount_percent_effective'] == 40
        assert res1['sale_price'] == 1200  # 2000 - 40% = 1200

    def test_13_max_discount_amount_cap_is_respected(self, sample_products):
        now = timezone.now()
        # 50% of 2000 is 1000, but cap is 300 PKR
        SaleEvent.objects.create(
            name='Capped 50% Sale',
            slug='capped-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            max_discount_amount=300,
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['discount_amount'] == 300
        assert res['sale_price'] == 1700  # 2000 - 300

    def test_14_price_never_goes_below_zero(self, sample_products):
        now = timezone.now()
        # Flat 3000 discount on a 1500 product
        SaleEvent.objects.create(
            name='Excessive Flat Sale',
            slug='excessive-sale',
            discount_type=SaleEvent.DISCOUNT_FLAT,
            discount_value=Decimal('3000.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p2'], now=now)
        assert res['sale_price'] >= 0
        assert res['sale_price'] == 0

    def test_15_rounding_rule_applied_consistently(self):
        # 33% of 125 = 41.25 -> rounds to 41 whole PKR
        sale = PricingService.compute_event_discount(125, SaleEvent.DISCOUNT_PERCENT, Decimal('33'), None)
        assert isinstance(sale, int)
        assert sale == 84  # 125 - 41 = 84

    def test_16_product_with_existing_compare_at_price_documented_behavior(self, sample_products):
        now = timezone.now()
        # p1 has price=2000, compare_at_price=2500
        # Documented behavior: Sale event percentage is applied to the active base catalog price (2000),
        # ensuring customer always gets true campaign savings over regular selling price.
        SaleEvent.objects.create(
            name='Base Price Event',
            slug='base-price-event',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        res = PricingService.calculate_sale_price(sample_products['p1'], now=now)
        assert res['original_price'] == 2000
        assert res['sale_price'] == 1600


# ==============================================================================
# B. Cart & Checkout Integration Tests
# ==============================================================================
@pytest.mark.django_db
class TestCartAndCheckoutSaleEvents:

    def test_cart_subtotal_and_line_items_show_sale_prices(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Eid 20% Sale',
            slug='eid-20',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        cart = Cart.objects.create(session_key='session-cart-test')
        CartItem.objects.create(cart=cart, product=sample_products['p1'], quantity=2)

        client = APIClient()
        resp = client.get('/api/v1/cart/', HTTP_X_SESSION_KEY=cart.session_key)
        assert resp.status_code == 200
        data = resp.data
        item = data['items'][0]
        assert item['unit_price'] == 1600  # 2000 - 20%
        assert item['line_total'] == 3200
        assert data['subtotal'] == 3200

    def test_checkout_recalculates_and_ignores_tampered_client_price(self, sample_products):
        now = timezone.now()
        event = SaleEvent.objects.create(
            name='Eid 20% Sale',
            slug='eid-20',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        cart = Cart.objects.create(session_key='session-tamper-test')
        CartItem.objects.create(cart=cart, product=sample_products['p1'], quantity=1)

        from orders.services import place_cod_order
        # Client tries to pass a tampered price or bogus total
        checkout_data = {
            'full_name': 'Amna Ali',
            'phone': '03001234567',
            'line1': 'Street 1, DHA Phase 5',
            'city': 'Karachi',
            'province': 'Sindh',
            'payment_method': 'COD',
            'tampered_price': 50,  # ignored
        }
        order = place_cod_order(cart, checkout_data)
        item = order.items.first()
        # Server verifies and enforces PricingService calculation
        assert item.unit_price == 1600
        assert item.original_price == 2000
        assert item.sale_price == 1600
        assert item.sale_event_id == event.id
        assert item.discount_amount == 400

    def test_coupon_stacking_disallowed_when_allow_coupon_stacking_false(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Non-stacking Eid Sale',
            slug='non-stacking-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            allow_coupon_stacking=False,
            is_enabled=True,
        )
        coupon = Coupon.objects.create(
            code='DISC10',
            type=Coupon.TYPE_PERCENT,
            value=10,
            is_active=True,
        )
        cart = Cart.objects.create(session_key='session-stack-test', coupon_code=coupon.code)
        CartItem.objects.create(cart=cart, product=sample_products['p1'], quantity=1)

        from orders.services import calculate_checkout_quote
        quote = calculate_checkout_quote(cart.items.all(), coupon_code=coupon.code)
        # Because coupon stacking is false, coupon discount on the on-sale product is 0
        assert quote['coupon_discount'] == 0
        assert quote['sale_discount_total'] == 400

    def test_coupon_stacking_allowed_calculates_on_sale_price(self, sample_products):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Stacking Eid Sale',
            slug='stacking-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            allow_coupon_stacking=True,
            is_enabled=True,
        )
        coupon = Coupon.objects.create(
            code='EXTRA10',
            type=Coupon.TYPE_PERCENT,
            value=10,
            is_active=True,
        )
        cart = Cart.objects.create(session_key='session-stack-true', coupon_code=coupon.code)
        CartItem.objects.create(cart=cart, product=sample_products['p1'], quantity=1)

        from orders.services import calculate_checkout_quote
        quote = calculate_checkout_quote(cart.items.all(), coupon_code=coupon.code)
        # Sale price is 1600. 10% coupon on 1600 is 160.
        assert quote['subtotal'] == 1600
        assert quote['coupon_discount'] == 160
        assert quote['sale_discount_total'] == 400

    def test_past_order_snapshot_unaffected_when_sale_event_deleted(self, sample_products):
        now = timezone.now()
        event = SaleEvent.objects.create(
            name='Temporary Flash Sale',
            slug='temp-flash',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('50.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        cart = Cart.objects.create(session_key='session-past-order-test')
        CartItem.objects.create(cart=cart, product=sample_products['p1'], quantity=1)

        from orders.services import place_cod_order
        checkout_data = {
            'full_name': 'Test Buyer',
            'phone': '03009999999',
            'line1': 'Flat 202',
            'city': 'Lahore',
            'province': 'Punjab',
            'payment_method': 'COD',
        }
        order = place_cod_order(cart, checkout_data)

        # Now soft-delete or expire the event
        event.delete(soft=True)

        # Inspect order item - snapshot must remain completely intact
        saved_item = OrderItem.objects.get(order=order)
        assert saved_item.sale_price == 1000
        assert saved_item.original_price == 2000
        assert saved_item.discount_amount == 1000
        assert saved_item.sale_event_name == 'Temporary Flash Sale'
        assert saved_item.sale_event_name == 'Temporary Flash Sale'


# ==============================================================================
# C. Admin Panel API & Guardrail Tests
# ==============================================================================
@pytest.mark.django_db
class TestAdminSaleEvents:

    def test_non_admin_cannot_access_sale_events(self, regular_client):
        resp = regular_client.get('/api/v1/admin/sale-events/')
        assert resp.status_code == 403

    def test_admin_can_create_valid_sale_event(self, admin_client):
        now = timezone.now()
        payload = {
            'name': 'Eid ul Adha Special Campaign',
            'badge_text': 'BARI EID SALE',
            'discount_type': 'percent',
            'discount_value': '25',
            'apply_on': 'all',
            'start_at': (now + timedelta(hours=1)).isoformat(),
            'end_at': (now + timedelta(days=7)).isoformat(),
            'priority': '10',
            'show_countdown': 'true',
            'is_enabled': 'true',
        }
        resp = admin_client.post('/api/v1/admin/sale-events/', payload)
        assert resp.status_code == 201
        assert resp.data['event']['name'] == 'Eid ul Adha Special Campaign'
        assert resp.data['event']['effective_status'] == 'scheduled'

    def test_validation_rejects_end_date_before_start_date(self, admin_client):
        now = timezone.now()
        payload = {
            'name': 'Bad Dates Sale',
            'discount_type': 'percent',
            'discount_value': '20',
            'start_at': (now + timedelta(days=5)).isoformat(),
            'end_at': (now + timedelta(days=2)).isoformat(),  # End before start
        }
        resp = admin_client.post('/api/v1/admin/sale-events/', payload)
        assert resp.status_code == 400
        assert 'after' in resp.data['message'].lower()

    def test_validation_rejects_percent_greater_than_100(self, admin_client):
        now = timezone.now()
        payload = {
            'name': 'Invalid Percent Sale',
            'discount_type': 'percent',
            'discount_value': '150',
            'start_at': now.isoformat(),
            'end_at': (now + timedelta(days=2)).isoformat(),
        }
        resp = admin_client.post('/api/v1/admin/sale-events/', payload)
        assert resp.status_code == 400

    def test_guardrail_blocks_over_90_percent_without_explicit_confirmation(self, admin_client):
        now = timezone.now()
        payload = {
            'name': '95% Huge Sale',
            'discount_type': 'percent',
            'discount_value': '95',
            'start_at': now.isoformat(),
            'end_at': (now + timedelta(days=2)).isoformat(),
        }
        resp = admin_client.post('/api/v1/admin/sale-events/', payload)
        assert resp.status_code == 400
        assert resp.data.get('requires_confirmation') is True

        # Now send with confirmation
        payload['confirm_high_discount'] = 'true'
        resp_confirm = admin_client.post('/api/v1/admin/sale-events/', payload)
        assert resp_confirm.status_code == 201

    def test_duplicate_event_creates_draft_copy(self, admin_client):
        now = timezone.now()
        event = SaleEvent.objects.create(
            name='Original Campaign',
            slug='original-campaign',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            start_at=now,
            end_at=now + timedelta(days=3),
            is_enabled=True,
        )
        resp = admin_client.post(f'/api/v1/admin/sale-events/{event.id}/duplicate/')
        assert resp.status_code == 201
        assert resp.data['name'] == 'Original Campaign (Copy)'
        assert resp.data['is_enabled'] is False
        assert resp.data['effective_status'] in [SaleEvent.STATUS_DISABLED, SaleEvent.STATUS_DRAFT]

    def test_end_now_action_expires_event_immediately(self, admin_client):
        now = timezone.now()
        event = SaleEvent.objects.create(
            name='Active To End',
            slug='active-to-end',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            start_at=now - timedelta(hours=2),
            end_at=now + timedelta(days=3),
            is_enabled=True,
        )
        resp = admin_client.post(f'/api/v1/admin/sale-events/{event.id}/end-now/')
        assert resp.status_code == 200
        assert resp.data['effective_status'] == 'expired'


# ==============================================================================
# D. Concurrency & Performance Tests
# ==============================================================================
@pytest.mark.django_db
class TestConcurrencyAndCache:

    def test_batch_annotate_products_has_zero_n_plus_one_queries(self, sample_products, django_assert_num_queries):
        now = timezone.now()
        SaleEvent.objects.create(
            name='Query Benchmark Sale',
            slug='benchmark-sale',
            discount_type=SaleEvent.DISCOUNT_PERCENT,
            discount_value=Decimal('20.00'),
            apply_on=SaleEvent.APPLY_ALL,
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=5),
            is_enabled=True,
        )
        products_list = list(Product.objects.all())
        # First call warms cache
        PricingService.batch_annotate_products(products_list, now=now)

        # Subsequent call with active cached events must make ZERO extra queries for pricing
        with django_assert_num_queries(0):
            PricingService.batch_annotate_products(products_list, now=now)

    def test_cache_invalidated_when_event_created(self, sample_products, admin_client):
        now = timezone.now()
        # Warm cache with no events
        events_before = PricingService.get_active_events(now=now)
        assert len(events_before) == 0

        # Create event via admin API
        payload = {
            'name': 'Immediate Event',
            'discount_type': 'percent',
            'discount_value': '20',
            'start_at': (now - timedelta(minutes=5)).isoformat(),
            'end_at': (now + timedelta(hours=5)).isoformat(),
            'apply_on': 'all',
            'is_enabled': 'true',
        }
        admin_client.post('/api/v1/admin/sale-events/', payload)

        # Cache must be invalidated, new event detected immediately
        events_after = PricingService.get_active_events(now=now)
        assert len(events_after) == 1
        assert events_after[0].name == 'Immediate Event'
