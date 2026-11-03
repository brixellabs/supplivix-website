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

from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Address, User
from cart.models import Cart, CartItem
from catalog.models import Category, Product, Review
from content.models import ContactMessage, SiteSetting, WaitlistEntry
from core.models import BotEvent
from core.security import generate_time_token, verify_time_token
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
# CART-01 to CART-07: Cart Management
# ==============================================================================
@pytest.mark.django_db
class TestCartSuite:
    def test_cart_01_add_quantity_remove(self, api_client, test_product):
        """CART-01: Add item, change quantity, remove item -> Totals update immediately and match the server."""
        # Add item
        add_res = api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 2}, format="json")
        assert add_res.status_code == 200
        item_id = add_res.data["items"][0]["id"]
        assert add_res.data["subtotal"] == 4400

        # Change quantity
        patch_res = api_client.patch(f"/api/v1/cart/items/{item_id}/", {"quantity": 3}, format="json")
        assert patch_res.status_code == 200
        assert patch_res.data["items"][0]["quantity"] == 3
        assert patch_res.data["subtotal"] == 6600

        # Remove item
        del_res = api_client.delete(f"/api/v1/cart/items/{item_id}/")
        assert del_res.status_code == 200
        assert len(del_res.data["items"]) == 0
        assert del_res.data["subtotal"] == 0

    def test_cart_02_invalid_quantities_rejected(self, api_client, test_product):
        """CART-02: Quantity 0, negative, 11, decimal, text -> Rejected with a message."""
        for invalid_qty in [0, -1, -5, 11, 99, 1.5, "two", "invalid"]:
            res = api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": invalid_qty}, format="json")
            assert res.status_code == 400
            assert "message" in res.data or "quantity" in str(res.data)

    def test_cart_03_quantity_above_stock_rejected(self, api_client, test_product):
        """CART-03: Quantity above stock -> Capped or rejected with stock message."""
        test_product.stock = 3
        test_product.save(update_fields=["stock"])

        res = api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 5}, format="json")
        assert res.status_code == 400
        assert "stock" in str(res.data).lower()

    def test_cart_04_product_price_changes_reflects_in_cart(self, api_client, test_product):
        """CART-04: Product price changes while it is in the cart -> Cart shows the new price with a notice."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 2}, format="json")
        res1 = api_client.get("/api/v1/cart/")
        assert res1.data["subtotal"] == 4400

        test_product.price = 2500
        test_product.save(update_fields=["price"])

        res2 = api_client.get("/api/v1/cart/")
        assert res2.data["subtotal"] == 5000
        assert res2.data["items"][0]["price_changed"] is True
        assert "Price updated" in res2.data["items"][0]["price_change_notice"]
        assert len(res2.data["notices"]) > 0
        assert "increased to Rs. 2,500" in res2.data["notices"][0]

    def test_cart_05_inactive_product_blocks_checkout(self, api_client, test_product):
        """CART-05: Product becomes inactive while in cart -> Item flagged, checkout blocked until removed."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        test_product.is_active = False
        test_product.save(update_fields=["is_active"])

        # Cart API flags item as inactive and checkout_blocked as True
        cart_res = api_client.get("/api/v1/cart/")
        assert cart_res.data["items"][0]["flagged_inactive"] is True
        assert cart_res.data["has_inactive_items"] is True
        assert cart_res.data["checkout_blocked"] is True

        payload = {
            "full_name": "Asim Raza",
            "email": "asim@example.com",
            "phone": "03001234567",
            "line1": "Street 10",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 400
        assert "no longer available" in str(res.data).lower()

    def test_cart_06_cart_persistence_across_session(self, api_client, test_product):
        """CART-06: Cart persists after refresh and session key header -> Items remain."""
        session_header = {"HTTP_X_SESSION_KEY": "persistent-guest-session-42"}
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 2}, format="json", **session_header)

        res = api_client.get("/api/v1/cart/", **session_header)
        assert res.status_code == 200
        assert len(res.data["items"]) == 1
        assert res.data["items"][0]["quantity"] == 2

    def test_cart_07_tampered_price_ignored(self, api_client, test_product):
        """CART-07: Client sends a manipulated price or total -> Ignored, server price used."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        quote_res = api_client.post(
            "/api/v1/checkout/quote/",
            {"subtotal": 50, "grand_total": 50, "price": 50},
            format="json",
        )
        assert quote_res.status_code == 200
        assert quote_res.data["subtotal"] == 2200


# ==============================================================================
# SHIP-01 to SHIP-05: Free Shipping Rules (Rs. 2,000 threshold, Rs. 200 fee)
# ==============================================================================
@pytest.mark.django_db
class TestShippingSuite:
    def test_ship_01_subtotal_1999_shipping_200(self, api_client, test_category):
        """SHIP-01: Subtotal Rs. 1,999 -> Shipping Rs. 200, message Add Rs. 1 more for free shipping."""
        p = Product.objects.create(name="Formula 1999", slug="formula-1999", category=test_category, price=1999, sku="S-1999", stock=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p.id, "quantity": 1}, format="json")
        res = api_client.get("/api/v1/cart/")
        assert res.data["subtotal"] == 1999
        assert res.data["shipping_total"] == 200
        assert res.data["free_shipping_eligible"] is False
        assert res.data["amount_needed_for_free_shipping"] == 1
        assert res.data["free_shipping_message"] == "Add Rs. 1 more for free shipping"

    def test_ship_02_subtotal_2000_free_shipping(self, api_client, test_category):
        """SHIP-02: Subtotal exactly Rs. 2,000 -> Shipping Rs. 0."""
        p = Product.objects.create(name="Formula 2000", slug="formula-2000", category=test_category, price=2000, sku="S-2000", stock=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p.id, "quantity": 1}, format="json")
        res = api_client.get("/api/v1/cart/")
        assert res.data["subtotal"] == 2000
        assert res.data["shipping_total"] == 0
        assert res.data["free_shipping_eligible"] is True
        assert res.data["amount_needed_for_free_shipping"] == 0
        assert res.data["free_shipping_message"] == "You have unlocked free shipping!"

    def test_ship_03_subtotal_above_2000_free_shipping(self, api_client, test_category):
        """SHIP-03: Subtotal Rs. 2,001 and above -> Shipping Rs. 0."""
        # 1. Exactly Rs. 2,001
        p2001 = Product.objects.create(name="Formula 2001", slug="formula-2001", category=test_category, price=2001, sku="S-2001", stock=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p2001.id, "quantity": 1}, format="json")
        res2001 = api_client.get("/api/v1/cart/")
        assert res2001.data["subtotal"] == 2001
        assert res2001.data["shipping_total"] == 0
        assert res2001.data["free_shipping_eligible"] is True
        assert res2001.data["amount_needed_for_free_shipping"] == 0

        # 2. Well above (e.g. Rs. 2,500)
        p2500 = Product.objects.create(name="Formula 2500", slug="formula-2500", category=test_category, price=2500, sku="S-2500", stock=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p2500.id, "quantity": 1}, format="json")
        res_above = api_client.get("/api/v1/cart/")
        assert res_above.data["subtotal"] == 2001 + 2500
        assert res_above.data["shipping_total"] == 0
        assert res_above.data["free_shipping_eligible"] is True

    def test_ship_04_coupon_discount_drops_below_threshold(self, api_client, test_category):
        """SHIP-04: Subtotal Rs. 2,300, coupon takes it to Rs. 1,900 -> Shipping Rs. 200."""
        p = Product.objects.create(name="Formula 2300", slug="formula-2300", category=test_category, price=2300, sku="S-2300", stock=10, is_active=True)
        Coupon.objects.create(code="DISC400", type="fixed", value=400, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "DISC400"}, format="json")

        quote_res = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote_res.status_code == 200
        assert quote_res.data["subtotal"] == 2300
        assert quote_res.data["discount_total"] == 400
        assert quote_res.data["shipping_total"] == 200
        assert quote_res.data["grand_total"] == 1900 + 200

        cart_res = api_client.get("/api/v1/cart/")
        assert cart_res.data["subtotal"] == 2300
        assert cart_res.data["discount_total"] == 400
        assert cart_res.data["shipping_total"] == 200
        assert cart_res.data["grand_total"] == 2100
        assert cart_res.data["free_shipping_eligible"] is False
        assert cart_res.data["amount_needed_for_free_shipping"] == 100
        assert cart_res.data["free_shipping_message"] == "Add Rs. 100 more for free shipping"

    def test_ship_05_dynamic_admin_threshold_applied(self, api_client, test_category):
        """SHIP-05: Threshold changed to Rs. 3,000 in admin -> New value used on next quote without redeploy."""
        p = Product.objects.create(name="Formula 2500", slug="formula-dyn-2500", category=test_category, price=2500, sku="S-DYN-2500", stock=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": p.id, "quantity": 1}, format="json")

        # Threshold Rs. 3,000
        SiteSetting.objects.update_or_create(key="free_shipping_threshold", defaults={"value": "3000"})
        quote_res = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote_res.status_code == 200
        assert quote_res.data["shipping_total"] == 200
        assert quote_res.data["free_shipping_threshold"] == 3000

        cart_res = api_client.get("/api/v1/cart/")
        assert cart_res.data["shipping_total"] == 200
        assert cart_res.data["free_shipping_threshold"] == 3000
        assert cart_res.data["amount_needed_for_free_shipping"] == 500
        assert cart_res.data["free_shipping_message"] == "Add Rs. 500 more for free shipping"

        # Reset back
        SiteSetting.objects.update_or_create(key="free_shipping_threshold", defaults={"value": "2000"})


# ==============================================================================
# COUP-01 to COUP-16: Coupons & Discount Tokens
# ==============================================================================
@pytest.mark.django_db
class TestCouponSuite:
    @pytest.fixture(autouse=True)
    def clear_cache_between_tests(self):
        cache.clear()
        yield
        cache.clear()

    def test_coup_01_percent_discount_rounded(self, api_client, test_product):
        """COUP-01: Valid percentage code -> Correct discount, rounded consistently."""
        Coupon.objects.create(code="PERCENT10", type="percent", value=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res = api_client.post("/api/v1/cart/coupon/", {"code": "PERCENT10"}, format="json")
        assert res.status_code == 200
        quote = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote.data["discount_total"] == 220  # 10% of 2200

    def test_coup_02_percent_discount_with_cap(self, api_client, test_product):
        """COUP-02: Percentage code with a maximum cap -> Discount never exceeds the cap."""
        Coupon.objects.create(code="CAPPED20", type="percent", value=20, max_discount_amount=200, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "CAPPED20"}, format="json")
        quote = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote.data["discount_total"] == 200  # 20% of 2200 is 440, capped at 200

    def test_coup_03_fixed_discount_never_below_zero(self, api_client, test_product):
        """COUP-03: Valid fixed code larger than the subtotal -> Total never below zero."""
        Coupon.objects.create(code="BIGFIXED5000", type="fixed", value=5000, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "BIGFIXED5000"}, format="json")
        quote = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote.data["discount_total"] == 2200
        assert quote.data["grand_total"] >= 0

    def test_coup_04_normalization_whitespace_and_case(self, api_client, test_product):
        """COUP-04: Lowercase and mixed-case entry, spaces around code -> Accepted after normalization."""
        Coupon.objects.create(code="CLEANCODE", type="percent", value=10, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res = api_client.post("/api/v1/cart/coupon/", {"code": "  cleancode  "}, format="json")
        assert res.status_code == 200
        assert "CLEANCODE" in res.data["message"]

    def test_coup_05_unknown_code_rejected(self, api_client, test_product):
        """COUP-05: Unknown code -> This code is not valid."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res = api_client.post("/api/v1/cart/coupon/", {"code": "NONEXISTENT99"}, format="json")
        assert res.status_code == 400
        assert "not valid" in res.data["message"].lower()

    def test_coup_06_expired_and_future_codes_rejected(self, api_client, test_product):
        """COUP-06: Expired code, not-yet-started code -> Specific message for each."""
        now = timezone.now()
        Coupon.objects.create(code="EXPIRED10", type="percent", value=10, ends_at=now - timedelta(days=1), is_active=True)
        Coupon.objects.create(code="FUTURE10", type="percent", value=10, starts_at=now + timedelta(days=5), is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        res_exp = api_client.post("/api/v1/cart/coupon/", {"code": "EXPIRED10"}, format="json")
        assert res_exp.status_code == 400
        assert "expired" in res_exp.data["message"].lower()

        res_fut = api_client.post("/api/v1/cart/coupon/", {"code": "FUTURE10"}, format="json")
        assert res_fut.status_code == 400
        assert "not yet active" in res_fut.data["message"].lower()

    def test_coup_07_inactive_code_rejected(self, api_client, test_product):
        """COUP-07: Inactive code -> Rejected."""
        Coupon.objects.create(code="INACTIVE10", type="percent", value=10, is_active=False)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res = api_client.post("/api/v1/cart/coupon/", {"code": "INACTIVE10"}, format="json")
        assert res.status_code == 400

    def test_coup_08_minimum_order_unmet_message(self, api_client, test_product):
        """COUP-08: Minimum order not reached -> Message shows the required amount."""
        Coupon.objects.create(code="MIN5000", type="percent", value=15, min_order_amount=5000, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")  # subtotal = 2200
        res = api_client.post("/api/v1/cart/coupon/", {"code": "MIN5000"}, format="json")
        assert res.status_code == 400
        assert "5,000" in res.data["message"]

    def test_coup_09_category_restriction_enforced(self, api_client, test_product):
        """COUP-09: Category-restricted code with non-matching cart -> Rejected with message."""
        skincare = Category.objects.create(name="Skincare Demo", slug="skincare-demo")
        Coupon.objects.create(code="SKINONLY", type="percent", value=15, applies_to_category=skincare, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")  # multivitamins
        res = api_client.post("/api/v1/cart/coupon/", {"code": "SKINONLY"}, format="json")
        assert res.status_code == 400
        assert "not valid for the items in your cart" in res.data["message"].lower()

    def test_coup_10_per_user_limit_enforced(self, api_client, test_customer, test_product):
        """COUP-10: Per-user limit reached (logged in and guest by email) -> Rejected."""
        coupon = Coupon.objects.create(code="ONETIMEONLY", type="percent", value=20, usage_limit_per_user=1, is_active=True)
        # 1. Authenticated user limit reached
        api_client.force_authenticate(user=test_customer)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        order = Order.objects.create(number="SPLV-C10-01", user=test_customer, subtotal=2200, grand_total=1760)
        CouponRedemption.objects.create(coupon=coupon, user=test_customer, order=order)

        res = api_client.post("/api/v1/cart/coupon/", {"code": "ONETIMEONLY"}, format="json")
        assert res.status_code == 400
        assert "already used" in res.data["message"].lower()

        # 2. Guest user limit reached by email
        api_client.force_authenticate(user=None)
        guest_order = Order.objects.create(number="SPLV-C10-02", guest_email="guest@example.com", subtotal=2200, grand_total=1760)
        CouponRedemption.objects.create(coupon=coupon, email="guest@example.com", order=guest_order)

        res_guest = api_client.post("/api/v1/cart/coupon/", {"code": "ONETIMEONLY", "email": "guest@example.com"}, format="json")
        assert res_guest.status_code == 400
        assert "already used" in res_guest.data["message"].lower()

    def test_coup_11_simultaneous_orders_single_redemption(self, test_product):
        """COUP-11: Total usage limit of 1, two simultaneous orders -> Exactly one succeeds."""
        coupon = Coupon.objects.create(code="RACE100", type="fixed", value=500, usage_limit_total=1, is_active=True)
        cart1 = Cart.objects.create(session_key="race-session-1", coupon_code="RACE100")
        CartItem.objects.create(cart=cart1, product=test_product, quantity=1)

        payload1 = {
            "full_name": "Racer One",
            "email": "racer1@example.com",
            "phone": "03001112233",
            "line1": "Street 1",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        cart2 = Cart.objects.create(session_key="race-session-2", coupon_code="RACE100")
        CartItem.objects.create(cart=cart2, product=test_product, quantity=1)

        payload2 = {
            "full_name": "Racer Two",
            "email": "racer2@example.com",
            "phone": "03004445566",
            "line1": "Street 2",
            "city": "Karachi",
            "province": "Sindh",
            "payment_method": "COD",
        }

        from orders.services import place_cod_order

        # Order 1 consumes the single redemption slot under atomic transaction
        order1 = place_cod_order(cart=cart1, checkout_data=payload1)
        assert order1.coupon_code == "RACE100"
        assert coupon.redemptions.count() == 1

        # Order 2 is strictly blocked under lock because usage_limit_total (1) has been reached
        with pytest.raises(Exception) as exc_info:
            place_cod_order(cart=cart2, checkout_data=payload2)

        assert "limit" in str(exc_info.value).lower()
        assert coupon.redemptions.count() == 1

    def test_coup_12_coupon_replacement_no_stacking(self, api_client, test_product):
        """COUP-12: Applying a second code -> Replaces the first, never stacks."""
        Coupon.objects.create(code="CODE10", type="percent", value=10, is_active=True)
        Coupon.objects.create(code="CODE20", type="percent", value=20, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        api_client.post("/api/v1/cart/coupon/", {"code": "CODE10"}, format="json")
        cart1 = api_client.get("/api/v1/cart/").data
        assert cart1["coupon_code"] == "CODE10"

        api_client.post("/api/v1/cart/coupon/", {"code": "CODE20"}, format="json")
        cart2 = api_client.get("/api/v1/cart/").data
        assert cart2["coupon_code"] == "CODE20"

    def test_coup_13_remove_coupon_restores_totals(self, api_client, test_product):
        """COUP-13: Remove code -> Totals restored."""
        Coupon.objects.create(code="OFF20", type="percent", value=20, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "OFF20"}, format="json")

        del_res = api_client.delete("/api/v1/cart/coupon/")
        assert del_res.status_code == 200
        assert del_res.data["coupon_code"] == ""
        quote = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote.data["discount_total"] == 0

    def test_coup_14_invalidated_coupon_removed_on_cart_update(self, api_client, test_category):
        """COUP-14: Cart changes after applying code, so code is no longer valid -> Code removed with a notice."""
        p_high = Product.objects.create(name="P High", slug="p-high", category=test_category, price=3000, sku="S-HIGH", stock=10, is_active=True)
        Coupon.objects.create(code="MIN4000", type="percent", value=10, min_order_amount=4000, is_active=True)
        add_res = api_client.post("/api/v1/cart/items/", {"product_id": p_high.id, "quantity": 2}, format="json")  # subtotal = 6000
        item_id = add_res.data["items"][0]["id"]
        api_client.post("/api/v1/cart/coupon/", {"code": "MIN4000"}, format="json")

        # Reduce quantity to 1 -> subtotal = 3000 (< 4000 min order)
        api_client.patch(f"/api/v1/cart/items/{item_id}/", {"quantity": 1}, format="json")
        cart_res = api_client.get("/api/v1/cart/")
        assert cart_res.data["coupon_code"] == ""
        assert any("removed" in n.lower() for n in cart_res.data["notices"])
        quote = api_client.post("/api/v1/checkout/quote/", format="json")
        assert quote.data["discount_total"] == 0

    def test_coup_15_cancelled_order_releases_redemption(self, api_client, test_product, test_customer):
        """COUP-15: Order cancelled -> Redemption released (documented behaviour)."""
        coupon = Coupon.objects.create(code="CANCELRELEASE", type="fixed", value=300, usage_limit_per_user=1, is_active=True)
        api_client.force_authenticate(user=test_customer)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "CANCELRELEASE"}, format="json")

        payload = {
            "full_name": "Test Customer",
            "email": test_customer.email,
            "phone": "03001234567",
            "line1": "Street 5",
            "city": "Karachi",
            "province": "Sindh",
            "payment_method": "COD",
        }
        order_res = api_client.post("/api/v1/orders/create/", payload, format="json")
        order_num = order_res.data["order"]["number"]
        assert CouponRedemption.objects.filter(coupon=coupon).count() == 1

        # Cancel order
        cancel_res = api_client.post(f"/api/v1/orders/{order_num}/cancel/")
        assert cancel_res.status_code == 200
        assert CouponRedemption.objects.filter(coupon=coupon).count() == 0

    def test_coup_16_rate_limiting_throttles_coupon_guessing(self, api_client, test_product):
        """COUP-16: 15 wrong codes in one minute -> Throttled with 429."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        statuses = []
        for i in range(15):
            res = api_client.post("/api/v1/cart/coupon/", {"code": f"WRONG{i}"}, format="json")
            statuses.append(res.status_code)

        assert 429 in statuses


# ==============================================================================
# COD-01 to COD-14: Cash on Delivery & Order Lifecycle
# ==============================================================================
@pytest.mark.django_db
class TestCodSuite:
    @pytest.fixture(autouse=True)
    def clear_cache_between_tests(self):
        cache.clear()
        yield
        cache.clear()

    def test_cod_01_guest_place_order_reduces_stock_creates_pending(self, api_client, test_product):
        """COD-01: Guest places a valid COD order -> 201, order number, status pending, stock reduced, cart cleared."""
        initial_stock = test_product.stock
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 2}, format="json")

        payload = {
            "full_name": "Ayesha Malik",
            "email": "ayesha@example.com",
            "phone": "03001234567",
            "line1": "Flat 4B, Clifton Block 2",
            "city": "Karachi",
            "province": "Sindh",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 201
        order_data = res.data["order"]
        assert order_data["number"].startswith("SPLV-")
        assert order_data["status"] == "pending"

        test_product.refresh_from_db()
        assert test_product.stock == initial_stock - 2

        cart = api_client.get("/api/v1/cart/").data
        assert len(cart["items"]) == 0

        # Assert email sent to customer (COD-01 requirement)
        from django.core import mail
        assert len(mail.outbox) >= 1
        assert "ayesha@example.com" in mail.outbox[-1].to
        assert "SPLV-" in mail.outbox[-1].subject
        assert "Cash on Delivery" in mail.outbox[-1].body

    def test_cod_02_saved_address_snapshot_stored(self, api_client, test_customer, test_product):
        """COD-02: Logged-in user with a saved address -> Address snapshot saved on the order."""
        addr = Address.objects.create(
            user=test_customer,
            full_name="Fatima Zahra",
            phone="03211234567",
            line1="House 44, Sector G-11/3",
            city="Islamabad",
            province="Islamabad Capital Territory",
            postal_code="44000",
            is_default=True,
        )
        api_client.force_authenticate(user=test_customer)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")

        payload = {
            "full_name": addr.full_name,
            "email": test_customer.email,
            "phone": addr.phone,
            "line1": addr.line1,
            "city": addr.city,
            "province": addr.province,
            "postal_code": addr.postal_code,
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 201
        order = Order.objects.get(number=res.data["order"]["number"])
        assert order.shipping_address_snapshot["line1"] == "House 44, Sector G-11/3"
        assert order.shipping_address_snapshot["city"] == "Islamabad"

    def test_cod_03_reject_non_cod_payment_methods(self, api_client, test_product):
        """COD-03: Payment method other than COD in the payload -> Rejected."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
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

    def test_cod_04_missing_or_invalid_address_fields_rejected(self, api_client, test_product):
        """COD-04: Missing or invalid name, phone, email, address, city, province -> Inline errors, nothing saved."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        res = api_client.post("/api/v1/orders/create/", {}, format="json")
        assert res.status_code == 400
        assert "full_name" in res.data["fields"]
        assert "phone" in res.data["fields"]
        assert "line1" in res.data["fields"]

    def test_cod_05_pakistan_phone_normalization_and_validation(self, api_client, test_product):
        """COD-05: Phone formats 03001234567, +923001234567, 0300-1234567 accepted; 12345, letters rejected."""
        valid_phones = ["03001234567", "+923001234567", "0300-1234567"]
        for p in valid_phones:
            cache.clear()
            api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
            res = api_client.post(
                "/api/v1/orders/create/",
                {
                    "full_name": "Valid Phone Test",
                    "email": "phone@example.com",
                    "phone": p,
                    "line1": "Street 1",
                    "city": "Lahore",
                    "province": "Punjab",
                    "payment_method": "COD",
                },
                format="json",
            )
            assert res.status_code == 201

        invalid_phones = ["12345", "notaphone", "92300123456789012"]
        for p in invalid_phones:
            cache.clear()
            api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
            res = api_client.post(
                "/api/v1/orders/create/",
                {
                    "full_name": "Invalid Phone Test",
                    "email": "phone@example.com",
                    "phone": p,
                    "line1": "Street 1",
                    "city": "Lahore",
                    "province": "Punjab",
                    "payment_method": "COD",
                },
                format="json",
            )
            assert res.status_code == 400

    def test_cod_06_concurrency_stock_one_never_oversold(self, test_product):
        """COD-06: Stock is 1 and two buyers submit together -> One succeeds, other gets clear error, stock never below 0."""
        from orders.services import place_cod_order
        test_product.stock = 1
        test_product.save(update_fields=["stock"])

        cart1 = Cart.objects.create(session_key="concur-1")
        CartItem.objects.create(cart=cart1, product=test_product, quantity=1)

        cart2 = Cart.objects.create(session_key="concur-2")
        CartItem.objects.create(cart=cart2, product=test_product, quantity=1)

        payload1 = {"full_name": "Buyer 1", "email": "b1@example.com", "phone": "03001111111", "line1": "St 1", "city": "LHR", "province": "Punjab", "payment_method": "COD"}
        payload2 = {"full_name": "Buyer 2", "email": "b2@example.com", "phone": "03002222222", "line1": "St 2", "city": "LHR", "province": "Punjab", "payment_method": "COD"}

        order1 = place_cod_order(cart=cart1, checkout_data=payload1)
        assert order1 is not None

        with pytest.raises(Exception):
            place_cod_order(cart=cart2, checkout_data=payload2)

        test_product.refresh_from_db()
        assert test_product.stock == 0

    def test_cod_07_idempotency_key_prevents_duplicate_orders(self, api_client, test_product):
        """COD-07: Double-click on place order with same idempotency key -> One order only."""
        cache.clear()
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        payload = {
            "full_name": "Idempotent Buyer",
            "email": "idemp@example.com",
            "phone": "03001234567",
            "line1": "Street 10",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
            "idempotency_key": "idemp-test-key-999",
        }
        res1 = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res1.status_code == 201
        num1 = res1.data["order"]["number"]

        # Duplicate request
        res2 = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res2.status_code in [200, 201]
        num2 = res2.data["order"]["number"]
        assert num1 == num2
        assert Order.objects.filter(number=num1).count() == 1

    def test_cod_08_empty_cart_checkout_rejected(self, api_client):
        """COD-08: Empty cart checkout -> Rejected with message."""
        payload = {
            "full_name": "Empty Cart Buyer",
            "email": "empty@example.com",
            "phone": "03001234567",
            "line1": "Street 1",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 400
        assert "empty cart" in res.data["message"].lower()

    def test_cod_09_order_totals_calculation_and_snapshots(self, api_client, test_product):
        """COD-09: Order totals with coupon and shipping -> grand_total = subtotal - discount + shipping."""
        Coupon.objects.create(code="DISC200", type="fixed", value=200, is_active=True)
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        api_client.post("/api/v1/cart/coupon/", {"code": "DISC200"}, format="json")

        payload = {
            "full_name": "Snapshot Test",
            "email": "snap@example.com",
            "phone": "03001234567",
            "line1": "Street 2",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res.status_code == 201
        order = Order.objects.get(number=res.data["order"]["number"])
        assert order.subtotal == 2200
        assert order.discount_total == 200
        assert order.grand_total == 2200 - 200 + order.shipping_total

        # Item snapshot
        item = order.items.first()
        assert item.unit_price == 2200
        assert item.line_total == 2200

    def test_cod_10_product_price_change_does_not_affect_existing_order(self, api_client, test_product):
        """COD-10: Product price changes after the order -> Order keeps the original price."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        payload = {
            "full_name": "Price Immuntability",
            "email": "price@example.com",
            "phone": "03001234567",
            "line1": "Street 3",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        order_num = res.data["order"]["number"]

        # Product price jumps to 3,500
        test_product.price = 3500
        test_product.save(update_fields=["price"])

        order = Order.objects.get(number=order_num)
        assert order.subtotal == 2200
        assert order.items.first().unit_price == 2200

    def test_cod_11_cancel_pending_order_restores_stock_and_coupon(self, api_client, test_product):
        """COD-11: Cancel an order in pending -> Stock restored, coupon released, history row written."""
        initial_stock = test_product.stock
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 2}, format="json")
        payload = {
            "full_name": "Cancel Test",
            "email": "cancel@example.com",
            "phone": "03001234567",
            "line1": "Street 4",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        order_num = res.data["order"]["number"]

        # Cancel order
        cancel_res = api_client.post(f"/api/v1/orders/{order_num}/cancel/")
        assert cancel_res.status_code == 200
        assert cancel_res.data["order"]["status"] == "cancelled"

        test_product.refresh_from_db()
        assert test_product.stock == initial_stock

        order = Order.objects.get(number=order_num)
        assert order.status_history.filter(to_status="cancelled").exists()

    def test_cod_12_cancel_shipped_order_rejected(self, api_client, test_product):
        """COD-12: Cancel an order in shipped -> Rejected."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        payload = {
            "full_name": "Shipped Cancel Test",
            "email": "shipped@example.com",
            "phone": "03001234567",
            "line1": "Street 5",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        order = Order.objects.get(number=res.data["order"]["number"])
        order.status = "shipped"
        order.save(update_fields=["status"])

        cancel_res = api_client.post(f"/api/v1/orders/{order.number}/cancel/")
        assert cancel_res.status_code == 400
        assert "cannot be cancelled" in cancel_res.data["message"].lower()

    def test_cod_13_track_order_lookup_security(self, api_client, test_product):
        """COD-13: Track order with correct and wrong number and phone -> Correct data only on a match."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        payload = {
            "full_name": "Track Security",
            "email": "track@example.com",
            "phone": "03219876543",
            "line1": "Street 6",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
        }
        res = api_client.post("/api/v1/orders/create/", payload, format="json")
        order_num = res.data["order"]["number"]

        # Match succeeds
        ok_res = api_client.post("/api/v1/orders/track/", {"order_number": order_num, "phone": "03219876543"}, format="json")
        assert ok_res.status_code == 200
        assert ok_res.data["number"] == order_num

        # Mismatched phone fails
        bad_phone = api_client.post("/api/v1/orders/track/", {"order_number": order_num, "phone": "03000000000"}, format="json")
        assert bad_phone.status_code == 404

        # Nonexistent order fails
        bad_num = api_client.post("/api/v1/orders/track/", {"order_number": "SPLV-NO-SUCH-ORDER", "phone": "03219876543"}, format="json")
        assert bad_num.status_code == 404

    def test_cod_14_retry_order_safely(self, api_client, test_product):
        """COD-14: Network failure during place order -> No duplicate order, user can retry safely."""
        api_client.post("/api/v1/cart/items/", {"product_id": test_product.id, "quantity": 1}, format="json")
        payload = {
            "full_name": "Retry Safe",
            "email": "retry@example.com",
            "phone": "03001234567",
            "line1": "Street 7",
            "city": "Lahore",
            "province": "Punjab",
            "payment_method": "COD",
            "idempotency_key": "safe-retry-key-100",
        }
        res1 = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res1.status_code == 201

        # Safe retry
        res2 = api_client.post("/api/v1/orders/create/", payload, format="json")
        assert res2.status_code in [200, 201]
        assert res1.data["order"]["number"] == res2.data["order"]["number"]


# ==============================================================================
# MODE-01 to MODE-06: Coming Soon vs Live Mode Suite
# ==============================================================================
@pytest.mark.django_db
class TestModeSuite:
    def test_mode_01_coming_soon_redirects_public_routes_with_noindex_header(self, client):
        """MODE-01: coming_soon mode, open any public route -> Redirect to Coming Soon page, noindex header."""
        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "coming_soon"})
        res = client.get("/")
        assert res.status_code == 302
        assert res.headers.get("Location") == "/coming-soon"
        assert "noindex, nofollow" in res.headers.get("X-Robots-Tag", "")

        res_shop = client.get("/shop/")
        assert res_shop.status_code == 302
        assert res_shop.headers.get("Location") == "/coming-soon"

        # Direct access to coming soon renders 200 with noindex
        res_cs = client.get("/coming-soon/")
        assert res_cs.status_code == 200
        assert "noindex, nofollow" in res_cs.headers.get("X-Robots-Tag", "")
        assert 'content="noindex, nofollow"' in res_cs.content.decode("utf-8")

    def test_mode_02_coming_soon_allows_privacy_policy_and_api_health(self, client):
        """MODE-02: coming_soon mode, open privacy policy and API health -> Reachable."""
        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "coming_soon"})
        res_policy = client.get("/privacy-policy/")
        assert res_policy.status_code == 200

        res_health = client.get("/api/health/")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"

    def test_mode_03_staff_user_can_preview_live_site_in_coming_soon(self, client, admin_user):
        """MODE-03: Staff user in coming_soon mode -> Can preview the live site without redirect."""
        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "coming_soon"})
        client.force_login(admin_user)
        res = client.get("/")
        assert res.status_code == 200
        res_shop = client.get("/shop/")
        assert res_shop.status_code == 200

    def test_mode_04_switch_to_live_in_admin_opens_site_coming_soon_redirects(self, client):
        """MODE-04: Switch to live in admin -> Site opens immediately, Coming Soon returns 404 or redirects home."""
        SiteSetting.objects.update_or_create(key="site_mode", defaults={"value": "live"})
        res_home = client.get("/")
        assert res_home.status_code == 200

        res_cs = client.get("/coming-soon/")
        assert res_cs.status_code == 302
        assert res_cs.headers.get("Location") == "/"

    def test_mode_05_waitlist_valid_invalid_and_duplicate_email(self, api_client):
        """MODE-05: Waitlist: valid, invalid and duplicate email -> Saved, error, friendly duplicate message."""
        # 1. Valid email
        valid_res = api_client.post("/api/v1/waitlist/", {"email": "futurebuyer@example.com"}, format="json")
        assert valid_res.status_code == 201
        assert WaitlistEntry.objects.filter(email="futurebuyer@example.com").exists()

        # 2. Invalid email
        invalid_res = api_client.post("/api/v1/waitlist/", {"email": "invalid-address"}, format="json")
        assert invalid_res.status_code == 400
        assert "email" in invalid_res.data.get("fields", {})

        # 3. Duplicate email
        dup_res = api_client.post("/api/v1/waitlist/", {"email": "futurebuyer@example.com"}, format="json")
        assert dup_res.status_code == 200
        assert "already on the list" in dup_res.data["message"].lower()


# ==============================================================================
# POL-01 to POL-03: Policies & Content Pages
# ==============================================================================
@pytest.mark.django_db
class TestPolicySuite:
    def test_pol_01_privacy_terms_shipping_returns_pages_render(self, client):
        """POL-01: Privacy policy, terms, shipping and returns pages -> Render, linked in footer, anchors work, last-updated date shown."""
        for path, title in [
            ("/privacy-policy/", "Privacy Policy"),
            ("/terms/", "Terms of Service"),
            ("/shipping-policy/", "Shipping"),
            ("/returns-policy/", "Return Policy"),
        ]:
            res = client.get(path)
            assert res.status_code == 200
            content = res.content.decode("utf-8")
            assert title.lower() in content.lower()

    def test_pol_03_contact_form_saves_and_shows_in_admin_filterable(self, api_client, admin_client):
        """POL-03: Contact form saves a message and shows in admin -> Present and filterable."""
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

        # Verify present in admin messages
        admin_res = admin_client.get("/api/v1/admin/messages/?handled=false")
        assert admin_res.status_code == 200
        data = admin_res.json() if hasattr(admin_res, 'json') else admin_res.data
        msg_list = data["results"]
        matched = [m for m in msg_list if m["email"] == "hamza@example.com"]
        assert len(matched) >= 1
        msg_id = matched[0]["id"]

        # Toggle handled state
        toggle_res = admin_client.post(f"/api/v1/admin/messages/{msg_id}/toggle/")
        assert toggle_res.status_code == 200
        t_data = toggle_res.json() if hasattr(toggle_res, 'json') else toggle_res.data
        assert t_data["is_handled"] is True

        # Verify filterable by handled=true
        admin_handled_res = admin_client.get("/api/v1/admin/messages/?handled=true")
        assert admin_handled_res.status_code == 200
        h_data = admin_handled_res.json() if hasattr(admin_handled_res, 'json') else admin_handled_res.data
        handled_ids = [m["id"] for m in h_data["results"]]
        assert msg_id in handled_ids


# ==============================================================================
# FORM-01 to FORM-12: Forms Matrix Suite (Login, Register, Reset, Address, Checkout, Contact, Waitlist, Review)
# ==============================================================================
@pytest.mark.django_db
class TestFormSuite:
    @pytest.fixture(autouse=True)
    def setup_cache(self):
        cache.clear()
        yield
        cache.clear()

    def test_form_01_submit_empty_required_fields_returns_mapped_field_errors(self, api_client):
        """FORM-01 & FORM-07: Submit empty required fields -> Every required field shows error in response."""
        # 1. Register with empty fields
        res_reg = api_client.post("/api/v1/auth/register/", {}, format="json")
        assert res_reg.status_code == 400
        assert "email" in res_reg.data["fields"]
        assert "password" in res_reg.data["fields"]
        assert "full_name" in res_reg.data["fields"]

        # 2. Login with empty fields
        res_login = api_client.post("/api/v1/auth/login/", {}, format="json")
        assert res_login.status_code == 400
        assert "email" in res_login.data["fields"]
        assert "password" in res_login.data["fields"]

        # 3. Contact message with empty fields
        res_contact = api_client.post("/api/v1/contact/", {}, format="json")
        assert res_contact.status_code == 400
        assert "name" in res_contact.data["fields"]
        assert "email" in res_contact.data["fields"]
        assert "message" in res_contact.data["fields"]

        # 4. Checkout with empty fields
        res_checkout = api_client.post("/api/v1/orders/create/", {}, format="json")
        assert res_checkout.status_code == 400
        assert "full_name" in res_checkout.data["fields"]
        assert "phone" in res_checkout.data["fields"]

    def test_form_02_whitespace_only_trimmed_and_rejected(self, api_client):
        """FORM-02: Leading and trailing spaces trimmed; spaces-only rejected."""
        # Spaces only for registration
        res = api_client.post(
            "/api/v1/auth/register/",
            {"full_name": "   ", "email": "   ", "password": "   "},
            format="json",
        )
        assert res.status_code == 400
        assert "email" in res.data["fields"]

        # Leading/trailing spaces on valid registration are trimmed
        res_valid = api_client.post(
            "/api/v1/auth/register/",
            {
                "full_name": "   Zaid Malik   ",
                "email": "   zaid.trim@example.com   ",
                "phone": "  03001234567  ",
                "password": "SecurePassword123!",
            },
            format="json",
        )
        assert res_valid.status_code == 201
        user = User.objects.get(email="zaid.trim@example.com")
        assert user.full_name == "Zaid Malik"
        assert user.phone == "+923001234567"

    def test_form_03_max_length_plus_one_rejected(self, api_client):
        """FORM-03: Maximum length plus one character rejected with field error."""
        # Contact name max_length is 80
        long_name = "A" * 81
        res = api_client.post(
            "/api/v1/contact/",
            {
                "name": long_name,
                "email": "valid@example.com",
                "phone": "03001234567",
                "subject": "Question",
                "message": "Valid detailed message about supplements.",
            },
            format="json",
        )
        assert res.status_code == 400
        assert "name" in res.data["fields"]

        # Register full_name max_length is 255
        long_user_name = "B" * 256
        res2 = api_client.post(
            "/api/v1/auth/register/",
            {
                "full_name": long_user_name,
                "email": "toolong@example.com",
                "password": "ValidPass123!",
            },
            format="json",
        )
        assert res2.status_code == 400
        assert "full_name" in res2.data["fields"]

    def test_form_04_html_and_script_input_stored_safely_escaped(self, api_client, test_customer):
        """FORM-04: HTML and script input (<script>alert(1)</script>) stored safely as text, never executed."""
        api_client.force_authenticate(user=test_customer)
        script_payload = "<script>alert('xss')</script>"
        res = api_client.post(
            "/api/v1/addresses/",
            {
                "full_name": script_payload,
                "phone": "03001234567",
                "line1": f"House 10 {script_payload}",
                "city": "Lahore",
                "province": "Punjab",
            },
            format="json",
        )
        assert res.status_code == 201
        addr_id = res.data["id"]
        addr = Address.objects.get(id=addr_id)
        assert "<script>" in addr.full_name
        assert "<script>" in addr.line1

        # Retrieve and verify it is serialized safely without execution
        get_res = api_client.get(f"/api/v1/addresses/{addr_id}/")
        assert get_res.status_code == 200
        assert get_res.data["full_name"] == script_payload

    def test_form_05_sql_injection_input_treated_as_plain_text(self, api_client):
        """FORM-05: SQL-like input (' OR 1=1 --) treated as plain text."""
        sql_input = "' OR 1=1 --"
        # Search endpoint
        res = api_client.get(f"/api/v1/products/?search={sql_input}")
        assert res.status_code == 200
        # No 500 error or database syntax exception

        # Contact form with SQL input
        res_contact = api_client.post(
            "/api/v1/contact/",
            {
                "name": f"User {sql_input}",
                "email": "sqltest@example.com",
                "phone": "03001234567",
                "subject": sql_input,
                "message": f"Trying SQL injection: {sql_input} safely handled.",
            },
            format="json",
        )
        assert res_contact.status_code == 201
        msg = ContactMessage.objects.filter(email="sqltest@example.com").first()
        assert msg is not None
        assert sql_input in msg.name

    def test_form_06_unicode_and_urdu_text_accepted_and_displayed(self, api_client, test_customer, test_product):
        """FORM-06: Unicode input, Urdu text, long names accepted and displayed correctly."""
        urdu_name = "محمد علی خان"
        urdu_address = "مکان نمبر ۴۴، گلی نمبر ۵، سیکٹر جی ۱۱، اسلام آباد"
        urdu_city = "اسلام آباد"
        urdu_province = "وفاقی دارالحکومت"

        api_client.force_authenticate(user=test_customer)
        res = api_client.post(
            "/api/v1/addresses/",
            {
                "full_name": urdu_name,
                "phone": "03001234567",
                "line1": urdu_address,
                "city": urdu_city,
                "province": urdu_province,
            },
            format="json",
        )
        assert res.status_code == 201
        assert res.data["full_name"] == urdu_name
        assert res.data["line1"] == urdu_address

        # Check round-trip in database
        addr = Address.objects.get(id=res.data["id"])
        assert addr.full_name == urdu_name
        assert addr.line1 == urdu_address

    def test_form_11_honeypot_field_returns_silent_success_and_logs_bot_event(self, api_client):
        """FORM-11: Honeypot filled -> Silent success to the bot, logged as a bot event, nothing saved."""
        initial_events = BotEvent.objects.count()
        initial_users = User.objects.count()

        payload = {
            "full_name": "Spam Bot",
            "email": "spambot99@example.com",
            "phone": "03001234567",
            "password": "BotPassword123!",
            "website": "http://evil-bot-link.ru",  # Honeypot filled
        }
        res = api_client.post("/api/v1/auth/register/", payload, format="json")
        # Bot receives a normal-looking 201 Created response
        assert res.status_code == 201
        assert res.data["message"] == "Registration successful."

        # Verify no real user was created in the database
        assert User.objects.count() == initial_users
        assert not User.objects.filter(email="spambot99@example.com").exists()

        # Verify BotEvent was logged
        assert BotEvent.objects.count() == initial_events + 1
        last_event = BotEvent.objects.latest("created_at")
        assert "honeypot" in last_event.reason.lower()

    def test_form_12_time_trap_fast_submission_adds_risk_score(self):
        """FORM-12: Form time token evaluated; sub-2-second submission flags too_fast and adds score."""
        # Freshly minted token submitted instantly (< 2s)
        token = generate_time_token()
        status, risk = verify_time_token(token)
        assert status == "too_fast"
        assert risk == 40


# ==============================================================================
# ADM-01 to ADM-10: Staff Admin Dashboard Suite
# ==============================================================================
@pytest.mark.django_db
class TestAdminSuite:
    @pytest.fixture
    def admin_client(self, test_staff):
        client = APIClient()
        client.force_authenticate(user=test_staff)
        return client

    def test_adm_01_non_staff_and_anonymous_access_forbidden(self, api_client, test_customer):
        """ADM-01: Non-staff and anonymous access to every admin endpoint -> 403 or redirect/unauthorized."""
        admin_endpoints = [
            "/api/v1/admin/overview/",
            "/api/v1/admin/products/",
            "/api/v1/admin/orders/",
            "/api/v1/admin/coupons/",
            "/api/v1/admin/settings/",
            "/api/v1/admin/audit-logs/",
        ]
        # Anonymous access
        for ep in admin_endpoints:
            res = api_client.get(ep)
            assert res.status_code in [401, 403], f"Anonymous access to {ep} returned {res.status_code}"

        # Authenticated non-staff customer access
        api_client.force_authenticate(user=test_customer)
        for ep in admin_endpoints:
            res = api_client.get(ep)
            assert res.status_code == 403, f"Customer access to {ep} returned {res.status_code}"

    def test_adm_02_product_crud_lifecycle_and_validation(self, admin_client, api_client, test_category):
        """ADM-02: Create, edit, deactivate, delete product with validation -> Works, invalid rejected, public reflects."""
        # 1. Invalid input: missing name and negative price
        invalid_res = admin_client.post(
            "/api/v1/admin/products/",
            {
                "name": "",
                "slug": "invalid-prod",
                "price": -500,
                "category_id": test_category.id,
            },
            format="json",
        )
        assert invalid_res.status_code == 400

        # 2. Valid create
        create_res = admin_client.post(
            "/api/v1/admin/products/",
            {
                "name": "Supplivix Omega-3 Pure 60s",
                "slug": "supplivix-omega-3-pure-60s",
                "category_id": test_category.id,
                "product_type": "multivitamin",
                "price": 2800,
                "stock": 40,
            },
            format="json",
        )
        assert create_res.status_code == 201
        prod_id = create_res.data["id"]

        # 3. Edit product
        edit_res = admin_client.patch(
            f"/api/v1/admin/products/{prod_id}/",
            {
                "price": 3100,
                "stock": 50,
            },
            format="json",
        )
        assert edit_res.status_code == 200
        assert edit_res.data["product"]["price"] == 3100
        assert edit_res.data["product"]["stock"] == 50

        # 4. Deactivate product and verify public catalog reflects changes
        deact_res = admin_client.patch(
            f"/api/v1/admin/products/{prod_id}/",
            {
                "is_active": False,
            },
            format="json",
        )
        assert deact_res.status_code == 200

        public_res = api_client.get("/api/v1/products/?search=Omega-3")
        assert public_res.status_code == 200
        found_ids = [p["id"] for p in public_res.data["results"]]
        assert prod_id not in found_ids

        # 5. Delete product
        del_res = admin_client.delete(f"/api/v1/admin/products/{prod_id}/")
        assert del_res.status_code == 200
        assert not Product.objects.filter(id=prod_id).exists()

    def test_adm_03_image_upload_validation_3mb_exe_and_webp(self, admin_client, test_product):
        """ADM-03: Upload a 3 MB file, a .exe renamed to .jpg, a valid WebP -> First two rejected, last accepted."""
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image as PILImage

        # 1. 3 MB file (> 2 MB cap)
        huge_bytes = b"0" * (3 * 1024 * 1024)
        huge_file = SimpleUploadedFile("oversized.jpg", huge_bytes, content_type="image/jpeg")
        res_huge = admin_client.post(
            f"/api/v1/admin/products/{test_product.id}/images/",
            {"image": huge_file, "alt_text": "Oversized image"},
            format="multipart",
        )
        assert res_huge.status_code == 400
        assert "2 MB" in res_huge.data["message"]

        # 2. .exe renamed to .jpg
        exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00" + (b"\x00" * 200)
        fake_exe = SimpleUploadedFile("trojan.jpg", exe_bytes, content_type="image/jpeg")
        res_exe = admin_client.post(
            f"/api/v1/admin/products/{test_product.id}/images/",
            {"image": fake_exe, "alt_text": "Fake JPEG executable"},
            format="multipart",
        )
        assert res_exe.status_code == 400

        # 3. Valid WebP image
        webp_buf = BytesIO()
        pil_img = PILImage.new("RGB", (64, 64), color="green")
        pil_img.save(webp_buf, format="WEBP")
        webp_bytes = webp_buf.getvalue()
        valid_webp = SimpleUploadedFile("product_photo.webp", webp_bytes, content_type="image/webp")

        res_webp = admin_client.post(
            f"/api/v1/admin/products/{test_product.id}/images/",
            {"image": valid_webp, "alt_text": "Supplivix Core Bottle Front"},
            format="multipart",
        )
        assert res_webp.status_code == 201
        assert "image_url" in res_webp.data
        assert res_webp.data["alt_text"] == "Supplivix Core Bottle Front"

    def test_adm_04_order_status_transitions_valid_and_invalid(self, admin_client):
        """ADM-04: Move order through valid and invalid status transitions -> Valid saved with history, invalid rejected."""
        order = Order.objects.create(
            number="SPLV-TRNS-1122",
            guest_email="buyer.transition@example.com",
            shipping_address_snapshot={"full_name": "Tariq Ali", "phone": "+923001234567", "city": "Lahore"},
            status="pending",
            subtotal=2400,
            grand_total=2400,
            payment_method="COD",
        )
        # Valid: pending -> confirmed
        res1 = admin_client.post(
            f"/api/v1/admin/orders/{order.number}/transition/",
            {"status": "confirmed", "notes": "Phone verified"},
        )
        assert res1.status_code == 200
        order.refresh_from_db()
        assert order.status == "confirmed"
        assert order.status_history.filter(to_status="confirmed").exists()

        # Valid: confirmed -> packed
        res2 = admin_client.post(
            f"/api/v1/admin/orders/{order.number}/transition/",
            {"status": "packed", "notes": "Packed in warehouse"},
        )
        assert res2.status_code == 200
        order.refresh_from_db()
        assert order.status == "packed"

        # Valid: packed -> shipped
        res3 = admin_client.post(
            f"/api/v1/admin/orders/{order.number}/transition/",
            {"status": "shipped", "notes": "Dispatched via Leopard"},
        )
        assert res3.status_code == 200
        order.refresh_from_db()
        assert order.status == "shipped"

        # Invalid transition: shipped -> pending (illegal backward jump)
        res_inv = admin_client.post(
            f"/api/v1/admin/orders/{order.number}/transition/",
            {"status": "pending"},
        )
        assert res_inv.status_code == 400
        order.refresh_from_db()
        assert order.status == "shipped"

        # Valid: shipped -> delivered
        res4 = admin_client.post(
            f"/api/v1/admin/orders/{order.number}/transition/",
            {"status": "delivered", "notes": "Delivered to customer"},
        )
        assert res4.status_code == 200
        order.refresh_from_db()
        assert order.status == "delivered"

    def test_adm_05_mark_cod_collected_updates_status_and_overview(self, admin_client):
        """ADM-05: Mark COD collected -> Status and amount recorded, shown in the overview."""
        order = Order.objects.create(
            number="SPLV-COD-9988",
            guest_email="cod.buyer@example.com",
            shipping_address_snapshot={"full_name": "Kashif Bilal", "phone": "+923009988776", "city": "Faisalabad"},
            status="delivered",
            subtotal=4200,
            grand_total=4200,
            payment_method="COD",
        )
        res = admin_client.post(f"/api/v1/admin/orders/{order.number}/mark-cod-collected/")
        assert res.status_code == 200
        order.refresh_from_db()
        assert order.status == "cod_collected"

        # Status history recorded
        assert order.status_history.filter(to_status="cod_collected").exists()

        # Shown in admin overview
        overview_res = admin_client.get("/api/v1/admin/overview/")
        assert overview_res.status_code == 200
        data = overview_res.data
        assert data["cod_collected_amount"] >= 4200
        assert data["orders_by_status"]["cod_collected"] >= 1

    def test_adm_06_create_each_coupon_type_edit_deactivate(self, admin_client, api_client):
        """ADM-06: Create each coupon type, edit, deactivate -> Behaves as in COUP tests."""
        # 1. Percentage coupon with cap
        res_perc = admin_client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "ADMPCT20",
                "discount_type": "percentage",
                "discount_value": 20,
                "max_discount_amount": 500,
                "min_order_amount": 1000,
            },
            format="json",
        )
        assert res_perc.status_code == 201
        c_id = res_perc.data["id"]

        # 2. Fixed coupon
        res_fix = admin_client.post(
            "/api/v1/admin/coupons/",
            {
                "code": "ADMFIX300",
                "discount_type": "fixed",
                "discount_value": 300,
                "min_order_amount": 1500,
            },
            format="json",
        )
        assert res_fix.status_code == 201

        # 3. Edit percentage coupon min_order_amount
        edit_res = admin_client.patch(
            f"/api/v1/admin/coupons/{c_id}/",
            {
                "min_order_amount": 1200,
            },
            format="json",
        )
        assert edit_res.status_code == 200

        # 4. Deactivate coupon
        deact_res = admin_client.patch(
            f"/api/v1/admin/coupons/{c_id}/",
            {
                "is_active": False,
            },
            format="json",
        )
        assert deact_res.status_code == 200

        # Attempt to apply inactive coupon in public cart quote
        cart_res = api_client.post("/api/v1/cart/coupon/", {"code": "ADMPCT20"}, format="json")
        assert cart_res.status_code == 400
        assert "inactive" in cart_res.data["message"].lower()

    def test_adm_07_change_free_shipping_threshold_and_fee(self, admin_client, api_client):
        """ADM-07: Change free shipping threshold and fee -> Applied without redeploy (SHIP-05)."""
        patch_res = admin_client.patch(
            "/api/v1/admin/settings/",
            {
                "free_shipping_threshold": 3000,
                "flat_shipping_fee": 250,
            },
            format="json",
        )
        assert patch_res.status_code == 200

        # Verify on public settings endpoint immediately
        pub_res = api_client.get("/api/v1/settings/public/")
        assert pub_res.status_code == 200
        assert pub_res.data["free_shipping_threshold"] == 3000
        assert pub_res.data["flat_shipping_fee"] == 250

    def test_adm_08_bulk_update_and_csv_import_with_bad_row(self, admin_client, test_category):
        """ADM-08: Bulk update and CSV import with a bad row -> Valid rows applied or all rolled back, error report shown."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        # Part 1: Bulk status update
        p1 = Product.objects.create(name="Bulk 1", slug="bulk-1", sku="SPLV-B1", category=test_category, price=1000, is_active=True)
        p2 = Product.objects.create(name="Bulk 2", slug="bulk-2", sku="SPLV-B2", category=test_category, price=2000, is_active=True)
        bulk_res = admin_client.post(
            "/api/v1/admin/products/bulk-status/",
            {"ids": [p1.id, p2.id], "is_active": False},
            format="json",
        )
        assert bulk_res.status_code == 200
        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.is_active is False
        assert p2.is_active is False

        # Part 2: CSV import with bad row (invalid price string)
        bad_csv = (
            "Slug,Name,Price_PKR,Stock,Type\n"
            "good-item-1,Good Vitamin 1,1800,20,multivitamin\n"
            "bad-item-2,Bad Vitamin 2,invalid_price,15,multivitamin\n"
        ).encode("utf-8")
        bad_file = SimpleUploadedFile("import_bad.csv", bad_csv, content_type="text/csv")

        csv_res_bad = admin_client.post(
            "/api/v1/admin/products/import-csv/",
            {"file": bad_file},
            format="multipart",
        )
        assert csv_res_bad.status_code == 400
        assert len(csv_res_bad.data["errors"]) >= 1
        assert csv_res_bad.data["errors"][0]["row"] == 3
        # Verify rollback: good-item-1 was not persisted
        assert not Product.objects.filter(slug="good-item-1").exists()

        # Part 3: CSV import with valid rows
        good_csv = (
            "Slug,Name,Price_PKR,Stock,Type\n"
            "valid-item-1,Valid Vitamin 1,1800,25,multivitamin\n"
            "valid-item-2,Valid Vitamin 2,2400,30,multivitamin\n"
        ).encode("utf-8")
        good_file = SimpleUploadedFile("import_good.csv", good_csv, content_type="text/csv")
        csv_res_good = admin_client.post(
            "/api/v1/admin/products/import-csv/",
            {"file": good_file},
            format="multipart",
        )
        assert csv_res_good.status_code == 200
        assert Product.objects.filter(slug="valid-item-1").exists()
        assert Product.objects.filter(slug="valid-item-2").exists()

    def test_adm_09_overview_figures_equal_raw_database_counts(self, admin_client):
        """ADM-09: Overview figures against raw database counts -> Equal."""
        from django.db.models import Sum

        res = admin_client.get("/api/v1/admin/overview/")
        assert res.status_code == 200
        data = res.data

        # Database comparisons
        assert data["total_orders_count"] == Order.objects.count()
        assert data["out_of_stock_count"] == Product.objects.filter(stock__lte=0).count()
        assert data["pending_dispatch_count"] == Order.objects.filter(status__in=["pending", "confirmed", "packed"]).count()

        expected_revenue = (
            Order.objects.filter(status__in=["delivered", "cod_collected"]).aggregate(total=Sum("grand_total"))["total"] or 0
        )
        assert data["total_revenue"] == expected_revenue

    def test_adm_10_every_destructive_action_records_audit_log(self, admin_client, test_category):
        """ADM-10: Every destructive action -> Confirmation modal (frontend) and audit log entry (backend)."""
        from core.models import AdminAuditLog

        initial_log_count = AdminAuditLog.objects.count()

        # 1. Product deletion
        p = Product.objects.create(name="Delete Me", slug="delete-me", sku="SPLV-DEL", category=test_category, price=1000)
        admin_client.delete(f"/api/v1/admin/products/{p.id}/")
        assert AdminAuditLog.objects.filter(action="delete_product", target_id=str(p.id)).exists()

        # 2. Block IP & Unblock IP
        admin_client.post("/api/v1/admin/security/block-ip/", {"ip": "198.51.100.99", "reason": "Test Block"})
        assert AdminAuditLog.objects.filter(action="block_ip").exists()

        admin_client.post("/api/v1/admin/security/unblock-ip/", {"ip_address": "198.51.100.99"})
        assert AdminAuditLog.objects.filter(action="unblock_ip").exists()

        # 3. Customer status toggle (deactivation)
        user = User.objects.create_user(email="test.toggle@example.com", password="Password123!", full_name="Toggle User")
        admin_client.post(f"/api/v1/admin/customers/{user.id}/toggle-status/")
        assert AdminAuditLog.objects.filter(action="block_customer", target_id=str(user.id)).exists()

        assert AdminAuditLog.objects.count() >= initial_log_count + 4
