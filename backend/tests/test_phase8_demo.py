"""
Tests for Phase 8: Demo seed data, catalog balance, health compliance disclaimers, original images, and purge.
Strictly zero emojis.
"""

import os
import re

import pytest
from django.conf import settings
from django.core.management import CommandError, call_command

from accounts.models import Address, User
from catalog.models import Product
from orders.models import Order
from promotions.models import Coupon


@pytest.mark.django_db
def test_seed_demo_creates_required_catalog_balance():
    """Verify seed_demo generates 48 products with multivitamins as primary focus (>=28)."""
    call_command('seed_demo', force=True)

    total_products = Product.objects.count()
    assert total_products == 48

    multis = Product.objects.filter(product_type='multivitamin').count()
    skincare = Product.objects.filter(product_type='skincare').count()

    assert multis >= 28, f"Expected at least 28 multivitamins, found {multis}"
    assert skincare == 20, f"Expected 20 skincare products, found {skincare}"


@pytest.mark.django_db
def test_seed_demo_health_disclaimer_compliance():
    """All multivitamin products must carry the mandatory regulatory disclaimer."""
    call_command('seed_demo', force=True)

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
    call_command('seed_demo', force=True)

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
    call_command('seed_demo', force=True)

    welcome_coupon = Coupon.objects.get(code='WELCOME10')
    assert welcome_coupon.type == 'percent'
    assert welcome_coupon.value == 10
    assert welcome_coupon.min_order_amount == 1500

    admin = User.objects.get(email='admin@supplivix.com')
    assert admin.is_staff is True
    assert admin.check_password('SupplivixAdmin2026!')


@pytest.mark.django_db
def test_seed_demo_refuses_when_debug_false_without_force(monkeypatch):
    """Refuses to run in production (DEBUG=False) unless --force is passed."""
    monkeypatch.setattr(settings, 'DEBUG', False)
    with pytest.raises(CommandError) as exc_info:
        call_command('seed_demo')
    assert '--force' in str(exc_info.value)

    # Passes when --force is supplied
    call_command('seed_demo', force=True)
    assert Product.objects.count() == 48


@pytest.mark.django_db
def test_seed_demo_idempotence():
    """Repeated runs must be idempotent and produce identical record counts."""
    call_command('seed_demo', force=True)
    first_count = Product.objects.count()
    first_users = User.objects.count()
    first_orders = Order.objects.count()

    call_command('seed_demo', force=True)
    assert Product.objects.count() == first_count == 48
    assert User.objects.count() == first_users
    assert Order.objects.count() == first_orders


@pytest.mark.django_db
def test_seed_demo_populates_users_addresses_and_orders():
    """Verify 20 demo users, 3 saved addresses, and 30 COD orders across all 5 statuses."""
    call_command('seed_demo', force=True)

    demo_users = User.objects.filter(email__startswith='demo+')
    assert demo_users.count() == 20

    addresses = Address.objects.filter(user=demo_users.first())
    assert addresses.count() == 3

    orders = Order.objects.filter(number__startswith='ORD-')
    assert orders.count() == 30
    assert all(o.payment_method == 'COD' for o in orders)

    # All 5 core order statuses represented
    statuses = set(orders.values_list('status', flat=True))
    assert {'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'}.issubset(statuses)


@pytest.mark.django_db
def test_seed_demo_populates_attributes_faqs_and_reviews():
    """Every product must have attributes, 3-5 FAQs, and approved reviews."""
    call_command('seed_demo', force=True)

    for product in Product.objects.all():
        assert product.attributes.exists(), f"Product {product.sku} has no attributes"
        faq_count = product.faqs.count()
        assert 3 <= faq_count <= 5, f"Product {product.sku} has {faq_count} FAQs, expected 3-5"
        review_count = product.reviews.count()
        assert review_count >= 6, f"Product {product.sku} has {review_count} reviews, expected >= 6"
        assert all(r.is_approved for r in product.reviews.all())


@pytest.mark.django_db
def test_seed_demo_original_svg_and_fallback_images():
    """Every product must have 3 original SVG images with demo- prefix and meaningful alt text."""
    call_command('seed_demo', force=True)

    frontend_demo_dir = os.path.abspath(
        os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'demo')
    )
    assert os.path.exists(frontend_demo_dir)

    for product in Product.objects.all():
        images = list(product.images.order_by('sort_order'))
        assert len(images) == 3, f"Product {product.sku} has {len(images)} images, expected 3"
        for img in images:
            assert 'demo-' in str(img.image)
            assert img.alt_text and len(img.alt_text) > 5


@pytest.mark.django_db
def test_purge_demo_cleans_products_orders_users_and_images():
    """Verify purge_demo cleans SPLV- products, demo orders, demo users, demo images, leaving operational store."""
    call_command('seed_demo', force=True)
    assert Product.objects.filter(sku__startswith='SPLV-').count() == 48
    assert Order.objects.filter(number__startswith='ORD-').count() == 30

    call_command('purge_demo')
    assert Product.objects.filter(sku__startswith='SPLV-').count() == 0
    assert Order.objects.filter(number__startswith='ORD-').count() == 0
    assert User.objects.filter(email__startswith='demo+').count() == 0

    # Admin still exists
    assert User.objects.filter(email='admin@supplivix.com').exists()
    # Store settings intact
    from content.models import SiteSetting
    assert SiteSetting.objects.filter(id=1).exists()
