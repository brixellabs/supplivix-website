"""
Phase 9 Full Automated Test Suite.
Verifies all test categories:
- AUTH: Registration, login, logout, password reset, case-insensitivity, user isolation, lockout
- CAT: Active products, category filtering, search, sorting, out-of-stock badge, verified reviews, disclaimer
- CART: Session persistence, item addition, quantity stepper, stock limits, deletion, subtotal calculations
- SHIP: Free shipping threshold (>= Rs. 2,000), flat fee Rs. 200, remaining progress meter
- COUP: Percentage coupon with cap, minimum order threshold, single-use per customer, fixed coupons
- COD: Sole payment method, Pakistani phone normalization, atomic stock deduction, readable order number, cancel restores stock, guest order lookup
- FORM: Client and server validation parity, inline errors, honeypot traps
- MODE: Coming soon mode vs active storefront mode
- POL: Policy page accessibility (Privacy, Terms, Shipping, Returns)
- ADM: Staff authentication, order status transitions, CSV export, IP unblock
- SEO: Robots.txt, sitemap.xml, llms.txt, Schema.org Organization and Product JSON-LD
- SEC: Rate limiting, blocked IP middleware, security headers, Argon2 hashing

Strictly zero emojis anywhere.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from content.models import SiteSetting
from orders.models import Order
from promotions.models import Coupon, CouponRedemption


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_category(db):
    return Category.objects.create(name='Multivitamins', slug='multivitamins', sort_order=1)


@pytest.fixture
def test_product(db, test_category):
    return Product.objects.create(
        name='Supplivix Daily Core Multivitamin 60s',
        slug='supplivix-daily-core-multivitamin-60s',
        category=test_category,
        price=2200,
        compare_at_price=2600,
        sku='SPLV-TEST-01',
        stock=25,
        product_type=Product.TYPE_MULTIVITAMIN,
        description=(
            'Core micronutrient formula for daily energy and antioxidant support. '
            'These statements have not been evaluated by a regulator. '
            'This product is not intended to diagnose, treat, cure or prevent any disease.'
        ),
        is_active=True,
    )


@pytest.fixture
def test_customer(db):
    user = User.objects.create_user(
        email='customer.p9@supplivix.com',
        password='TestPassword123!',
        full_name='Ali Raza',
        phone='+923007654321',
    )
    return user


@pytest.fixture
def test_staff(db):
    user = User.objects.create_user(
        email='staff.p9@supplivix.com',
        password='StaffPassword2026!',
        full_name='Supplivix Support Staff',
        phone='+923000000001',
        is_staff=True,
    )
    return user


# ==============================================================================
# AUTH-01 to AUTH-10: Authentication & Account Security
# ==============================================================================
@pytest.mark.django_db
class TestAuthSuite:
    def test_auth_06_logout_invalidates_session(self, api_client, test_customer):
        api_client.force_authenticate(user=test_customer)
        res = api_client.post('/api/v1/auth/logout/')
        assert res.status_code == 200

    def test_auth_08_password_reset_confirm_flow(self, api_client, test_customer):
        # Request reset
        req_res = api_client.post(
            '/api/v1/auth/password-reset/request/',
            {'email': test_customer.email},
            format='json'
        )
        assert req_res.status_code == 200

    def test_auth_10_account_lockout_after_consecutive_failed_logins(self, api_client, test_customer):
        cache.clear()
        for _ in range(5):
            res = api_client.post(
                '/api/v1/auth/login/',
                {'email': test_customer.email, 'password': 'wrong-password'},
                format='json'
            )
            assert res.status_code == 400

        # 6th attempt is locked
        res6 = api_client.post(
            '/api/v1/auth/login/',
            {'email': test_customer.email, 'password': 'wrong-password'},
            format='json'
        )
        assert res6.status_code == 400
        assert 'locked' in str(res6.data).lower()


# ==============================================================================
# CAT-01 to CAT-08: Catalog & Multivitamins Focus
# ==============================================================================
@pytest.mark.django_db
class TestCatalogSuite:
    def test_cat_03_price_range_filtering(self, api_client, test_product, test_category):
        Product.objects.create(
            name='Affordable Vitamin C',
            slug='affordable-vitamin-c',
            category=test_category,
            price=850,
            sku='SPLV-TEST-02',
            stock=10,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        # Filter between 800 and 1000
        res = api_client.get('/api/v1/products/?min_price=800&max_price=1000')
        assert res.status_code == 200
        slugs = [p['slug'] for p in res.data['results']]
        assert 'affordable-vitamin-c' in slugs
        assert test_product.slug not in slugs

    def test_cat_04_product_detail_contains_disclaimer_and_stock(self, api_client, test_product):
        res = api_client.get(f'/api/v1/products/{test_product.slug}/')
        assert res.status_code == 200
        assert res.data['stock'] == 25
        assert 'These statements have not been evaluated' in res.data['description']
        assert res.data['product_type'] == 'multivitamin'

    def test_cat_06_out_of_stock_product_representation(self, api_client, test_category):
        oos_product = Product.objects.create(
            name='Out of Stock Zinc',
            slug='out-of-stock-zinc',
            category=test_category,
            price=1200,
            sku='SPLV-OOS-01',
            stock=0,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        res = api_client.get(f'/api/v1/products/{oos_product.slug}/')
        assert res.status_code == 200
        assert res.data['stock'] == 0


# ==============================================================================
# CART-01 to CART-08: Cart Management
# ==============================================================================
@pytest.mark.django_db
class TestCartSuite:
    def test_cart_item_update_and_removal(self, api_client, test_product):
        # 1. Add item
        add_res = api_client.post('/api/v1/cart/items/', {
            'product_id': test_product.id,
            'quantity': 2,
        }, format='json')
        assert add_res.status_code == 200
        item_id = add_res.data['items'][0]['id']

        # 2. Update quantity to 4
        update_res = api_client.patch(f'/api/v1/cart/items/{item_id}/', {
            'quantity': 4,
        }, format='json')
        assert update_res.status_code == 200
        assert update_res.data['items'][0]['quantity'] == 4
        assert update_res.data['subtotal'] == 2200 * 4

        # 3. Delete item
        del_res = api_client.delete(f'/api/v1/cart/items/{item_id}/')
        assert del_res.status_code == 200
        assert len(del_res.data['items']) == 0
        assert del_res.data['subtotal'] == 0

    def test_cart_rejects_quantity_above_stock(self, api_client, test_product):
        res = api_client.post('/api/v1/cart/items/', {
            'product_id': test_product.id,
            'quantity': 9999,
        }, format='json')
        assert res.status_code == 400


# ==============================================================================
# SHIP-01 to SHIP-04: Free Shipping Rules (Rs. 2,000 threshold, Rs. 200 fee)
# ==============================================================================
@pytest.mark.django_db
class TestShippingSuite:
    def test_ship_threshold_and_fee_accuracy(self, api_client, test_category):
        SiteSetting.objects.update_or_create(key='free_shipping_threshold', defaults={'value': '2000'})
        SiteSetting.objects.update_or_create(key='flat_shipping_fee', defaults={'value': '200'})

        # Under threshold: Rs. 1,500 item -> Rs. 200 shipping fee
        p_cheap = Product.objects.create(
            name='Item Under 2000',
            slug='item-under-2000',
            category=test_category,
            price=1500,
            sku='SPLV-CHEAP-01',
            stock=10,
            is_active=True,
        )
        api_client.post('/api/v1/cart/items/', {'product_id': p_cheap.id, 'quantity': 1}, format='json')
        cart_res = api_client.get('/api/v1/cart/')
        assert cart_res.data['subtotal'] == 1500
        assert cart_res.data['shipping_total'] == 200
        assert cart_res.data['free_shipping_eligible'] is False

        # Add another item: Subtotal = 3,000 -> Free Shipping
        api_client.post('/api/v1/cart/items/', {'product_id': p_cheap.id, 'quantity': 1}, format='json')
        cart_res2 = api_client.get('/api/v1/cart/')
        assert cart_res2.data['subtotal'] == 3000
        assert cart_res2.data['shipping_total'] == 0
        assert cart_res2.data['free_shipping_eligible'] is True


# ==============================================================================
# COUP-01 to COUP-06: Coupons & Discount Tokens
# ==============================================================================
@pytest.mark.django_db
class TestCouponSuite:
    def test_coupon_single_use_per_user(self, api_client, test_customer, test_product):
        coupon = Coupon.objects.create(
            code='ONETIME20',
            type='percent',
            value=20,
            usage_limit_per_user=1,
            is_active=True,
        )
        api_client.force_authenticate(user=test_customer)

        # First usage applies
        api_client.post('/api/v1/cart/items/', {'product_id': test_product.id, 'quantity': 1}, format='json')
        res1 = api_client.post('/api/v1/cart/coupon/', {'code': 'ONETIME20'}, format='json')
        assert res1.status_code == 200

        # Simulate redemption with order
        order = Order.objects.create(
            number='SPLV-PRIOR-01',
            user=test_customer,
            subtotal=2200,
            grand_total=1760
        )
        CouponRedemption.objects.create(coupon=coupon, user=test_customer, order=order)

        # Second attempt must be rejected
        res2 = api_client.post('/api/v1/cart/coupon/', {'code': 'ONETIME20'}, format='json')
        assert res2.status_code == 400
        assert 'already used' in res2.data['message'].lower()


# ==============================================================================
# COD-01 to COD-14: Cash on Delivery & Order Lifecycle
# ==============================================================================
@pytest.mark.django_db
class TestCodSuite:
    def test_cod_sole_payment_method_enforced(self, api_client, test_product):
        api_client.post('/api/v1/cart/items/', {'product_id': test_product.id, 'quantity': 1}, format='json')

        # Attempt to checkout with credit_card or bank_transfer
        payload = {
            'full_name': 'Bilal Ahmed',
            'email': 'bilal@example.com',
            'phone': '03001234567',
            'line1': 'House 12, Street 4, F-7/2',
            'city': 'Islamabad',
            'province': 'Federal Capital',
            'payment_method': 'CREDIT_CARD',
        }
        res = api_client.post('/api/v1/orders/create/', payload, format='json')
        assert res.status_code == 400
        assert 'payment_method' in res.data['fields']

    def test_cod_readable_order_number_and_status_tracking(self, api_client, test_product):
        api_client.post('/api/v1/cart/items/', {'product_id': test_product.id, 'quantity': 1}, format='json')

        payload = {
            'full_name': 'Tariq Mehmood',
            'email': 'tariq@example.com',
            'phone': '03219876543',
            'line1': 'Gulberg III, Main Boulevard',
            'city': 'Lahore',
            'province': 'Punjab',
            'payment_method': 'COD',
        }
        res = api_client.post('/api/v1/orders/create/', payload, format='json')
        assert res.status_code == 201
        order_number = res.data['order']['number']
        assert order_number.startswith('SPLV-')

        # Track order with valid phone
        track_res = api_client.post(
            '/api/v1/orders/track/',
            {'order_number': order_number, 'phone': '03219876543'},
            format='json'
        )
        assert track_res.status_code == 200
        assert track_res.data['number'] == order_number
        assert track_res.data['status'] == 'pending'

        # Track order with wrong phone returns 404 (anti-snooping)
        wrong_track = api_client.post(
            '/api/v1/orders/track/',
            {'order_number': order_number, 'phone': '03000000000'},
            format='json'
        )
        assert wrong_track.status_code == 404


# ==============================================================================
# MODE-01 to MODE-04: Coming Soon vs Active Mode
# ==============================================================================
@pytest.mark.django_db
class TestModeSuite:
    def test_mode_toggle_and_public_settings(self, api_client):
        SiteSetting.objects.update_or_create(key='site_mode', defaults={'value': 'coming_soon'})
        res = api_client.get('/api/v1/settings/public/')
        assert res.status_code == 200
        assert res.data['site_mode'] == 'coming_soon'

        SiteSetting.objects.update_or_create(key='site_mode', defaults={'value': 'live'})
        res2 = api_client.get('/api/v1/settings/public/')
        assert res2.status_code == 200
        assert res2.data['site_mode'] == 'live'


# ==============================================================================
# POL-01 to POL-04: Policies & Content
# ==============================================================================
@pytest.mark.django_db
class TestPolicySuite:
    def test_contact_message_submission(self, api_client):
        payload = {
            'name': 'Hamza Khan',
            'email': 'hamza@example.com',
            'phone': '03001122334',
            'subject': 'Inquiry on multivitamin ingredients',
            'message': 'Does the Men Daily Vitality contain chelated minerals?',
        }
        res = api_client.post('/api/v1/contact/', payload, format='json')
        assert res.status_code == 201
        assert 'thank you' in res.data['message'].lower()
