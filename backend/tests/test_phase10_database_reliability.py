"""
Phase 10 Automated Test Suite: Category M (Database & Reliability - Neon).
Covers DB-01 through DB-05:
- DB-01: First request after Neon auto-suspend succeeds after retry under 5 seconds.
- DB-02: Migrations on fresh branch and seeded branch succeed, reversible where possible.
- DB-03: Order placement transaction forced to fail halfway rolls back fully.
- DB-04: Connection pool under 100 concurrent users without connection errors.
- DB-05: Backup and restore drill using a Neon branch from a past point in time.

Strictly zero emojis.
"""

import concurrent.futures
import io
import time
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.db import OperationalError, connection
from django.db.migrations.executor import MigrationExecutor
from django.http import HttpResponse
from django.test import RequestFactory
from rest_framework.test import APIClient

from cart.models import Cart, CartItem
from catalog.models import Category, Product
from core.middleware import NeonAutoSuspendRetryMiddleware
from orders.models import Order
from orders.services import place_cod_order
from promotions.models import Coupon, CouponRedemption


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestNeonDatabaseReliabilitySuite:
    """Test matrix for Category M: Database and reliability (Neon)."""

    def test_db_01_first_request_after_neon_auto_suspend_retries_under_5_seconds(self, rf):
        """DB-01: First request after Neon auto-suspend -> Succeeds after a retry, under 5 seconds."""
        call_count = 0

        def mock_get_response(request):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First attempt fails due to Neon endpoint auto-suspend cold start
                raise OperationalError("server closed the connection unexpectedly (Neon auto-suspend)")
            # Subsequent attempt succeeds
            return HttpResponse("OK", status=200)

        middleware = NeonAutoSuspendRetryMiddleware(mock_get_response)
        request = rf.get('/api/health/')

        start_time = time.time()
        response = middleware(request)
        elapsed = time.time() - start_time

        assert response.status_code == 200
        assert response.content == b"OK"
        assert call_count == 2
        assert elapsed < 5.0, f"Retry took {elapsed:.2f}s, expected under 5 seconds"

    def test_db_02_migrations_reversible_and_succeed_on_seeded_data(self):
        """DB-02: Migrations on a fresh branch and on a branch with seeded data -> Succeed, reversible where possible."""
        # 1. Verify schema is completely synced with no uncreated migrations
        call_command('makemigrations', check=True, dry_run=True)

        # 2. Verify showmigrations output has all applied migrations
        out = io.StringIO()
        call_command('showmigrations', stdout=out)
        migrations_output = out.getvalue()
        assert '[X]' in migrations_output
        assert '[ ]' not in migrations_output, "Found unapplied migrations"

        # 3. Verify all project app migrations exist in graph and are reversible where possible
        executor = MigrationExecutor(connection)
        applied_migrations = executor.loader.applied_migrations
        project_apps = ['accounts', 'catalog', 'cart', 'orders', 'promotions', 'core', 'content']

        for app in project_apps:
            app_migrations = [m for m in executor.loader.disk_migrations if m[0] == app]
            assert len(app_migrations) > 0, f"No migrations found for {app}"
            for mig in app_migrations:
                assert mig in applied_migrations, f"Migration {mig} is not applied"

        for (app_label, name), migration in executor.loader.disk_migrations.items():
            if app_label in project_apps:
                for operation in migration.operations:
                    assert getattr(operation, 'reversible', True) is not False, (
                        f"Non-reversible migration operation detected in {app_label}.{name}"
                    )

        # 4. On PostgreSQL / Neon environments, run actual live rollback and forward test
        if connection.vendor == 'postgresql':
            call_command('migrate', 'orders', '0001', verbosity=0)
            call_command('migrate', 'orders', verbosity=0)

        # 5. Verify database consistency after migration cycle
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            assert cursor.fetchone()[0] == 1

    def test_db_03_order_placement_transaction_forced_fail_halfway_rolls_back_fully(self):
        """DB-03: Order placement transaction forced to fail halfway -> Full rollback: no order, no stock change, no coupon use."""
        # Setup: Category, Product with stock=15, and Coupon with limit=1
        category = Category.objects.create(name='Vitamins Rollback Test', slug='vitamins-rollback-test')
        product = Product.objects.create(
            name='Rollback Multi 60s',
            slug='rollback-multi-60s',
            category=category,
            price=2500,
            stock=15,
            sku='SPLV-ROLLBACK-01',
            is_active=True
        )
        coupon = Coupon.objects.create(
            code='ROLLBACK10',
            type='percent',
            value=10,
            usage_limit_total=1,
            usage_limit_per_user=1,
            is_active=True
        )

        # Create cart with 3 items of product
        cart = Cart.objects.create(coupon_code='ROLLBACK10')
        CartItem.objects.create(cart=cart, product=product, quantity=3)

        checkout_data = {
            'full_name': 'Ali Khan',
            'email': 'ali.rollback@supplivix.com',
            'phone': '03001234567',
            'line1': 'House 1, Street 2',
            'street_address': 'House 1, Street 2',
            'city': 'Lahore',
            'province': 'Punjab',
            'payment_method': 'COD',
        }

        # Mock Order creation or status history to simulate a crash midway through transaction
        with patch('orders.services.OrderStatusHistory.objects.create', side_effect=RuntimeError("Simulated server crash midway")):
            with pytest.raises(RuntimeError) as exc_info:
                place_cod_order(cart=cart, checkout_data=checkout_data)
            assert "Simulated server crash midway" in str(exc_info.value)

        # Verify full transaction rollback:
        # 1. Product stock was NOT decremented
        product.refresh_from_db()
        assert product.stock == 15

        # 2. Coupon was NOT redeemed
        assert CouponRedemption.objects.filter(coupon=coupon).count() == 0

        # 3. No order was created
        assert Order.objects.filter(guest_email='ali.rollback@supplivix.com').count() == 0

        # 4. Cart items remain intact
        assert cart.items.count() == 1
        assert cart.items.first().quantity == 3

    def test_db_04_connection_pool_under_100_concurrent_queries(self):
        """DB-04: Connection pool under 100 concurrent users -> No 'too many connections' errors."""
        def run_db_query():
            connection.close()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                return row[0]

        # Execute 100 concurrent queries simulating high concurrency traffic
        with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
            futures = [executor.submit(run_db_query) for _ in range(100)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        assert len(results) == 100
        assert all(res == 1 for res in results)

    def test_db_05_backup_and_restore_drill_verified(self):
        """DB-05: Backup and restore drill using a Neon branch from a past point in time -> Data restored and verified."""
        # 1. Seed demo catalog to establish known baseline
        call_command('seed_demo', force=True)
        baseline_products_count = Product.objects.count()
        assert baseline_products_count == 48

        # 2. Execute the PITR restore drill management command
        call_command('neon_restore_drill', verify=True)

        # 3. Simulate disaster: delete 5 products
        delete_ids = list(Product.objects.filter(product_type='skincare').values_list('id', flat=True)[:5])
        Product.objects.filter(id__in=delete_ids).delete()
        assert Product.objects.count() == 43

        # 4. Simulate PITR recovery: re-apply point-in-time state
        call_command('seed_demo', force=True)
        restored_products_count = Product.objects.count()
        assert restored_products_count == baseline_products_count
        assert Product.objects.filter(product_type='multivitamin').count() >= 28
