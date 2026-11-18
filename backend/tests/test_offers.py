import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from promotions.models import Offer
from catalog.models import Category, Product

User = get_user_model()

@pytest.mark.django_db
class TestOfferSuite:
    def setup_method(self):
        self.staff_user = User.objects.create_user(
            email='admin_offer@supplivix.pk',
            password='TestPassword123!',
            is_staff=True,
            full_name='Admin User',
        )
        self.regular_user = User.objects.create_user(
            email='customer_offer@supplivix.pk',
            password='TestPassword123!',
            is_staff=False,
            full_name='Customer User',
        )

        category, _ = Category.objects.get_or_create(
            slug='multivitamins',
            defaults=dict(name='Multivitamins')
        )
        self.sample_product = Product.objects.create(
            name='Supplivix Test Multi 60s',
            slug='supplivix-test-multi-60s',
            category=category,
            price=2500,
            compare_at_price=3000,
            sku='TEST-MULTI-60',
            stock=50,
            is_active=True,
        )

        # Active Offer created by admin
        self.offer1 = Offer.objects.create(
            title='Weekend Mega Multi Offer',
            badge='20% OFF',
            product=self.sample_product,
            price=2000,
            original_price=2500,
            discount_percentage=20,
            button_text='Claim Deal',
            is_active=True,
        )

        # Inactive Offer (Draft)
        self.offer2 = Offer.objects.create(
            title='Draft Holiday Bundle',
            badge='Coming Soon',
            price=4500,
            original_price=5500,
            is_active=False,
        )

    def test_public_offers_returns_active_only(self, client):
        res = client.get('/api/v1/offers/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert 'results' in data
        titles = [o['title'] for o in data['results']]
        assert 'Weekend Mega Multi Offer' in titles
        assert 'Draft Holiday Bundle' not in titles

    def test_admin_offers_forbidden_for_non_staff(self, client):
        client.force_login(self.regular_user)
        res = client.get('/api/v1/admin/offers/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_offers_returns_all_for_staff(self, client):
        client.force_login(self.staff_user)
        res = client.get('/api/v1/admin/offers/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data['count'] >= 2
        titles = [o['title'] for o in data['results']]
        assert 'Weekend Mega Multi Offer' in titles
        assert 'Draft Holiday Bundle' in titles

    def test_admin_create_offer(self, client):
        client.force_login(self.staff_user)
        payload = {
            'title': 'Flash Glow Deal',
            'badge': 'Hot Deal',
            'product_id': self.sample_product.id,
            'price': 1799,
            'original_price': 2500,
            'description': 'Save Rs. 700 for a limited time.',
            'button_text': 'Order Now',
            'is_active': True,
        }
        res = client.post('/api/v1/admin/offers/', data=payload)
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data['title'] == 'Flash Glow Deal'
        assert data['price'] == 1799
        assert Offer.objects.filter(title='Flash Glow Deal').exists()

    def test_admin_update_and_toggle_offer(self, client):
        client.force_login(self.staff_user)
        res = client.patch(
            f'/api/v1/admin/offers/{self.offer1.id}/',
            data={'is_active': False, 'price': 1850},
            content_type='application/json'
        )
        assert res.status_code == status.HTTP_200_OK
        self.offer1.refresh_from_db()
        assert self.offer1.is_active is False
        assert self.offer1.price == 1850

    def test_admin_delete_offer(self, client):
        client.force_login(self.staff_user)
        res = client.delete(f'/api/v1/admin/offers/{self.offer2.id}/')
        assert res.status_code == status.HTTP_200_OK
        assert not Offer.objects.filter(pk=self.offer2.id).exists()
