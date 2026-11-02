"""
Tests for Phase 8: Demo seed data, catalog balance, health compliance disclaimers, and purge.
Strictly zero emojis.
"""

import re

import pytest
from django.core.management import call_command

from accounts.models import User
from catalog.models import Product
from promotions.models import Coupon


@pytest.mark.django_db
def test_seed_demo_creates_required_catalog_balance():
    """Verify seed_demo generates 48 products with multivitamins as primary focus (>=28)."""
    call_command('seed_demo')

    total_products = Product.objects.count()
    assert total_products == 48

    multis = Product.objects.filter(product_type='multivitamin').count()
    skincare = Product.objects.filter(product_type='skincare').count()

    assert multis >= 28, f"Expected at least 28 multivitamins, found {multis}"
    assert skincare == 20, f"Expected 20 skincare products, found {skincare}"


@pytest.mark.django_db
def test_seed_demo_health_disclaimer_compliance():
    """All multivitamin products must carry the mandatory regulatory disclaimer."""
    call_command('seed_demo')

    expected_disclaimer = (
        "These statements have not been evaluated by a regulator. "
        "This product is not intended to diagnose, treat, cure or prevent any disease."
    )

    multivitamin_products = Product.objects.filter(product_type='multivitamin')
    assert multivitamin_products.exists()

    for product in multivitamin_products:
        assert expected_disclaimer in product.description, (
            f"Product {product.sku} missing mandatory health compliance disclaimer."
        )


@pytest.mark.django_db
def test_seed_demo_pkr_prices_and_no_emojis():
    """Prices must be whole-rupee integers and zero emojis in catalog text."""
    call_command('seed_demo')

    # Basic emoji pattern matching non-ASCII pictorial symbols
    emoji_pattern = re.compile(
        r'[\U00010000-\U0010ffff]',
        flags=re.UNICODE
    )

    for product in Product.objects.all():
        assert isinstance(product.price, int)
        assert product.price > 0
        if product.compare_at_price is not None:
            assert isinstance(product.compare_at_price, int)
            assert product.compare_at_price >= product.price

        assert not emoji_pattern.search(product.name), f"Emoji in name: {product.name}"
        assert not emoji_pattern.search(product.description), f"Emoji in desc: {product.name}"


@pytest.mark.django_db
def test_seed_demo_coupons_and_staff():
    """Verify demo coupons and staff user exist with expected attributes."""
    call_command('seed_demo')

    welcome_coupon = Coupon.objects.get(code='WELCOME10')
    assert welcome_coupon.type == 'percent'
    assert welcome_coupon.value == 10
    assert welcome_coupon.min_order_amount == 1500

    admin = User.objects.get(email='admin@supplivix.com')
    assert admin.is_staff is True
    assert admin.check_password('SupplivixAdmin2026!')


@pytest.mark.django_db
def test_purge_demo_cleans_products_safely():
    """Verify purge_demo cleans SPLV- products and retains admin unless specified."""
    call_command('seed_demo')
    assert Product.objects.filter(sku__startswith='SPLV-').count() == 48

    call_command('purge_demo')
    assert Product.objects.filter(sku__startswith='SPLV-').count() == 0
    # Admin still exists
    assert User.objects.filter(email='admin@supplivix.com').exists()
