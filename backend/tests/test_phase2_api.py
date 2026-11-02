import pytest
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from content.models import SiteSetting
from orders.models import Order, OrderItem
from promotions.models import Coupon, CouponRedemption


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sample_category(db):
    return Category.objects.create(name='Multivitamins', slug='multivitamins')


@pytest.fixture
def sample_product(db, sample_category):
    return Product.objects.create(
        name='Vitamax Men Multivitamin',
        slug='vitamax-men-multivitamin',
        category=sample_category,
        price=1450,
        compare_at_price=1750,
        sku='VM-MEN-01',
        stock=50,
        product_type=Product.TYPE_MULTIVITAMIN,
        description='Comprehensive daily multivitamin for men.'
    )


@pytest.fixture
def auth_user(db):
    return User.objects.create_user(
        email='customer@example.com',
        password='Password123!',
        full_name='Test Customer',
        phone='+923001234567'
    )


# A. Authentication Tests (AUTH-01 to AUTH-10)
@pytest.mark.django_db
class TestAuthenticationAPI:
    def test_auth_01_register_valid_data(self, api_client):
        payload = {
            'email': 'newuser@example.com',
            'full_name': 'New User',
            'phone': '03009876543',
            'password': 'SecurePassword2026!'
        }
        res = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert res.status_code == 201
        assert res.data['user']['email'] == 'newuser@example.com'
        user = User.objects.get(email='newuser@example.com')
        assert user.check_password('SecurePassword2026!')
        assert user.phone == '+923009876543'

    def test_auth_02_register_existing_email_case_insensitive(self, api_client, auth_user):
        payload = {
            'email': 'CUSTOMER@EXAMPLE.COM',
            'full_name': 'Another Person',
            'password': 'Password123!'
        }
        res = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert res.status_code == 400
        assert 'email' in res.data['fields']

    def test_auth_03_register_validation_errors(self, api_client):
        # Invalid email, short password, no digits
        payload = {
            'email': 'invalid-email',
            'full_name': 'Test',
            'password': 'short'
        }
        res = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert res.status_code == 400
        assert 'email' in res.data['fields']
        assert 'password' in res.data['fields']

    def test_auth_04_login_success(self, api_client, auth_user):
        payload = {'email': 'customer@example.com', 'password': 'Password123!'}
        res = api_client.post('/api/v1/auth/login/', payload, format='json')
        assert res.status_code == 200
        assert res.data['user']['email'] == 'customer@example.com'

    def test_auth_05_login_wrong_password_identical_message(self, api_client, auth_user):
        res1 = api_client.post('/api/v1/auth/login/', {'email': 'customer@example.com', 'password': 'wrong'}, format='json')
        res2 = api_client.post('/api/v1/auth/login/', {'email': 'unknown@example.com', 'password': 'wrong'}, format='json')
        assert res1.status_code == 400
        assert res2.status_code == 400
        assert res1.data['message'] == res2.data['message']

    def test_auth_07_password_reset_request_generic_response(self, api_client):
        res = api_client.post('/api/v1/auth/password-reset/request/', {'email': 'nonexistent@example.com'}, format='json')
        assert res.status_code == 200
        assert 'instructions have been sent' in res.data['message']

    def test_auth_09_user_access_isolation(self, api_client, auth_user, sample_product):
        user_b = User.objects.create_user(email='user_b@example.com', password='Password123!', full_name='User B')
        order_b = Order.objects.create(
            number='SPLV-USER-B001',
            user=user_b,
            status=Order.STATUS_PENDING,
            payment_method='COD',
            subtotal=1450,
            grand_total=1450
        )
        api_client.force_authenticate(user=auth_user)
        res = api_client.get(f'/api/v1/orders/{order_b.number}/')
        assert res.status_code == 403

    def test_auth_direct_aliases_and_me_endpoints(self, api_client, auth_user):
        # Direct /api/v1/login/
        login_res = api_client.post('/api/v1/login/', {'email': 'customer@example.com', 'password': 'Password123!'}, format='json')
        assert login_res.status_code == 200

        api_client.force_authenticate(user=auth_user)

        # GET /api/v1/me/
        me_res = api_client.get('/api/v1/me/')
        assert me_res.status_code == 200
        assert me_res.data['email'] == auth_user.email

        # PATCH /api/v1/me/
        patch_res = api_client.patch('/api/v1/me/', {'full_name': 'Updated Name'}, format='json')
        assert patch_res.status_code == 200
        assert patch_res.data['full_name'] == 'Updated Name'

        # POST /api/v1/change-password/
        pw_res = api_client.post('/api/v1/change-password/', {
            'old_password': 'Password123!',
            'new_password': 'BrandNewPassword2026!'
        }, format='json')
        assert pw_res.status_code == 200
        auth_user.refresh_from_db()
        assert auth_user.check_password('BrandNewPassword2026!')

        # POST /api/v1/logout/
        logout_res = api_client.post('/api/v1/logout/')
        assert logout_res.status_code == 200


# B. Catalog, Search and Reviews (CAT-01 to CAT-07)
@pytest.mark.django_db
class TestCatalogAPI:
    def test_cat_01_product_list_active_only(self, api_client, sample_product, sample_category):
        # Create an inactive product
        Product.objects.create(
            name='Inactive Multi',
            slug='inactive-multi',
            category=sample_category,
            price=1000,
            sku='INACT-01',
            stock=10,
            is_active=False
        )
        res = api_client.get('/api/v1/products/')
        assert res.status_code == 200
        assert res.data['count'] == 1
        assert res.data['results'][0]['slug'] == sample_product.slug

    def test_cat_02_filters_and_search(self, api_client, sample_product, sample_category):
        # Search by term
        res = api_client.get('/api/v1/products/?q=Vitamax')
        assert res.status_code == 200
        assert len(res.data['results']) == 1

        # Search by non-matching query
        res_empty = api_client.get('/api/v1/products/?q=NonExistentProduct')
        assert res_empty.status_code == 200
        assert len(res_empty.data['results']) == 0

        # Filter by type
        res_type = api_client.get('/api/v1/products/?type=multivitamin')
        assert res_type.status_code == 200
        assert len(res_type.data['results']) == 1

    def test_cat_05_inactive_product_404(self, api_client, sample_category):
        prod = Product.objects.create(
            name='Hidden Serum',
            slug='hidden-serum',
            category=sample_category,
            price=1500,
            sku='HDN-01',
            is_active=False
        )
        res = api_client.get(f'/api/v1/products/{prod.slug}/')
        assert res.status_code == 404

    def test_cat_07_verified_buyer_review_requirement(self, api_client, auth_user, sample_product):
        api_client.force_authenticate(user=auth_user)
        # Attempt review before purchase -> 403
        payload = {'rating': 5, 'title': 'Great Product', 'body': 'Loved it'}
        res = api_client.post(f'/api/v1/products/{sample_product.slug}/reviews/create/', payload, format='json')
        assert res.status_code == 403
        assert res.data['code'] == 'verified_buyer_required'

        # Now simulate verified purchase
        order = Order.objects.create(
            number='SPLV-REVW-0001',
            user=auth_user,
            status=Order.STATUS_DELIVERED,
            payment_method='COD',
            subtotal=sample_product.price,
            grand_total=sample_product.price
        )
        OrderItem.objects.create(
            order=order,
            product=sample_product,
            product_name=sample_product.name,
            sku=sample_product.sku,
            unit_price=sample_product.price,
            quantity=1,
            line_total=sample_product.price
        )

        res_after = api_client.post(f'/api/v1/products/{sample_product.slug}/reviews/create/', payload, format='json')
        assert res_after.status_code == 201
        assert res_after.data['review']['rating'] == 5

        # Direct POST /api/v1/reviews/
        res_direct_rev = api_client.post('/api/v1/reviews/', {
            'product_slug': sample_product.slug,
            'rating': 4,
            'title': 'Good results',
            'body': 'Good daily multivitamin.'
        }, format='json')
        assert res_direct_rev.status_code == 201


# C & D. Cart & Free Shipping (CART-01 to CART-07, SHIP-01 to SHIP-05)
@pytest.mark.django_db
class TestCartAndShippingAPI:
    def test_cart_item_lifecycle(self, api_client, sample_product):
        # 1. Add item
        res = api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 2}, format='json')
        assert res.status_code == 200
        assert res.data['total_items'] == 2
        assert res.data['subtotal'] == 2900  # 1450 * 2

        item_id = res.data['items'][0]['id']

        # 2. Update quantity
        res_update = api_client.patch(f'/api/v1/cart/items/{item_id}/', {'quantity': 3}, format='json')
        assert res_update.status_code == 200
        assert res_update.data['total_items'] == 3
        assert res_update.data['subtotal'] == 4350

        # 3. Delete item
        res_del = api_client.delete(f'/api/v1/cart/items/{item_id}/')
        assert res_del.status_code == 200
        assert res_del.data['total_items'] == 0

    def test_cart_quantity_validation(self, api_client, sample_product):
        # Quantity 0 or > 10 rejected
        res0 = api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 0}, format='json')
        assert res0.status_code == 400

        res11 = api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 11}, format='json')
        assert res11.status_code == 400

    def test_ship_free_shipping_rules(self, api_client, sample_category):
        SiteSetting.objects.create(key='free_shipping_threshold', value='2000')
        SiteSetting.objects.create(key='flat_shipping_fee', value='200')

        cheap_prod = Product.objects.create(
            name='Vitamin C Powder',
            slug='vitamin-c-powder',
            category=sample_category,
            price=1999,
            sku='VIT-C-1999',
            stock=10
        )
        api_client.post('/api/v1/cart/items/', {'product_id': cheap_prod.id, 'quantity': 1}, format='json')

        # SHIP-01: Subtotal 1999 -> Flat fee 200, progress message: "Add Rs. 1 more for free shipping"
        res = api_client.get('/api/v1/cart/')
        assert res.data['subtotal'] == 1999
        assert res.data['shipping_total'] == 200
        assert res.data['amount_needed_for_free_shipping'] == 1
        assert "Add Rs. 1 more for free shipping" in res.data['free_shipping_message']
        assert res.data['grand_total'] == 2199

        # SHIP-02: Exactly 2000 (add a 1 Rupee product or 2x 1000)
        p1000 = Product.objects.create(name='P1000', slug='p1000', category=sample_category, price=1000, sku='P1000', stock=10)
        api_client.delete(f"/api/v1/cart/items/{res.data['items'][0]['id']}/")
        api_client.post('/api/v1/cart/items/', {'product_id': p1000.id, 'quantity': 2}, format='json')

        res_exact = api_client.get('/api/v1/cart/')
        assert res_exact.data['subtotal'] == 2000
        assert res_exact.data['shipping_total'] == 0
        assert res_exact.data['free_shipping_eligible'] is True
        assert res_exact.data['grand_total'] == 2000

    def test_cart_coupon_delete_and_merge(self, api_client, auth_user, sample_product):
        Coupon.objects.create(code='PROMO50', type=Coupon.TYPE_FIXED, value=50)

        # Guest adds product and applies coupon
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        api_client.post('/api/v1/cart/coupon/', {'code': 'PROMO50'}, format='json')

        # DELETE /api/v1/cart/coupon/
        del_coupon_res = api_client.delete('/api/v1/cart/coupon/')
        assert del_coupon_res.status_code == 200
        assert del_coupon_res.data['coupon_code'] == ''

        # Merge guest cart to user cart
        guest_session_key = 'test-session-merge-123'
        from cart.models import Cart, CartItem
        guest_cart = Cart.objects.create(session_key=guest_session_key)
        CartItem.objects.create(cart=guest_cart, product=sample_product, quantity=2)

        api_client.force_authenticate(user=auth_user)
        merge_res = api_client.post('/api/v1/cart/merge/', {'session_key': guest_session_key}, format='json')
        assert merge_res.status_code == 200
        assert merge_res.data['total_items'] >= 2


# E. Discount Tokens / Coupons (COUP-01 to COUP-14)
@pytest.mark.django_db
class TestCouponAPI:
    def test_coupon_percentage_with_cap(self, api_client, sample_product):
        # 10% coupon with cap of 100 PKR
        Coupon.objects.create(
            code='SAVE10',
            type=Coupon.TYPE_PERCENT,
            value=10,
            max_discount_amount=100
        )
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 2}, format='json')
        # Subtotal: 2900. 10% is 290, capped at 100.
        res = api_client.post('/api/v1/cart/coupon/', {'code': 'save10'}, format='json')
        assert res.status_code == 200
        assert res.data['cart']['discount_total'] == 100

    def test_coupon_minimum_order_unmet(self, api_client, sample_product):
        Coupon.objects.create(
            code='MIN5000',
            type=Coupon.TYPE_FIXED,
            value=500,
            min_order_amount=5000
        )
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        # Subtotal is 1450 < 5000
        res = api_client.post('/api/v1/cart/coupon/', {'code': 'MIN5000'}, format='json')
        assert res.status_code == 400
        assert res.data['code'] == 'min_order_unmet'

    def test_coupon_user_usage_limit(self, api_client, auth_user, sample_product):
        coupon = Coupon.objects.create(
            code='ONCEONLY',
            type=Coupon.TYPE_FIXED,
            value=200,
            usage_limit_per_user=1
        )
        api_client.force_authenticate(user=auth_user)
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')

        # Simulate prior redemption
        order = Order.objects.create(number='SPLV-PREV-01', user=auth_user, subtotal=1450, grand_total=1250)
        CouponRedemption.objects.create(coupon=coupon, user=auth_user, order=order)

        res = api_client.post('/api/v1/cart/coupon/', {'code': 'ONCEONLY'}, format='json')
        assert res.status_code == 400
        assert 'already used' in res.data['message']

    def test_coupon_expired_and_category_mismatch(self, api_client, sample_product, sample_category):
        import datetime

        from django.utils import timezone

        # Expired coupon
        past_date = timezone.now() - datetime.timedelta(days=2)
        Coupon.objects.create(
            code='EXPIRED10',
            type=Coupon.TYPE_PERCENT,
            value=10,
            ends_at=past_date
        )
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        res_exp = api_client.post('/api/v1/cart/coupon/', {'code': 'EXPIRED10'}, format='json')
        assert res_exp.status_code == 400
        assert 'expired' in res_exp.data['message'].lower()

        # Category mismatch coupon
        other_cat = Category.objects.create(name='Other Cat', slug='other-cat')
        Coupon.objects.create(
            code='CATONLY',
            type=Coupon.TYPE_FIXED,
            value=100,
            applies_to_category=other_cat
        )
        res_cat = api_client.post('/api/v1/cart/coupon/', {'code': 'CATONLY'}, format='json')
        assert res_cat.status_code == 400
        assert 'not valid for the items in your cart' in res_cat.data['message']


# F. Checkout and COD (COD-01 to COD-14)
@pytest.mark.django_db
class TestCheckoutAndCodAPI:
    def test_cod_01_guest_place_order(self, api_client, sample_product):
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')

        initial_stock = sample_product.stock
        order_payload = {
            'full_name': 'Guest Buyer',
            'email': 'guest@example.com',
            'phone': '03001234567',
            'line1': 'House 12, Street 5',
            'city': 'Faisalabad',
            'province': 'Punjab',
            'payment_method': 'COD'
        }
        res = api_client.post('/api/v1/orders/create/', order_payload, format='json')
        assert res.status_code == 201
        data = res.data['order']
        assert data['payment_method'] == 'COD'
        assert data['status'] == 'pending'
        assert data['subtotal'] == 1450

        # Verify stock decreased
        sample_product.refresh_from_db()
        assert sample_product.stock == initial_stock - 1

        # Cart should now be empty
        cart_res = api_client.get('/api/v1/cart/')
        assert cart_res.data['total_items'] == 0

    def test_cod_03_reject_non_cod_payment_method(self, api_client, sample_product):
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        payload = {
            'full_name': 'Credit User',
            'email': 'buyer@example.com',
            'phone': '03001234567',
            'line1': 'House 1',
            'city': 'Lahore',
            'province': 'Punjab',
            'payment_method': 'CREDIT_CARD'  # Non-COD
        }
        res = api_client.post('/api/v1/orders/create/', payload, format='json')
        assert res.status_code == 400
        assert 'payment_method' in res.data['fields']

    def test_cod_05_phone_normalization(self, api_client, sample_product):
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        payload = {
            'full_name': 'Phone Test',
            'email': 'phone@example.com',
            'phone': '0300-1234567',  # Hyphenated format
            'line1': 'House 1',
            'city': 'Islamabad',
            'province': 'Federal',
            'payment_method': 'COD'
        }
        res = api_client.post('/api/v1/orders/create/', payload, format='json')
        assert res.status_code == 201
        assert res.data['order']['shipping_address_snapshot']['phone'] == '+923001234567'

    def test_cod_11_cancel_order_in_pending_restores_stock(self, api_client, sample_product):
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 2}, format='json')
        init_stock = sample_product.stock
        order_payload = {
            'full_name': 'Cancel Tester',
            'email': 'cancel@example.com',
            'phone': '03001234567',
            'line1': 'House 1',
            'city': 'Multan',
            'province': 'Punjab',
            'payment_method': 'COD'
        }
        order_res = api_client.post('/api/v1/orders/create/', order_payload, format='json')
        order_num = order_res.data['order']['number']

        sample_product.refresh_from_db()
        assert sample_product.stock == init_stock - 2

        # Cancel order
        cancel_res = api_client.post(f'/api/v1/orders/{order_num}/cancel/')
        assert cancel_res.status_code == 200
        assert cancel_res.data['order']['status'] == 'cancelled'

        # Verify stock restored
        sample_product.refresh_from_db()
        assert sample_product.stock == init_stock

    def test_cod_13_track_order_lookup(self, api_client, sample_product):
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        order_res = api_client.post('/api/v1/orders/create/', {
            'full_name': 'Track Tester',
            'email': 'track@example.com',
            'phone': '03001234567',
            'line1': 'House 1',
            'city': 'Peshawar',
            'province': 'KPK',
            'payment_method': 'COD'
        }, format='json')
        num = order_res.data['order']['number']

        # Correct match
        track_res = api_client.post('/api/v1/orders/track/', {'order_number': num, 'phone': '03001234567'}, format='json')
        assert track_res.status_code == 200
        assert track_res.data['number'] == num

        # Wrong phone
        track_wrong = api_client.post('/api/v1/orders/track/', {'order_number': num, 'phone': '03009999999'}, format='json')
        assert track_wrong.status_code == 404

    def test_checkout_quote_calculation(self, api_client, sample_product):
        SiteSetting.objects.create(key='free_shipping_threshold', value='2000')
        SiteSetting.objects.create(key='flat_shipping_fee', value='200')
        Coupon.objects.create(code='OFF100', type=Coupon.TYPE_FIXED, value=100)

        # 1 item: 1450. Discount 100 -> 1350. Subtotal after discount < 2000 -> Shipping 200. Grand total = 1450 - 100 + 200 = 1550
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        quote_res = api_client.post('/api/v1/checkout/quote/', {'coupon_code': 'OFF100'}, format='json')
        assert quote_res.status_code == 200
        assert quote_res.data['subtotal'] == 1450
        assert quote_res.data['discount_total'] == 100
        assert quote_res.data['shipping_total'] == 200
        assert quote_res.data['grand_total'] == 1550

    def test_cod_direct_order_endpoint_and_insufficient_stock(self, api_client, auth_user, sample_product):
        api_client.force_authenticate(user=auth_user)

        # 1. Direct POST /api/v1/orders/
        api_client.post('/api/v1/cart/items/', {'product_id': sample_product.id, 'quantity': 1}, format='json')
        payload = {
            'full_name': 'Direct Order User',
            'email': auth_user.email,
            'phone': '03001234567',
            'line1': 'Plot 4, Street 2',
            'city': 'Lahore',
            'province': 'Punjab',
            'payment_method': 'COD'
        }
        res_direct = api_client.post('/api/v1/orders/', payload, format='json')
        assert res_direct.status_code == 201
        assert res_direct.data['order']['payment_method'] == 'COD'

        # GET /api/v1/orders/
        list_res = api_client.get('/api/v1/orders/')
        assert list_res.status_code == 200
        assert len(list_res.data) >= 1

        # 2. Insufficient stock transaction test
        sample_product.stock = 1
        sample_product.save(update_fields=['stock'])

        # Try to buy 5 items
        from cart.models import Cart, CartItem
        user_cart, _ = Cart.objects.get_or_create(user=auth_user)
        CartItem.objects.create(cart=user_cart, product=sample_product, quantity=5)

        orders_before = Order.objects.count()
        res_fail = api_client.post('/api/v1/orders/', payload, format='json')
        assert res_fail.status_code == 400
        assert 'Insufficient stock' in str(res_fail.data)
        # Verify nothing written (atomic transaction)
        assert Order.objects.count() == orders_before


# G. Content & Waitlist API
@pytest.mark.django_db
class TestContentAPI:
    def test_waitlist_and_public_settings(self, api_client):
        # 1. First waitlist join
        res1 = api_client.post('/api/v1/waitlist/', {'email': 'subscriber@example.com'}, format='json')
        assert res1.status_code == 201

        # 2. Duplicate waitlist join (friendly message)
        res2 = api_client.post('/api/v1/waitlist/', {'email': 'subscriber@example.com'}, format='json')
        assert res2.status_code == 200
        assert 'already on the list' in res2.data['message']

        # 3. Public settings
        res_settings = api_client.get('/api/v1/settings/public/')
        assert res_settings.status_code == 200
        assert 'free_shipping_threshold' in res_settings.data
        assert 'store_phone' in res_settings.data
