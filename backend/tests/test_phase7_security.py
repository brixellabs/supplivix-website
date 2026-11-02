import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.models import BlockedIP, BotEvent


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPhase7BotAndSecurity:
    def test_sec_blocked_ip_rejected(self, client):
        BlockedIP.objects.create(ip='203.0.113.42', reason='Suspicious scanner')

        url = reverse('health-check')
        res = client.get(url, HTTP_X_FORWARDED_FOR='203.0.113.42')
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert res.json()['code'] == 'ip_blocked'

    def test_sec_expired_blocked_ip_auto_purged(self, client):
        past_time = timezone.now() - timezone.timedelta(hours=1)
        BlockedIP.objects.create(ip='203.0.113.99', expires_at=past_time)

        url = reverse('health-check')
        res = client.get(url, HTTP_X_FORWARDED_FOR='203.0.113.99')
        assert res.status_code == status.HTTP_200_OK
        assert not BlockedIP.objects.filter(ip='203.0.113.99').exists()

    def test_sec_account_lockout_after_5_failed_logins(self, client):
        email = 'victim@example.com'
        cache.clear()

        # Create active user
        User.objects.create_user(email=email, password='CorrectPassword123!', full_name='Test')

        login_url = reverse('auth-login')

        # 5 failed attempts
        for _ in range(5):
            res = client.post(login_url, {'email': email, 'password': 'WrongPassword!'})
            assert res.status_code == status.HTTP_400_BAD_REQUEST
            assert 'Invalid email or password' in str(res.data)

        # 6th attempt must be locked out
        res = client.post(login_url, {'email': email, 'password': 'WrongPassword!'})
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert 'locked' in str(res.data).lower()

    def test_sec_security_headers_present(self, client):
        url = reverse('health-check')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res['X-Frame-Options'] == 'DENY'
        assert res['X-Content-Type-Options'] == 'nosniff'

    def test_sec_honeypot_trap_logs_bot_event(self, client):
        url = reverse('waitlist-subscribe')
        res = client.post(url, {
            'email': 'bot@example.com',
            'website': 'https://spambot.xyz',  # Hidden honeypot field
        }, HTTP_X_FORWARDED_FOR='198.51.100.25')

        # Honeypot silently drops or rejects
        assert res.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

        # Verify BotEvent was logged
        event = BotEvent.objects.filter(ip='198.51.100.25').first()
        assert event is not None
        assert 'honeypot' in event.reason.lower()
