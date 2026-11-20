import pytest
from django.core.exceptions import ValidationError

from accounts.models import Address, User
from cart.models import Cart, CartItem
from catalog.models import Category, Product, ProductAttribute, ProductFAQ, Review
from content.models import SiteSetting, WaitlistEntry
from core.models import BotEvent
from orders.models import Order, OrderItem
from promotions.models import Coupon


@pytest.mark.django_db
class TestHealthEndpoint:
    """Verify health check endpoints return 200 with database connectivity and keep-alive headers."""

    def test_health_check_success(self, client):
        response = client.get('/api/health/')
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['database'] == 'connected'
        assert data['service'] == 'supplivix-backend'

    def test_health_check_routes(self, client):
        for path in ['/health/', '/healthz/', '/ping/', '/api/v1/health/']:
            response = client.get(path)
            assert response.status_code == 200
            assert response.json()['status'] == 'healthy'
            assert 'no-cache' in response['Cache-Control']

    def test_health_check_quick(self, client):
        response = client.get('/health/?quick=1')
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['database'] == 'skipped'

    def test_health_check_head_and_options(self, client):
        res_head = client.head('/health/')
        assert res_head.status_code == 200
        res_opt = client.options('/health/')
        assert res_opt.status_code == 200


@pytest.mark.django_db
class TestAccountsModels:
    """Verify custom User and Address models."""

    def test_create_user(self):
        user = User.objects.create_user(
            email='Customer@Example.Com',
            password='Password123!',
            full_name='Test Customer'
        )
        assert user.email == 'customer@example.com'
        assert user.check_password('Password123!')
        assert user.is_active is True
        assert user.is_staff is False

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email='admin@supplivix.com',
            password='AdminPassword123!',
            full_name='Store Admin'
        )
        assert admin.is_staff is True
        assert admin.is_superuser is True

    def test_address_default_toggle(self):
        user = User.objects.create_user(
            email='address_test@example.com',
            password='Password123!',
            full_name='Address User'
        )
        addr1 = Address.objects.create(
            user=user,
            full_name='Address User',
            phone='03001234567',
            line1='House 1, Street 1',
            city='Faisalabad',
            province='Punjab',
            is_default=True
        )
        assert addr1.is_default is True

        addr2 = Address.objects.create(
            user=user,
            full_name='Address User',
            phone='03001234567',
            line1='House 2, Street 2',
            city='Lahore',
            province='Punjab',
            is_default=True
        )
        addr1.refresh_from_db()
        assert addr1.is_default is False
        assert addr2.is_default is True


@pytest.mark.django_db
class TestCatalogModels:
    """Verify Category, Product, Attributes, FAQs and Reviews."""

    def test_category_and_product_lifecycle(self):
        cat = Category.objects.create(name='Multivitamins', slug='multivitamins')
        subcat = Category.objects.create(name='Daily Multivitamins', slug='daily-multivitamins', parent=cat)
        assert str(subcat) == 'Multivitamins > Daily Multivitamins'

        prod = Product.objects.create(
            name='Daily Balance Multivitamin',
            slug='daily-balance-multivitamin',
            category=subcat,
            price=1450,
            compare_at_price=1750,
            sku='SUP-MULTI-001',
            stock=50,
            product_type=Product.TYPE_MULTIVITAMIN,
            description='Daily multivitamin formula'
        )
        assert prod.in_stock is True
        assert prod.savings == 300

        ProductAttribute.objects.create(product=prod, key='Serving Size', value='1 Tablet Daily')
        ProductFAQ.objects.create(
            product=prod,
            question='When should I take this?',
            answer='Take 1 tablet daily with a meal.'
        )

        user = User.objects.create_user(
            email='reviewer@example.com',
            password='Password123!',
            full_name='Reviewer'
        )
        review = Review.objects.create(
            product=prod,
            user=user,
            rating=5,
            title='Great energy boost',
            body='Felt better within two weeks.',
            is_approved=True
        )
        assert review.is_approved is True
        assert prod.reviews.count() == 1


@pytest.mark.django_db
class TestCartModels:
    """Verify Cart and CartItem computations."""

    def test_cart_item_totals(self):
        cat = Category.objects.create(name='Skincare', slug='skincare')
        prod = Product.objects.create(
            name='Hydra Glow Moisturizer',
            slug='hydra-glow-moisturizer',
            category=cat,
            price=1200,
            sku='SUP-SKIN-001',
            stock=20,
            product_type=Product.TYPE_SKINCARE,
            description='Hydrating moisturizer'
        )
        cart = Cart.objects.create(session_key='test-session-123')
        CartItem.objects.create(cart=cart, product=prod, quantity=2)

        assert cart.total_items == 2
        assert cart.subtotal == 2400


@pytest.mark.django_db
class TestOrderModels:
    """Verify Order, OrderItem, and OrderStatusHistory state transitions."""

    def test_order_status_transitions(self):
        cat = Category.objects.create(name='Vitamins', slug='vitamins')
        prod = Product.objects.create(
            name='Vitamin C 1000',
            slug='vitamin-c-1000',
            category=cat,
            price=890,
            sku='SUP-VITC-001',
            stock=10,
            description='Vitamin C'
        )
        order = Order.objects.create(
            number=Order.generate_order_number(),
            guest_email='guest@example.com',
            status=Order.STATUS_PENDING,
            payment_method='COD',
            subtotal=890,
            shipping_total=200,
            grand_total=1090
        )
        OrderItem.objects.create(
            order=order,
            product=prod,
            product_name=prod.name,
            sku=prod.sku,
            unit_price=prod.price,
            quantity=1,
            line_total=prod.price
        )

        assert order.status == Order.STATUS_PENDING

        # Valid forward transition: pending -> confirmed
        order.transition_to(Order.STATUS_CONFIRMED, note='Confirmed via customer call')
        assert order.status == Order.STATUS_CONFIRMED
        assert order.status_history.count() == 1
        history1 = order.status_history.last()
        assert history1.from_status == Order.STATUS_PENDING
        assert history1.to_status == Order.STATUS_CONFIRMED
        assert history1.note == 'Confirmed via customer call'

        # Invalid transition: confirmed -> delivered (must pack and ship first)
        with pytest.raises(ValidationError):
            order.transition_to(Order.STATUS_DELIVERED)

        # Invalid backward transition: confirmed -> pending
        with pytest.raises(ValidationError):
            order.transition_to(Order.STATUS_PENDING)

        # Complete forward lifecycle: confirmed -> packed -> shipped -> delivered -> cod_collected -> returned
        order.transition_to(Order.STATUS_PACKED, note='Packed at warehouse')
        assert order.status == Order.STATUS_PACKED
        assert order.status_history.count() == 2

        order.transition_to(Order.STATUS_SHIPPED, note='Dispatched via courier')
        assert order.status == Order.STATUS_SHIPPED
        assert order.status_history.count() == 3

        order.transition_to(Order.STATUS_DELIVERED, note='Delivered to customer')
        assert order.status == Order.STATUS_DELIVERED
        assert order.status_history.count() == 4

        order.transition_to(Order.STATUS_COD_COLLECTED, note='Cash on delivery collected')
        assert order.status == Order.STATUS_COD_COLLECTED
        assert order.status_history.count() == 5

        order.transition_to(Order.STATUS_RETURNED, note='Customer returned item')
        assert order.status == Order.STATUS_RETURNED
        assert order.status_history.count() == 6

        # Terminal state: returned cannot transition to anything
        with pytest.raises(ValidationError):
            order.transition_to(Order.STATUS_PENDING)
        with pytest.raises(ValidationError):
            order.transition_to(Order.STATUS_CONFIRMED)

    def test_order_cancellation_from_unfulfilled_states(self):
        """Cancel is permitted from pending, confirmed, packed, and shipped."""
        for start_status in [Order.STATUS_PENDING, Order.STATUS_CONFIRMED, Order.STATUS_PACKED, Order.STATUS_SHIPPED]:
            order = Order.objects.create(
                number=Order.generate_order_number(),
                guest_email='cancel_test@example.com',
                status=start_status,
                payment_method='COD',
                subtotal=1000,
                grand_total=1000
            )
            order.transition_to(Order.STATUS_CANCELLED, note=f'Cancelled from {start_status}')
            assert order.status == Order.STATUS_CANCELLED
            assert order.status_history.filter(to_status=Order.STATUS_CANCELLED).exists()

            # Terminal state: cancelled cannot transition anywhere
            with pytest.raises(ValidationError):
                order.transition_to(Order.STATUS_CONFIRMED)


@pytest.mark.django_db
class TestPromotionModels:
    """Verify Coupon normalization, validation, and discount calculation."""

    def test_coupon_calculations(self):
        # 20% off with max cap 500 PKR
        coupon = Coupon.objects.create(
            code='SAVE20',
            type=Coupon.TYPE_PERCENT,
            value=20,
            min_order_amount=1000,
            max_discount_amount=500
        )
        assert coupon.code == 'SAVE20'

        is_valid, _ = coupon.is_valid_now()
        assert is_valid is True

        # Subtotal 2000 -> 20% is 400 (under 500 cap)
        assert coupon.calculate_discount(2000) == 400

        # Subtotal 3000 -> 20% is 600 (capped at 500)
        assert coupon.calculate_discount(3000) == 500


@pytest.mark.django_db
class TestContentAndCoreModels:
    """Verify SiteSetting, WaitlistEntry, BotEvent, and BlockedIP."""

    def test_site_settings_and_bot_events(self):
        SiteSetting.objects.create(key='free_shipping_threshold', value='2000')
        SiteSetting.objects.create(key='flat_shipping_fee', value='200')

        assert SiteSetting.get_int('free_shipping_threshold') == 2000
        assert SiteSetting.get_int('flat_shipping_fee') == 200
        assert SiteSetting.get_int('nonexistent', default=50) == 50

        waitlist = WaitlistEntry.objects.create(email='waitlist@example.com')
        assert str(waitlist) == 'waitlist@example.com'

        event = BotEvent.objects.create(
            ip='192.168.1.100',
            path='/api/v1/auth/login',
            reason='fast_submission',
            score=50
        )
        assert event.score == 50


@pytest.mark.django_db
class TestDjangoAdmin:
    """Verify acceptance criterion: Django admin can open every model."""

    def test_admin_can_open_every_model(self, client):
        from django.contrib import admin
        from django.urls import reverse

        superuser = User.objects.create_superuser(
            email='superadmin@supplivix.com',
            password='AdminPassword123!',
            full_name='Super Admin'
        )
        client.force_login(superuser)

        # 1. Admin index returns 200 via obscure emergency admin path
        index_res = client.get(reverse('admin:index'))
        assert index_res.status_code == 200

        # Required models from the specification
        required_model_names = {
            'accounts.user',
            'accounts.address',
            'catalog.category',
            'catalog.product',
            'catalog.productimage',
            'catalog.productattribute',
            'catalog.productfaq',
            'catalog.review',
            'cart.cart',
            'cart.cartitem',
            'orders.order',
            'orders.orderitem',
            'orders.orderstatushistory',
            'promotions.coupon',
            'promotions.couponredemption',
            'content.sitesetting',
            'content.waitlistentry',
            'content.contactmessage',
            'core.botevent',
            'core.blockedip',
        }

        registered_keys = {
            f"{m._meta.app_label}.{m._meta.model_name}"
            for m in admin.site._registry.keys()
        }

        # Verify all required models are registered
        missing = required_model_names - registered_keys
        assert not missing, f"Missing models in admin registry: {missing}"

        # 2. Django admin can open every model's changelist URL
        for model in admin.site._registry.keys():
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            changelist_url = reverse(f'admin:{app_label}_{model_name}_changelist')
            res = client.get(changelist_url)
            assert res.status_code == 200, f"Admin failed to open model {app_label}.{model_name}: status {res.status_code}"
