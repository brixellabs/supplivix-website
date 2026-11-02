"""
Locust load test suite for Supplivix Skincare & Multivitamins E-Commerce.
Simulates 100 concurrent users browsing multivitamins, adding to cart,
applying discount tokens, and completing Cash on Delivery (COD) checkouts.

Strictly zero emojis anywhere.
"""

import random

from locust import HttpUser, between, task


class SupplivixShopper(HttpUser):
    """
    Simulates a typical customer on Supplivix with multivitamins as primary focus.
    """
    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Pick a dedicated load test account or browse as guest."""
        self.is_guest = random.random() < 0.3
        self.user_idx = random.randint(1, 100)
        self.email = f"loaduser_{self.user_idx:03d}@supplivix.load"
        self.phone = f"0300{self.user_idx:07d}"
        self.session_token = None
        self.cart_items = []
        self.last_order_number = None

    @task(4)
    def browse_multivitamins_catalog(self):
        """Browse flagship multivitamins and category listings."""
        self.client.get("/api/v1/categories/", name="/api/v1/categories/")
        res = self.client.get(
            "/api/v1/products/?product_type=multivitamin",
            name="/api/v1/products/?product_type=multivitamin"
        )
        if res.status_code == 200:
            data = res.json()
            results = data.get("results", [])
            if results:
                sampled = random.choice(results)
                # View product details
                self.client.get(
                    f"/api/v1/products/{sampled['slug']}/",
                    name="/api/v1/products/[slug]/"
                )

    @task(3)
    def cart_lifecycle_and_shipping_meter(self):
        """Add multivitamin to cart, inspect free shipping meter, apply discount."""
        # 1. Fetch products to get valid ID
        prod_res = self.client.get("/api/v1/products/", name="/api/v1/products/")
        if prod_res.status_code == 200:
            products = prod_res.json().get("results", [])
            in_stock_prods = [p for p in products if p.get("stock", 0) > 0]
            if in_stock_prods:
                chosen = random.choice(in_stock_prods)
                # Add 1 item to cart
                add_res = self.client.post(
                    "/api/v1/cart/items/",
                    json={"product_id": chosen["id"], "quantity": 1},
                    name="/api/v1/cart/items/"
                )
                if add_res.status_code == 200:
                    # View cart
                    self.client.get("/api/v1/cart/", name="/api/v1/cart/")
                    # Apply coupon
                    self.client.post(
                        "/api/v1/cart/coupon/",
                        json={"code": "WELCOME10"},
                        name="/api/v1/cart/coupon/"
                    )

    @task(2)
    def complete_cod_checkout(self):
        """Complete a Cash on Delivery checkout with phone normalization."""
        # Check cart
        cart_res = self.client.get("/api/v1/cart/", name="/api/v1/cart/")
        if cart_res.status_code == 200:
            cart = cart_res.json()
            if cart.get("total_items", 0) > 0:
                payload = {
                    "full_name": f"Shopper {self.user_idx}",
                    "email": self.email,
                    "phone": self.phone,
                    "line1": f"House {self.user_idx}, Street 4, Sector G-11/2",
                    "city": random.choice(["Lahore", "Karachi", "Islamabad", "Faisalabad"]),
                    "province": "Punjab",
                    "payment_method": "COD",
                }
                order_res = self.client.post(
                    "/api/v1/orders/create/",
                    json=payload,
                    name="/api/v1/orders/create/"
                )
                if order_res.status_code == 201:
                    order_data = order_res.json().get("order", {})
                    self.last_order_number = order_data.get("number")
                    # Track newly created order
                    if self.last_order_number:
                        self.client.post(
                            "/api/v1/orders/track/",
                            json={
                                "order_number": self.last_order_number,
                                "phone": self.phone,
                            },
                            name="/api/v1/orders/track/"
                        )

    @task(1)
    def view_system_and_seo_endpoints(self):
        """Check health, robots.txt, sitemap.xml, llms.txt."""
        self.client.get("/api/health/", name="/api/health/")
        self.client.get("/robots.txt", name="/robots.txt")
        self.client.get("/sitemap.xml", name="/sitemap.xml")
        self.client.get("/llms.txt", name="/llms.txt")
        self.client.get("/api/v1/settings/public/", name="/api/v1/settings/public/")
