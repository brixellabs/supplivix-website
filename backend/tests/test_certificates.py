import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from content.models import Certificate

User = get_user_model()

@pytest.mark.django_db
class TestCertificateSuite:
    def setup_method(self):
        self.staff_user = User.objects.create_user(
            email='admin_cert@supplivix.pk',
            password='TestPassword123!',
            is_staff=True,
            full_name='Admin User',
        )
        self.regular_user = User.objects.create_user(
            email='customer_cert@supplivix.pk',
            password='TestPassword123!',
            is_staff=False,
            full_name='Customer User',
        )

        # Create two sample certificates
        self.cert1 = Certificate.objects.create(
            name='GMP Certified',
            badge_code='gmp',
            subtitle='Good Manufacturing Practice',
            issuer='WHO / cGMP Standard',
            description='Strict GMP compliance for dietary supplements.',
            sort_order=1,
            is_active=True,
        )
        self.cert2 = Certificate.objects.create(
            name='Draft Inactive Cert',
            badge_code='draft',
            subtitle='Internal testing only',
            issuer='Internal QA',
            description='Not yet active on store.',
            sort_order=2,
            is_active=False,
        )

    def test_public_certificate_list_returns_active_only(self, client):
        res = client.get('/api/v1/certificates/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert isinstance(data, list)
        names = [c['name'] for c in data]
        assert 'GMP Certified' in names
        assert 'Draft Inactive Cert' not in names

    def test_admin_certificate_list_forbidden_for_non_staff(self, client):
        client.force_login(self.regular_user)
        res = client.get('/api/v1/admin/certificates/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_certificate_list_returns_all_for_staff(self, client):
        client.force_login(self.staff_user)
        res = client.get('/api/v1/admin/certificates/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert 'results' in data
        assert data['count'] >= 2
        names = [c['name'] for c in data['results']]
        assert 'GMP Certified' in names
        assert 'Draft Inactive Cert' in names

    def test_admin_create_certificate(self, client):
        client.force_login(self.staff_user)
        payload = {
            'name': 'ISO 22000 Food Safety',
            'badge_code': 'iso-22000',
            'subtitle': 'Food Safety Management',
            'issuer': 'SGS International',
            'description': 'Comprehensive food safety throughout supply chain.',
            'sort_order': 10,
            'is_active': True,
        }
        res = client.post('/api/v1/admin/certificates/', payload, content_type='application/json')
        assert res.status_code == status.HTTP_201_CREATED
        assert Certificate.objects.filter(badge_code='iso-22000').exists()

    def test_admin_update_certificate(self, client):
        client.force_login(self.staff_user)
        payload = {
            'subtitle': 'Updated WHO GMP Global Standard',
            'sort_order': 99,
        }
        res = client.patch(
            f'/api/v1/admin/certificates/{self.cert1.id}/',
            payload,
            content_type='application/json'
        )
        assert res.status_code == status.HTTP_200_OK
        self.cert1.refresh_from_db()
        assert self.cert1.subtitle == 'Updated WHO GMP Global Standard'
        assert self.cert1.sort_order == 99

    def test_admin_delete_certificate(self, client):
        client.force_login(self.staff_user)
        cert_id = self.cert2.id
        res = client.delete(f'/api/v1/admin/certificates/{cert_id}/')
        assert res.status_code == status.HTTP_200_OK
        assert not Certificate.objects.filter(id=cert_id).exists()
