"""
Locust load test suite for Supplivix Skincare & Multivitamins E-Commerce (Phase 10).
Simulates 100 concurrent users driving realistic multi-journey traffic against the Neon database:
- 50% Browsers: home, multivitamins hub, category, search, 3 product pages
- 20% Cart Builders: browse, add 1-4 items, change quantity, apply coupon
- 20% Buyers: guest/auth, add items, checkout quote, place COD order, confirm
- 5% Account Managers: login, view orders, cancel pending order
- 5% Edge Case Testers: invalid coupon, out-of-stock add, wrong login, invalid form
- Plus BotAttacker class: scripted spam, fast scrape, automation headers

Strictly zero emojis anywhere. Nationwide Cash on Delivery (COD). Whole PKR pricing.
"""

import random

from locust import HttpUser, between, task


class BrowserShopper(HttpUser):
    """
    50% Share: Pure browsing customer.
    Visits home, multivitamins hub, category filters, search queries, and 3 product details.
    """
    weight = 50
    wait_time = between(1.0, 3.0)

    def on_start(self):
        self.client_ip = f"198.51.100.{random.randint(1, 100)}"
        self.headers = {"X-Forwarded-For": self.client_ip}

    @task(3)
    def browse_home_and_settings(self):
        self.client.get("/api/v1/settings/public/", headers=self.headers, name="/api/v1/settings/public/")
        self.client.get("/api/v1/categories/", headers=self.headers, name="/api/v1/categories/")

    @task(5)
    def browse_multivitamins_hub(self):
        # Dedicated multivitamins hub and filtering
        res = self.client.get(
            "/api/v1/products/?product_type=multivitamin",
            headers=self.headers,
            name="/api/v1/products/?product_type=multivitamin"
        )
        if res.status_code == 200:
            results = res.json().get("results", [])
            for prod in results[:3]:
                self.client.get(
                    f"/api/v1/products/{prod['slug']}/",
                    headers=self.headers,
                    name="/api/v1/products/[slug]/"
                )
                self.client.get(
                    f"/api/v1/products/{prod['slug']}/reviews/",
                    headers=self.headers,
                    name="/api/v1/products/[slug]/reviews/"
                )

    @task(2)
    def search_catalog(self):
        query = random.choice(["daily", "multivitamin", "zinc", "serum", "cleanser", "balance"])
        self.client.get(
            f"/api/v1/products/?search={query}",
            headers=self.headers,
            name="/api/v1/products/?search=[query]"
        )


class CartBuilder(HttpUser):
    """
    20% Share: Cart building customer.
    Browses, adds 1 to 4 items, adjusts quantities, applies coupon, and inspects shipping meter.
    """
    weight = 20
    wait_time = between(1.0, 2.5)

    def on_start(self):
        self.client_ip = f"198.51.100.{random.randint(1, 100)}"
        self.headers = {"X-Forwarded-For": self.client_ip}

    @task
    def build_cart_flow(self):
        # 1. Inspect catalog
        res = self.client.get("/api/v1/products/", headers=self.headers, name="/api/v1/products/")
        if res.status_code == 200:
            products = [p for p in res.json().get("results", []) if p.get("stock", 0) > 2]
            if products:
                sample_items = random.sample(products, min(len(products), random.randint(1, 3)))
                for item in sample_items:
                    # Add item
                    self.client.post(
                        "/api/v1/cart/items/",
                        json={"product_id": item["id"], "quantity": random.randint(1, 2)},
                        headers=self.headers,
                        name="/api/v1/cart/items/ [POST]"
                    )

                # View cart with free shipping meter
                cart_res = self.client.get("/api/v1/cart/", headers=self.headers, name="/api/v1/cart/ [GET]")
                if cart_res.status_code == 200:
                    cart_data = cart_res.json()
                    items = cart_data.get("items", [])
                    if items:
                        # Change quantity on first item
                        self.client.patch(
                            f"/api/v1/cart/items/{items[0]['id']}/",
                            json={"quantity": 3},
                            headers=self.headers,
                            name="/api/v1/cart/items/[id]/ [PATCH]"
                        )

                    # Try coupon
                    with self.client.post(
                        "/api/v1/cart/coupon/",
                        json={"code": "WELCOME10"},
                        headers=self.headers,
                        name="/api/v1/cart/coupon/ [POST]",
                        catch_response=True,
                    ) as c_res:
                        if c_res.status_code in [200, 400]:
                            c_res.success()
                        else:
                            c_res.failure(f"Coupon failed: {c_res.status_code}")


class Buyer(HttpUser):
    """
    20% Share: Converting buyer.
    Adds items, requests checkout quote, places COD order, and views confirmation.
    """
    weight = 20
    wait_time = between(1.5, 3.5)

    def on_start(self):
        self.user_idx = random.randint(1, 100)
        self.email = f"load+{self.user_idx}@example.com"
        self.phone = f"0300{self.user_idx:07d}"
        self.client_ip = f"198.51.100.{self.user_idx}"
        self.headers = {"X-Forwarded-For": self.client_ip}

    @task
    def buy_cod_journey(self):
        # 1. Add in-stock multivitamin to cart
        res = self.client.get(
            "/api/v1/products/?product_type=multivitamin&in_stock=true",
            headers=self.headers,
            name="/api/v1/products/?in_stock=true"
        )
        if res.status_code == 200:
            prods = res.json().get("results", [])
            if prods:
                chosen = random.choice(prods)
                self.client.post(
                    "/api/v1/cart/items/",
                    json={"product_id": chosen["id"], "quantity": 1},
                    headers=self.headers,
                    name="/api/v1/cart/items/ [POST]"
                )

                # 2. Checkout quote
                self.client.post(
                    "/api/v1/checkout/quote/",
                    json={},
                    headers=self.headers,
                    name="/api/v1/checkout/quote/ [POST]"
                )

                # 3. Place COD order
                order_payload = {
                    "full_name": f"Load Shopper {self.user_idx}",
                    "email": self.email,
                    "phone": self.phone,
                    "line1": f"House {self.user_idx}, Street 4, Sector G-11/2",
                    "city": "Lahore",
                    "province": "Punjab",
                    "postal_code": "54000",
                    "payment_method": "COD",
                }
                with self.client.post(
                    "/api/v1/orders/create/",
                    json=order_payload,
                    headers=self.headers,
                    name="/api/v1/orders/create/ [POST]",
                    catch_response=True,
                ) as o_res:
                    if o_res.status_code in [200, 201, 400]:
                        o_res.success()
                        order_num = o_res.json().get("order", {}).get("number")
                        if order_num:
                            # 4. View order confirmation / tracking
                            self.client.post(
                                "/api/v1/orders/track/",
                                json={"order_number": order_num, "phone": self.phone},
                                headers=self.headers,
                                name="/api/v1/orders/track/ [POST]"
                            )
                    else:
                        o_res.failure(f"Order failed with {o_res.status_code}")


class AccountManager(HttpUser):
    """
    5% Share: Existing customer managing account and orders.
    Logs in, inspects orders list, and cancels a pending order.
    """
    weight = 5
    wait_time = between(2.0, 4.0)

    def on_start(self):
        self.user_idx = random.randint(1, 100)
        self.email = f"load+{self.user_idx}@example.com"
        self.password = "LoadTestPass2026!"
        self.client_ip = f"198.51.100.{self.user_idx}"
        self.headers = {"X-Forwarded-For": self.client_ip}

    @task
    def account_order_management(self):
        # 1. Login
        login_res = self.client.post(
            "/api/v1/auth/login/",
            json={"email": self.email, "password": self.password},
            headers=self.headers,
            name="/api/v1/auth/login/ [POST]"
        )
        if login_res.status_code == 200:
            # 2. View user orders
            orders_res = self.client.get("/api/v1/orders/", headers=self.headers, name="/api/v1/orders/ [GET]")
            if orders_res.status_code == 200:
                orders = orders_res.json().get("results", [])
                pending_orders = [o for o in orders if o.get("status") in ["pending", "confirmed"]]
                if pending_orders:
                    target_order = pending_orders[0]
                    with self.client.post(
                        f"/api/v1/orders/{target_order['number']}/cancel/",
                        json={"note": "Load test cancellation drill."},
                        headers=self.headers,
                        name="/api/v1/orders/[num]/cancel/ [POST]",
                        catch_response=True,
                    ) as cancel_res:
                        if cancel_res.status_code in [200, 400]:
                            cancel_res.success()
                        else:
                            cancel_res.failure(f"Cancellation returned {cancel_res.status_code}")


class EdgeCaseTester(HttpUser):
    """
    5% Share: Edge cases.
    Attempts invalid coupon codes, out-of-stock cart additions, wrong logins, and invalid form data.
    """
    weight = 5
    wait_time = between(1.0, 2.5)

    def on_start(self):
        self.client_ip = f"198.51.200.{random.randint(1, 50)}"
        self.headers = {"X-Forwarded-For": self.client_ip}

    @task(2)
    def test_invalid_coupon(self):
        with self.client.post(
            "/api/v1/cart/coupon/",
            json={"code": f"FAKE_CODE_{random.randint(100, 999)}"},
            headers=self.headers,
            name="/api/v1/cart/coupon/ [Edge 400]",
            catch_response=True,
        ) as res:
            if res.status_code in [400, 429]:
                res.success()
            else:
                res.failure(f"Expected 400/429 for fake coupon, got {res.status_code}")

    @task(1)
    def test_wrong_login_credentials(self):
        with self.client.post(
            "/api/v1/auth/login/",
            json={"email": "nonexistent_shopper@example.com", "password": "WrongPassword123!"},
            headers=self.headers,
            name="/api/v1/auth/login/ [Edge 400/401]",
            catch_response=True,
        ) as res:
            if res.status_code in [400, 401, 429]:
                res.success()
            else:
                res.failure(f"Expected 400/401/429 for wrong login, got {res.status_code}")

    @task(1)
    def test_invalid_order_fields(self):
        with self.client.post(
            "/api/v1/orders/create/",
            json={"payment_method": "CREDIT_CARD", "phone": "123"},
            headers=self.headers,
            name="/api/v1/orders/create/ [Edge 400]",
            catch_response=True,
        ) as res:
            if res.status_code in [400, 429]:
                res.success()
            else:
                res.failure(f"Expected 400 for non-COD payment, got {res.status_code}")


class BotAttacker(HttpUser):
    """
    Simulated automated bot traffic (50 scripted clients).
    Spams endpoints, scrapes quickly, and sends automation user agents to verify bot mitigation.
    """
    weight = 0  # Run independently or with dedicated tags
    wait_time = between(0.1, 0.5)

    def on_start(self):
        self.bot_ip = f"203.0.113.{random.randint(1, 50)}"
        self.headers = {
            "User-Agent": "python-requests/2.31.0 (AutomatedBotTest/1.0)",
            "X-Forwarded-For": self.bot_ip,
        }

    @task(3)
    def spam_waitlist_with_honeypot(self):
        with self.client.post(
            "/api/v1/content/waitlist/",
            json={
                "email": f"bot_target_{random.randint(1, 1000)}@botnet.test",
                "website": "http://spambot-link.com",  # Honeypot filled
            },
            headers=self.headers,
            name="/api/v1/content/waitlist/ [Bot Honeypot]",
            catch_response=True,
        ) as res:
            if res.status_code in [200, 201, 400, 403, 429]:
                res.success()
            else:
                res.failure(f"Bot request failed unexpectedly: {res.status_code}")

    @task(2)
    def spam_registration(self):
        with self.client.post(
            "/api/v1/auth/register/",
            json={
                "email": f"botuser_{random.randint(1, 99999)}@spam.net",
                "password": "Password123!",
                "full_name": "Spam Bot",
                "website": "http://spambot.com",
            },
            headers=self.headers,
            name="/api/v1/auth/register/ [Bot Spam]",
            catch_response=True,
        ) as res:
            if res.status_code in [200, 201, 400, 403, 429]:
                res.success()
            else:
                res.failure(f"Bot register failed: {res.status_code}")
