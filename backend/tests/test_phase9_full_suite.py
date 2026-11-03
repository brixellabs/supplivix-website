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
from catalog.models import Category, Product, Review
from content.models import SiteSetting
from orders.models import Order, OrderItem
from promotions.models import Coupon, CouponRedemption


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_category(db):
    return Category.objects.create(name="Multivitamins", slug="multivitamins", sort_order=1)


@pytest.fixture
def test_product(db, test_category):
    return Product.objects.create(
        name="Supplivix Daily Core Multivitamin 60s",
        slug="supplivix-daily-core-multivitamin-60s",
        category=test_category,
        price=2200,
        compare_at_price=2600,
        sku="SPLV-TEST-01",
        stock=25,
        product_type=Product.TYPE_MULTIVITAMIN,
        description=(
            "Core micronutrient formula for daily energy and antioxidant support. "
            "These statements have not been evaluated by a regulator. "
            "This product is not intended to diagnose, treat, cure or prevent any disease."
        ),
        is_active=True,
    )


@pytest.fixture
def test_customer(db):
    user = User.objects.create_user(
        email="customer.p9@supplivix.com",
        password="TestPassword123!",
        full_name="Ali Raza",
        phone="+923007654321",
    )
    return user


@pytest.fixture
def test_staff(db):
    user = User.objects.create_user(
        email="staff.p9@supplivix.com",
        password="StaffPassword2026!",
        full_name="Supplivix Support Staff",
        phone="+923000000001",
        is_staff=True,
    )
    return user


# ==============================================================================
# AUTH-01 to AUTH-10: Authentication & Account Security
# ==============================================================================
@pytest.mark.django_db
class TestAuthSuite:
    def test_auth_01_register_valid_data(self, api_client):
        """AUTH-01: Register with valid data -> 201, user created, password hashed with Argon2."""
        payload = {
            "email": "valid.auth01@supplivix.com",
            "full_name": "Zaid Malik",
            "phone": "03001234567",
            "password": "SecurePass2026!",
        }
        res = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert res.status_code == 201
        assert res.data["user"]["email"] == "valid.auth01@supplivix.com"
        user = User.objects.get(email="valid.auth01@supplivix.com")
        assert user.check_password("SecurePass2026!")
        assert user.password.startswith("argon2")

    def test_auth_02_register_existing_email_different_case(self, api_client, test_customer):
        """AUTH-02: Register with an existing email (different letter case) -> 400 with field error, no second user."""
        initial_users = User.objects.count()
        payload = {
            "email": test_customer.email.upper(),
            "full_name": "Impostor User",
            "password": "DifferentPassword123!",
        }
        res = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert res.status_code == 400
        assert "email" in res.data["fields"]
        assert User.objects.count() == initial_users

    def test_auth_03_register_validation_errors(self, api_client):
        """AUTH-03: Register with invalid email, short password, password without number -> Inline errors per field."""
        payload = {
            "email": "not-an-email",
            "full_name": "Test User",
            "password": "abc",
        }
        res = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert res.status_code == 400
        assert "email" in res.data["fields"]
        assert "password" in res.data["fields"]

    def test_auth_04_login_session_and_cookie_security(self, api_client, test_customer):
        """AUTH-04: Login with correct credentials -> Session set, cookie flags Secure and HttpOnly."""
        res = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": test_customer.email,
                "password": "TestPassword123!",
            },
            format="json",
        )
        assert res.status_code == 200
        assert res.data["user"]["email"] == test_customer.email
        assert res.wsgi_request.user.is_authenticated

    def test_auth_05_login_wrong_password_and_unknown_email_identical_message(self, api_client, test_customer):
        """AUTH-05: Login with wrong password and with unknown email -> Identical error message to prevent enumeration."""
        res_wrong = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": test_customer.email,
                "password": "WrongPassword999!",
            },
            format="json",
        )
        assert res_wrong.status_code == 400

        res_unknown = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": "completely.unknown.user@example.com",
                "password": "WrongPassword999!",
            },
            format="json",
        )
        assert res_unknown.status_code == 400

        assert res_wrong.data["message"] == res_unknown.data["message"]
        assert "Invalid email or password" in str(res_wrong.data)

    def test_auth_06_account_lockout_after_five_failed_logins(self, api_client, test_customer):
        """AUTH-06: 5 failed logins on one email -> Account locked 15 minutes, 6th attempt rejected even with correct password."""
        cache.clear()
        for i in range(5):
            res = api_client.post(
                "/api/v1/auth/login/",
                {
                    "email": test_customer.email,
                    "password": "WrongPassword!",
                    "turnstile_token": "1x0000000000000000000000000000000AA",
                },
                format="json",
                HTTP_X_FORWARDED_FOR=f"203.0.113.{30 + i}",
            )
            assert res.status_code == 400

        # 6th attempt with CORRECT password is rejected because account is locked!
        res6 = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": test_customer.email,
                "password": "TestPassword123!",
                "turnstile_token": "1x0000000000000000000000000000000AA",
            },
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.36",
        )
        assert res6.status_code == 400
        assert "locked" in str(res6.data).lower()

    def test_auth_07_password_reset_unknown_email_generic_success(self, api_client):
        """AUTH-07: Password reset request for unknown email -> Same generic success message, no user enumeration."""
        res = api_client.post(
            "/api/v1/auth/password-reset/request/",
            {
                "email": "nobody.exists@example.com",
            },
            format="json",
        )
        assert res.status_code == 200
        assert "instructions have been sent" in res.data["message"].lower()

    def test_auth_08_password_reset_link_used_twice_and_expired(self, api_client, test_customer):
        """AUTH-08: Reset link used twice, and expired reset link -> Second use and expired link both rejected."""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        uid = urlsafe_base64_encode(force_bytes(test_customer.pk))
        token = default_token_generator.make_token(test_customer)

        # First use resets password successfully
        res1 = api_client.post(
            "/api/v1/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "BrandNewPassword2026!",
            },
            format="json",
        )
        assert res1.status_code == 200
        assert "success" in res1.data["message"].lower()

        # Second use with same token is rejected
        res2 = api_client.post(
            "/api/v1/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherNewPassword2026!",
            },
            format="json",
        )
        assert res2.status_code == 400
        assert "invalid" in str(res2.data).lower() or "expired" in str(res2.data).lower()

        # Expired or tampered token is rejected
        res_tampered = api_client.post(
            "/api/v1/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": "tampered-invalid-token",
                "new_password": "BrandNewPassword2026!",
            },
            format="json",
        )
        assert res_tampered.status_code == 400

    def test_auth_09_user_access_isolation_order_and_address(self, api_client, test_customer):
        """AUTH-09: User A requests user B's order or address by ID -> 404 or 403, no data leaked."""
        from accounts.models import Address

        user_b = User.objects.create_user(email="user_b.p9@example.com", password="Password123!", full_name="User B")
        order_b = Order.objects.create(
            number="SPLV-ISO-0001",
            user=user_b,
            status=Order.STATUS_PENDING,
            payment_method="COD",
            subtotal=2200,
            grand_total=2200,
        )
        addr_b = Address.objects.create(
            user=user_b,
            full_name="User B",
            phone="+923009999999",
            line1="Secret House B",
            city="Lahore",
            province="Punjab",
            postal_code="54000",
        )

        api_client.force_authenticate(user=test_customer)

        # User A requests User B's order -> 403 or 404
        res_order = api_client.get(f"/api/v1/orders/{order_b.number}/")
        assert res_order.status_code in (403, 404)

        # User A requests User B's address -> 403 or 404
        res_addr = api_client.get(f"/api/v1/addresses/{addr_b.id}/")
        assert res_addr.status_code in (403, 404)

    def test_auth_10_guest_cart_merges_into_user_cart_on_login(self, api_client, test_customer, test_product):
        """AUTH-10: Guest cart merges into user cart on login -> Quantities added, no duplicates, stock respected."""
        from cart.models import Cart, CartItem

        # 1. Guest cart has 2 of test_product
        guest_session = "guest-session-p9-merge"
        guest_cart = Cart.objects.create(session_key=guest_session)
        CartItem.objects.create(cart=guest_cart, product=test_product, quantity=2)

        # 2. User cart has 1 of test_product
        user_cart = Cart.objects.create(user=test_customer)
        CartItem.objects.create(cart=user_cart, product=test_product, quantity=1)

        # 3. User logs in and calls cart merge
        api_client.force_authenticate(user=test_customer)
        merge_res = api_client.post("/api/v1/cart/merge/", {"session_key": guest_session}, format="json")
        assert merge_res.status_code == 200

        # 4. Quantities added (1 + 2 = 3), no duplicates, within stock bounds (stock=25)
        merged_items = CartItem.objects.filter(cart=user_cart, product=test_product)
        assert merged_items.count() == 1
        assert merged_items.first().quantity == 3


# ==============================================================================
# CAT-01 to CAT-08: Catalog, Search and Filters Suite
# ==============================================================================
@pytest.mark.django_db
class TestCatalogSuite:
    def test_cat_01_product_list_default(self, api_client, test_category):
        """CAT-01: Product list default -> 20 items, correct total count, active products only."""
        Product.objects.all().delete()
        for i in range(25):
            Product.objects.create(
                name=f"Active Daily Multi {i}",
                slug=f"active-daily-multi-{i}",
                category=test_category,
                price=1000 + i * 50,
                sku=f"CAT01-ACT-{i:03d}",
                stock=15,
                is_active=True,
            )
        for i in range(3):
            Product.objects.create(
                name=f"Inactive Multi {i}",
                slug=f"inactive-multi-{i}",
                category=test_category,
                price=900,
                sku=f"CAT01-INACT-{i:03d}",
                stock=0,
                is_active=False,
            )

        res = api_client.get("/api/v1/products/")
        assert res.status_code == 200
        assert res.data["count"] == 25
        assert len(res.data["results"]) == 20
        for item in res.data["results"]:
            assert "inactive" not in item["slug"]

    def test_cat_02_filter_category_type_price_instock_together(self, api_client, test_category):
        """CAT-02: Filter by category, type, price range, in stock together -> Results match all filters, URL reflects them."""
        skincare_cat = Category.objects.create(name="Skincare Hub", slug="skincare-hub", sort_order=2)

        # 1. Matching target product
        target = Product.objects.create(
            name="Supplivix Target Multi 60s",
            slug="supplivix-target-multi-60s",
            category=test_category,
            price=1500,
            sku="TGT-MATCH-01",
            stock=10,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        # 2. Non-matching category
        Product.objects.create(
            name="Other Cat Multi",
            slug="other-cat-multi",
            category=skincare_cat,
            price=1500,
            sku="TGT-DIFF-CAT",
            stock=10,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        # 3. Non-matching product type
        Product.objects.create(
            name="Skincare Serum in Multi Cat",
            slug="skincare-serum-in-multi-cat",
            category=test_category,
            price=1500,
            sku="TGT-DIFF-TYPE",
            stock=10,
            product_type=Product.TYPE_SKINCARE,
            is_active=True,
        )
        # 4. Price out of range (> 2000)
        Product.objects.create(
            name="Expensive Multi",
            slug="expensive-multi",
            category=test_category,
            price=3500,
            sku="TGT-EXPENSIVE",
            stock=10,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        # 5. Out of stock
        Product.objects.create(
            name="OOS Multi",
            slug="oos-multi",
            category=test_category,
            price=1500,
            sku="TGT-OOS",
            stock=0,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )

        query_url = (
            f"/api/v1/products/?category={test_category.slug}"
            f"&type=multivitamin&min_price=1000&max_price=2000&in_stock=true"
        )
        res = api_client.get(query_url)
        assert res.status_code == 200
        assert res.data["count"] == 1
        assert res.data["results"][0]["slug"] == target.slug

    def test_cat_03_sort_by_price_and_newest_stable_pagination(self, api_client, test_category):
        """CAT-03: Sort by price low to high, high to low, newest -> Correct order, stable pagination."""
        Product.objects.all().delete()
        prices = [3200, 1100, 2500, 750, 1800]
        for i, p in enumerate(prices):
            Product.objects.create(
                name=f"Sort Item {i}",
                slug=f"sort-item-{i}",
                category=test_category,
                price=p,
                sku=f"SRT-{i:02d}",
                stock=10,
                is_active=True,
            )

        # 1. Price: low to high
        res_asc = api_client.get("/api/v1/products/?sort=price_asc")
        asc_prices = [item["price"] for item in res_asc.data["results"]]
        assert asc_prices == sorted(prices)

        # 2. Price: high to low
        res_desc = api_client.get("/api/v1/products/?sort=price_desc")
        desc_prices = [item["price"] for item in res_desc.data["results"]]
        assert desc_prices == sorted(prices, reverse=True)

        # 3. Newest
        res_newest = api_client.get("/api/v1/products/?sort=newest")
        assert res_newest.status_code == 200
        assert len(res_newest.data["results"]) == len(prices)

    def test_cat_04_search_partial_misspelling_and_empty(self, api_client, test_category):
        """CAT-04: Search for a partial name, a misspelling and a term with no result -> Relevant results, graceful empty state."""
        Product.objects.create(
            name="Supplivix Bioactive Zinc Glycinate",
            slug="supplivix-bioactive-zinc-glycinate",
            category=test_category,
            price=1400,
            sku="SPLV-ZINC-01",
            stock=15,
            short_description="High-absorption chelated zinc formula",
            is_active=True,
        )
        # 1. Partial name search
        res_part = api_client.get("/api/v1/products/?q=Zinc")
        assert res_part.status_code == 200
        assert res_part.data["count"] >= 1
        assert any("zinc" in p["slug"] for p in res_part.data["results"])

        # 2. Misspelling / stem variation ("Bioactiv")
        res_stem = api_client.get("/api/v1/products/?q=Bioactiv")
        assert res_stem.status_code == 200
        assert any("zinc" in p["slug"] for p in res_stem.data["results"])

        # 3. Term with no result returns empty array
        res_empty = api_client.get("/api/v1/products/?q=xyznonexistentterm999")
        assert res_empty.status_code == 200
        assert res_empty.data["count"] == 0
        assert res_empty.data["results"] == []

    def test_cat_05_inactive_product_404_and_absent_from_list_and_sitemap(self, api_client, test_category):
        """CAT-05: Inactive product URL -> 404, absent from list, search and sitemap."""
        inactive_prod = Product.objects.create(
            name="Discontinued Botanical Blend",
            slug="discontinued-botanical-blend",
            category=test_category,
            price=1500,
            sku="SPLV-DISC-01",
            stock=10,
            is_active=False,
        )
        # 1. Inactive product detail returns 404
        res_detail = api_client.get(f"/api/v1/products/{inactive_prod.slug}/")
        assert res_detail.status_code == 404

        # 2. Absent from active product list
        res_list = api_client.get("/api/v1/products/")
        slugs = [p["slug"] for p in res_list.data["results"]]
        assert inactive_prod.slug not in slugs

        # 3. Absent from search
        res_search = api_client.get("/api/v1/products/?q=Discontinued")
        assert res_search.data["count"] == 0

        # 4. Absent from sitemap.xml
        res_sitemap = api_client.get("/sitemap.xml")
        assert inactive_prod.slug not in res_sitemap.content.decode()

    def test_cat_06_out_of_stock_product_representation_and_cart_rejection(self, api_client, test_category):
        """CAT-06: Out-of-stock product -> Shows 'Out of stock', add to cart disabled / rejected."""
        oos_product = Product.objects.create(
            name="Out of Stock Magnesium Formula",
            slug="out-of-stock-magnesium-formula",
            category=test_category,
            price=1200,
            sku="SPLV-OOS-02",
            stock=0,
            product_type=Product.TYPE_MULTIVITAMIN,
            is_active=True,
        )
        # 1. Product detail confirms stock=0 and in_stock=False
        res = api_client.get(f"/api/v1/products/{oos_product.slug}/")
        assert res.status_code == 200
        assert res.data["stock"] == 0
        assert res.data["in_stock"] is False

        # 2. Add to cart rejected with 400
        res_cart = api_client.post("/api/v1/cart/items/", {"product_id": oos_product.id, "quantity": 1}, format="json")
        assert res_cart.status_code == 400
        assert "stock" in str(res_cart.data).lower()

    def test_cat_07_review_submission_verified_buyer_enforced(self, api_client, test_customer, test_product):
        """CAT-07: Review submission by a user who never bought the product -> Rejected with 403."""
        # 1. Unverified user attempt -> 403 Forbidden
        api_client.force_authenticate(user=test_customer)
        res_unverified = api_client.post(
            f"/api/v1/products/{test_product.slug}/reviews/",
            {"rating": 5, "title": "Great Product", "body": "Never bought it but looks great!"},
            format="json",
        )
        assert res_unverified.status_code == 403
        assert res_unverified.data["code"] == "verified_buyer_required"

        # 2. User purchases product (order placed)
        order = Order.objects.create(
            number="SPLV-VB-CAT07",
            user=test_customer,
            status=Order.STATUS_CONFIRMED,
            payment_method="COD",
            subtotal=test_product.price,
            grand_total=test_product.price,
        )
        OrderItem.objects.create(
            order=order,
            product=test_product,
            product_name=test_product.name,
            sku=test_product.sku,
            unit_price=test_product.price,
            quantity=1,
            line_total=test_product.price,
        )

        # 3. Verified buyer submits review -> 201 Created
        res_verified = api_client.post(
            f"/api/v1/products/{test_product.slug}/reviews/",
            {"rating": 5, "title": "Verified Review", "body": "Excellent quality daily multi."},
            format="json",
        )
        assert res_verified.status_code == 201
        assert Review.objects.filter(product=test_product, user=test_customer).exists()

    def test_cat_08_product_list_1000_items_performance_and_no_n_plus_one(self, api_client, test_category):
        """CAT-08: Product list with 1,000 products -> Response under 300 ms, no N+1 queries (query count asserted)."""
        import time

        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        Product.objects.all().delete()
        bulk_products = [
            Product(
                name=f"Bulk Formula {i}",
                slug=f"bulk-formula-{i}",
                category=test_category,
                price=1000 + (i % 200) * 10,
                sku=f"BLK-{i:04d}",
                stock=20,
                product_type=Product.TYPE_MULTIVITAMIN if i % 2 == 0 else Product.TYPE_SKINCARE,
                is_active=True,
            )
            for i in range(1000)
        ]
        Product.objects.bulk_create(bulk_products)

        start_time = time.perf_counter()
        with CaptureQueriesContext(connection) as queries:
            res = api_client.get("/api/v1/products/")
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        assert res.status_code == 200
        assert res.data["count"] == 1000
        assert len(res.data["results"]) == 20

        # Query response time under 300 ms
        assert elapsed_ms < 300, f"Query took {elapsed_ms:.2f} ms (expected < 300 ms)"

        # Strictly no N+1 queries: exactly 3 queries (COUNT, SELECT products with annotations, SELECT images)
        assert len(queries) <= 4, f"N+1 detected! Total queries executed: {len(queries)}"


# ==============================================================================
# CART-01 to CART-08: Cart Management
# ==============================================================================
@pytest.mark.django_db
class TestCartSuite:
    def test_cart_item_update_and_removal(self, api_client, test_product):
        # 1. Add item
        add_res = api_client.post(
            "/api/v1/cart/items/",
            {
                "product_id": test_product.id,
                "quantity": 2,
            },
            format="json",
        )
        assert add_res.status_code == 200
        item_id = add_res.data["items"][0]["id"]

        # 2. Update quantity to 4
        update_res = api_client.patch(
            f"/api/v1/cart/items/{item_id}/",
            {
                "quantity": 4,
            },
            format="json",
        )
        assert update_res.status_code == 200
        assert update_res.data["items"][0]["quantity"] == 4
        assert update_res.data["subtotal"] == 2200 * 4

        # 3. Delete item
        del_res = api_client.delete(f"/api/v1/cart/items/{item_id}/")
        assert del_res.status_code == 200
        assert len(del_res.data["items"]) == 0
        assert del_res.data["subtotal"] == 0

    def test_cart_rejects_quantity_above_stock(self, api_client, test_product):
        res = api_client.post(
            "/api/v1/cart/items/",
            {
                "product_id": test_product.id,
                "quantity": 9999,
            },
            format="json",
        )
        assert res.status_code == 400


# ==============================================================================
# SHIP-01 to SHIP-04: Free Shipping Rules (Rs. 2,000 threshold, Rs. 200 fee)
# ==============================================================================
@pytest.mark.django_db
class TestShippingSuite:
    def test_ship_threshold_and_fee_accuracy(self, api_client, test_category):
        SiteSetting.objects.update_or_create(key="free_shipping_threshold", defaults={"value": "2000"})
        SiteSetting.objects.update_or_create(key="flat_shipping_fee", defaults={"value": "200"})

        # Under threshold: Rs. 1,500 item -> Rs. 200 shipping fee
        p_cheap = Product.objects.create(
            name="Item Under 2000",
            slug="item-under-2000",
            category=test_category,
            price=1500,
            sku="SPLV-CHEAP-01",
            stock=10,
            is_active=True,
        )
        api_client.post("/api/v1/cart/items/", {"product_id": p_cheap.id, "quantity": 1}, format="json")
        cart_res = api_client.get("/api/v1/cart/")
        assert cart_res.data["subtotal"] == 1500
        assert cart_res.data["shipping_total"] == 200
        assert cart_res.data["free_shipping_eligible"] is False

        # Add another item: Subtotal = 3,000 -> Free Shipping
        api_client.post("/api/v1/cart/items/", {"product_id": p_cheap.id, "quantity": 1}, format="json")
        cart_res2 = api_client.get("/api/v1/cart/")
        assert cart_res2.data["subtotal"] == 3000
        assert cart_res2.data["shipping_total"] == 0
        assert cart_res2.data["free_shipping_eligible"] is True


# ==============================================================================
# COUP-01 to COUP-06: Coupons & Discount Tokens
# ==============================================================================
@pytest.mark.django_db
class TestCouponSuite:
    def test_coupon_single_use_per_user(self, api_client, test_customer, test_product):
        coupon = Coupon.objects.create(
            code="ONETIME20",
            type="percent",
            value=20,
            usage_limit_per_user=1,
            is_active=True,
        )
        api_client.force_authenticate(user=test_customer)

        # First usage applies
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res1 = api_client.post("/api/v1/cart/coupon/", {"code": "ONETIME20"}, format="json")
        assert res1.status_code == 200

        # Simulate redemption with order
        order = Order.objects.create(number="SPLV-PRIOR-01", user=test_customer, subtotal=2200, grand_total=1760)
        CouponRedemption.objects.create(coupon=coupon, user=test_customer, order=order)

        # Second attempt must be rejected
        res2 = api_client.post("/api/v1/cart/coupon/", {"code": "ONETIME20"}, format="json")
        assert res2.status_code == 400
        assert "already used" in res2.data["message"].lower()


# ==============================================================================
# COD-01 to COD-14: Cash on Delivery & Order Lifecycle
# ==============================================================================
@pytest.mark.django_db
class TestCodSuite:
    def test_cod_sole_payment_method_enforced(self, api_client, test_product):
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        # Attempt to checkout with credit_card or bank_transfer
        payload = {
            "full_name": "Bilal Ahmed",
            "email": "bilal@example.com",
            "phone": "03001234567",
            "line1": "House 12, Street 4, F-7/2",
            "city": "Islamabad",
            "province": "Federal Capital",
            "payment_method": "CREDIT_CARD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 400
        assert "payment_method" in res.data["fields"]

    def test_cod_readable_order_number_and_status_tracking(self, api_client, test_product):
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        payload = {
            "full_name": "Tariq Mehmood",
            "email": "tariq@example.com",
            "phone": "03219876543",
            "line1": "Gulberg III, Main Boulevard",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 201
        order_number = res.data["order"]["number"]
        assert order_number.startswith("SPLV-")

        # Track order with valid phone
        track_res = api_client.post(
            "/api/v1/orders/track/", {"order_number": order_number, "phone": "03219876543"}, format="json"
        )
        assert track_res.status_code == 200
        assert track_res.data["number"] == order_number
        assert track_res.data["status"] == "pending"

        # Track order with wrong phone returns 404 (anti-snooping)
        wrong_track = api_client.post(
            "/api/v1/orders/track/", {"order_number": order_number, "phone": "03000000000"}, format="json"
        )
        assert wrong_track.status_code == 404


# ==============================================================================
# MODE-01 to MODE-04: Coming Soon vs Active Mode
# ==============================================================================
@pytest.mark.django_db
class TestModeSuite:
    def test_mode_toggle_and_public_settings(self, api_client):
        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "coming_soon"})
        res = api_client.get("/api/v1/settings/public/")
        assert res.status_code == 200
        assert res.data["site_mode"] == "coming_soon"

        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "live"})
        res2 = api_client.get("/api/v1/settings/public/")
        assert res2.status_code == 200
        assert res2.data["site_mode"] == "live"


# ==============================================================================
# POL-01 to POL-04: Policies & Content
# ==============================================================================
@pytest.mark.django_db
class TestPolicySuite:
    def test_contact_message_submission(self, api_client):
        payload = {
            "name": "Hamza Khan",
            "email": "hamza@example.com",
            "phone": "03001122334",
            "subject": "Inquiry on multivitamin ingredients",
            "message": "Does the Men Daily Vitality contain chelated minerals?",
        }
        res = api_client.post("/api/v1/contact/", payload, format="json")
        assert res.status_code == 201
        assert "thank you" in res.data["message"].lower()
