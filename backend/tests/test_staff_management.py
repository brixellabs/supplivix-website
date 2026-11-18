import pytest
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestStaffManagementSuite:
    def setup_method(self):
        self.super_admin = User.objects.create_superuser(
            email='superadmin@supplivix.pk',
            password='SuperPassword2026!',
            full_name='Owner Superadmin',
        )
        self.regular_customer = User.objects.create_user(
            email='regular@supplivix.pk',
            password='CustomerPass123!',
            full_name='Regular Customer',
            is_staff=False,
        )
        self.support_staff = User.objects.create_user(
            email='support@supplivix.pk',
            password='StaffPass123!',
            full_name='Support Agent',
            is_staff=True,
            staff_role='Order Fulfillment & Support',
            staff_permissions=['orders', 'messages', 'customers'],
        )

    def test_customer_cannot_access_staff_api(self, client):
        client.force_login(self.regular_customer)
        res = client.get('/api/v1/admin/staff/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_limited_staff_cannot_access_staff_management_api(self, client):
        client.force_login(self.support_staff)
        res = client.get('/api/v1/admin/staff/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_can_list_staff(self, client):
        client.force_login(self.super_admin)
        res = client.get('/api/v1/admin/staff/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert 'results' in data
        assert data['count'] >= 2

    def test_superadmin_can_register_new_staff_member(self, client):
        client.force_login(self.super_admin)
        payload = {
            'full_name': 'Ali Raza',
            'email': 'ali.catalog@supplivix.pk',
            'phone': '03009876543',
            'password': 'SecureStaffPass2026!',
            'staff_role': 'Catalog Specialist',
            'staff_permissions': ['products', 'categories', 'certificates'],
        }
        res = client.post('/api/v1/admin/staff/', payload, content_type='application/json')
        assert res.status_code == status.HTTP_201_CREATED
        new_staff = User.objects.get(email='ali.catalog@supplivix.pk')
        assert new_staff.is_staff is True
        assert new_staff.staff_role == 'Catalog Specialist'
        assert new_staff.staff_permissions == ['products', 'categories', 'certificates']
        assert new_staff.has_staff_perm('products') is True
        assert new_staff.has_staff_perm('orders') is False

    def test_superadmin_can_update_staff_and_toggle_active(self, client):
        client.force_login(self.super_admin)
        # Update role and permissions
        payload = {
            'staff_role': 'Senior Fulfillment Manager',
            'staff_permissions': ['orders', 'messages', 'customers', 'coupons'],
            'is_active': False,
        }
        res = client.patch(f'/api/v1/admin/staff/{self.support_staff.id}/', payload, content_type='application/json')
        assert res.status_code == status.HTTP_200_OK
        self.support_staff.refresh_from_db()
        assert self.support_staff.staff_role == 'Senior Fulfillment Manager'
        assert self.support_staff.is_active is False
        assert 'coupons' in self.support_staff.staff_permissions

    def test_staff_cannot_delete_themselves(self, client):
        client.force_login(self.super_admin)
        res = client.delete(f'/api/v1/admin/staff/{self.super_admin.id}/')
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_superadmin_can_delete_staff_member(self, client):
        client.force_login(self.super_admin)
        target_id = self.support_staff.id
        res = client.delete(f'/api/v1/admin/staff/{target_id}/')
        assert res.status_code == status.HTTP_200_OK
        assert not User.objects.filter(id=target_id).exists()

