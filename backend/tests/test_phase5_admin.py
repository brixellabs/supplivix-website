import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product, Review
from core.models import BlockedIP
from orders.models import Order


@pytest.fixture
def admin_client():
    client = APIClient()
    admin_user = User.objects.create_superuser(
        email='staff@supplivix.com',
        password='AdminPassword123!',
        full_name='Admin Staff',
    )
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def regular_client():
    client = APIClient()
    user = User.objects.create_user(
        email='customer@example.com',
        password='CustomerPassword123!',
        full_name='Ali Khan',
    )
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestPhase5AdminAPI:
    def test_admin_permissions_enforced(self, regular_client):
        # Regular customer must be forbidden
        url = reverse('admin-overview')
        res = regular_client.get(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_overview_kpis(self, admin_client):
        url = reverse('admin-overview')
        res = admin_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert 'total_revenue' in res.data
        assert 'total_orders_count' in res.data
        assert 'pending_dispatch_count' in res.data
        assert 'sales_timeline' in res.data

    def test_admin_product_management(self, admin_client):
        category = Category.objects.create(name='Vitamins', slug='vitamins')
        url = reverse('admin-products')

        # Create product
        payload = {
            'name': 'Supplivix Test Multi 30s',
            'slug': 'supplivix-test-multi-30s',
            'category_id': category.id,
            'product_type': 'multivitamin',
            'price': 1500,
            'inventory_count': 50,
        }
        res = admin_client.post(url, payload)
        assert res.status_code == status.HTTP_201_CREATED

        # List products
        res = admin_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['count'] >= 1

        product_id = res.data['results'][0]['id']

        # Patch product
        patch_url = reverse('admin-product-detail', kwargs={'pk': product_id})
        patch_res = admin_client.patch(patch_url, {'price': 1800, 'inventory_count': 60})
        assert patch_res.status_code == status.HTTP_200_OK

        updated = Product.objects.get(pk=product_id)
        assert updated.price == 1800
        assert updated.stock == 60

    def test_admin_product_csv_export(self, admin_client):
        url = reverse('admin-products-export-csv')
        res = admin_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res['Content-Type'] == 'text/csv'
        assert b'Price_PKR' in res.content

    def test_admin_order_transition(self, admin_client):
        order = Order.objects.create(
            number='SPLV-9999-9999',
            guest_email='buyer@example.com',
            shipping_address_snapshot={
                'full_name': 'Test Buyer',
                'phone': '+923001234567',
                'line1': 'Street 1, Lahore',
                'city': 'Lahore',
                'province': 'Punjab',
            },
            status='pending',
            subtotal=2500,
            grand_total=2500,
            payment_method='COD',
        )

        url = reverse('admin-order-transition', kwargs={'number': order.number})
        res = admin_client.post(url, {'status': 'confirmed', 'notes': 'Verified via call'})
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'confirmed'

        order.refresh_from_db()
        assert order.status == 'confirmed'

    def test_admin_customer_toggle_status(self, admin_client):
        customer = User.objects.create_user(
            email='blockeduser@example.com',
            password='TestPass123!',
            full_name='Target User',
        )
        assert customer.is_active is True

        url = reverse('admin-customer-toggle', kwargs={'pk': customer.id})
        res = admin_client.post(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['is_active'] is False

        customer.refresh_from_db()
        assert customer.is_active is False

    def test_admin_review_moderation(self, admin_client):
        category = Category.objects.create(name='Care', slug='care')
        product = Product.objects.create(
            name='Test Cream',
            slug='test-cream',
            category=category,
            price=1200,
            sku='TC-01',
        )
        review = Review.objects.create(
            product=product,
            rating=5,
            title='Good product',
            body='Loved the results',
            is_approved=False,
        )

        url = reverse('admin-review-moderate', kwargs={'pk': review.id})
        res = admin_client.post(url, {'approved': True})
        assert res.status_code == status.HTTP_200_OK

        review.refresh_from_db()
        assert review.is_approved is True

    def test_admin_security_unblock_ip(self, admin_client):
        BlockedIP.objects.create(ip='192.168.1.100', reason='Honeypot hit')
        assert BlockedIP.objects.filter(ip='192.168.1.100').exists()

        url = reverse('admin-security-unblock')
        res = admin_client.post(url, {'ip_address': '192.168.1.100'})
        assert res.status_code == status.HTTP_200_OK
        assert not BlockedIP.objects.filter(ip='192.168.1.100').exists()

    def test_admin_audit_logging(self, admin_client):
        from core.models import AdminAuditLog
        initial_count = AdminAuditLog.objects.count()

        url = reverse('admin-settings')
        res = admin_client.patch(url, {'free_shipping_threshold': 2500, 'site_mode': 'live'})
        assert res.status_code == status.HTTP_200_OK

        # Audit log must be recorded
        assert AdminAuditLog.objects.count() == initial_count + 1
        log = AdminAuditLog.objects.latest('created_at')
        assert log.action == 'update_site_settings'
        assert log.target_model == 'SiteSetting'
        assert log.user.email == 'staff@supplivix.com'

        # Query audit logs endpoint
        audit_url = reverse('admin-audit-logs')
        audit_res = admin_client.get(audit_url)
        assert audit_res.status_code == status.HTTP_200_OK
        assert audit_res.data['count'] >= 1

    def test_admin_settings_get_and_patch(self, admin_client):
        url = reverse('admin-settings')
        get_res = admin_client.get(url)
        assert get_res.status_code == status.HTTP_200_OK
        assert 'free_shipping_threshold' in get_res.data
        assert 'flat_shipping_fee' in get_res.data

        patch_res = admin_client.patch(url, {'flat_shipping_fee': 250})
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data['settings']['flat_shipping_fee'] == '250'

    def test_admin_bulk_status_update(self, admin_client):
        category = Category.objects.create(name='BulkCat', slug='bulk-cat')
        p1 = Product.objects.create(name='P1', slug='p1', sku='SKU-BULK-1', category=category, price=1000, is_active=True)
        p2 = Product.objects.create(name='P2', slug='p2', sku='SKU-BULK-2', category=category, price=2000, is_active=True)

        url = reverse('admin-products-bulk-status')
        res = admin_client.post(url, {'ids': [p1.id, p2.id], 'is_active': False}, format='json')
        assert res.status_code == status.HTTP_200_OK

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.is_active is False
        assert p2.is_active is False

    def test_admin_order_mark_cod_collected(self, admin_client):
        order = Order.objects.create(
            number='SPLV-COD-7777',
            guest_email='buyer7@example.com',
            shipping_address_snapshot={'full_name': 'Cash Buyer', 'phone': '+923007777777', 'city': 'Rawalpindi'},
            status='delivered',
            subtotal=3000,
            grand_total=3000,
            payment_method='COD',
        )
        url = reverse('admin-order-mark-cod-collected', kwargs={'number': order.number})
        res = admin_client.post(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['status'] == 'cod_collected'

        order.refresh_from_db()
        assert order.status == 'cod_collected'

    def test_admin_coupon_lifecycle(self, admin_client):
        gen_url = reverse('admin-coupon-generate-code')
        gen_res = admin_client.get(gen_url)
        assert gen_res.status_code == status.HTTP_200_OK
        assert 'code' in gen_res.data
        code = gen_res.data['code']

        create_url = reverse('admin-coupons')
        create_res = admin_client.post(create_url, {
            'code': code,
            'discount_type': 'percentage',
            'discount_value': 15,
            'min_order_amount': 1500,
        })
        assert create_res.status_code == status.HTTP_201_CREATED
        coupon_id = create_res.data['id']

        redemptions_url = reverse('admin-coupon-redemptions', kwargs={'pk': coupon_id})
        redemptions_res = admin_client.get(redemptions_url)
        assert redemptions_res.status_code == status.HTTP_200_OK
        assert redemptions_res.data['count'] == 0

    def test_admin_product_faq_management(self, admin_client):
        from catalog.models import ProductFAQ
        category = Category.objects.create(name='FAQCat', slug='faq-cat')
        product = Product.objects.create(name='FAQProduct', slug='faq-prod', sku='SKU-FAQ-PROD', category=category, price=1000)

        url = reverse('admin-product-faqs', kwargs={'pk': product.id})
        res = admin_client.post(url, {
            'question': 'How many tablets daily?',
            'answer': 'Take 1 tablet in the morning after breakfast.',
        })
        assert res.status_code == status.HTTP_201_CREATED
        faq_id = res.data['id']

        assert ProductFAQ.objects.filter(pk=faq_id, product=product).exists()

        # Delete FAQ
        del_url = reverse('admin-product-faq-detail', kwargs={'pk': product.id, 'faq_id': faq_id})
        del_res = admin_client.delete(del_url)
        assert del_res.status_code == status.HTTP_200_OK
        assert not ProductFAQ.objects.filter(pk=faq_id).exists()

    def test_admin_security_manual_block(self, admin_client):
        url = reverse('admin-security-block-ip')
        res = admin_client.post(url, {
            'ip': '203.0.113.42',
            'reason': 'Excessive checkout spamming',
            'hours': 48,
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert BlockedIP.objects.filter(ip='203.0.113.42').exists()

