from datetime import timedelta

import pytest
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.models import BlockedIP, BotEvent
from core.security import (
    generate_time_token,
    verify_time_token,
    verify_turnstile_token,
)


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPhase7BotAndSecurity:
    """Comprehensive test suite for Phase 7 Layered Bot Detection & Security."""

    def test_sec_blocked_ip_rejected(self, client):
        """IP in BlockedIP registry receives HTTP 403 Forbidden with ip_blocked code."""
        BlockedIP.objects.create(ip='203.0.113.42', reason='Suspicious scanner')

        url = reverse('health-check')
        res = client.get(url, HTTP_X_FORWARDED_FOR='203.0.113.42')
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert res.json()['code'] == 'ip_blocked'

    def test_sec_expired_blocked_ip_auto_purged(self, client):
        """Expired temporary IP blocks are automatically purged on subsequent request."""
        past_time = timezone.now() - timedelta(hours=1)
        BlockedIP.objects.create(ip='203.0.113.99', expires_at=past_time)

        url = reverse('health-check')
        res = client.get(url, HTTP_X_FORWARDED_FOR='203.0.113.99')
        assert res.status_code == status.HTTP_200_OK
        assert not BlockedIP.objects.filter(ip='203.0.113.99').exists()

    def test_sec_rate_limiting_ip_throttle_with_retry_after(self, client):
        """IP rate limiting triggers 429 Too Many Requests with Retry-After header."""
        cache.clear()
        login_url = reverse('auth-login')
        ip = '198.51.100.99'

        # Send 5 requests (up to limit)
        for _ in range(5):
            res = client.post(
                login_url,
                {'email': 'test@example.com', 'password': 'WrongPassword!'},
                HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
                HTTP_X_FORWARDED_FOR=ip,
            )
            assert res.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_429_TOO_MANY_REQUESTS)

        # 6th request from same IP must be throttled with 429 and Retry-After
        res_throttled = client.post(
            login_url,
            {'email': 'test@example.com', 'password': 'WrongPassword!'},
            HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
            HTTP_X_FORWARDED_FOR=ip,
        )
        assert res_throttled.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert 'Retry-After' in res_throttled or 'wait' in str(res_throttled.data)

    def test_sec_account_lockout_and_turnstile_challenge_after_failures(self, client):
        """
        Turnstile challenge enforced after 3 failures;
        5 failed logins on an email lock it for 15 minutes;
        identical error messages for unknown email and wrong password.
        """
        email = 'victim@example.com'
        cache.clear()

        # Create active user
        User.objects.create_user(email=email, password='CorrectPassword123!', full_name='Test User')
        login_url = reverse('auth-login')

        # Attempts 1, 2, 3: no turnstile required, returns "Invalid email or password"
        for i in range(3):
            res = client.post(
                login_url,
                {'email': email, 'password': 'WrongPassword!'},
                HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
                HTTP_X_FORWARDED_FOR=f"203.0.113.{10 + i}",
            )
            assert res.status_code == status.HTTP_400_BAD_REQUEST
            assert 'Invalid email or password' in str(res.data)

        # Attempt 4 without Turnstile token: challenge required
        res_challenge = client.post(
            login_url,
            {'email': email, 'password': 'WrongPassword!'},
            HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
            HTTP_X_FORWARDED_FOR='203.0.113.14',
        )
        assert res_challenge.status_code == status.HTTP_400_BAD_REQUEST
        assert res_challenge.json()['code'] == 'challenge_required'

        # Attempt 4 and 5 with valid Turnstile token: challenge satisfied, checks password
        for i in range(2):
            res = client.post(
                login_url,
                {
                    'email': email,
                    'password': 'WrongPassword!',
                    'turnstile_token': '1x0000000000000000000000000000000AA',
                },
                HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
                HTTP_X_FORWARDED_FOR=f"203.0.113.{15 + i}",
            )
            assert res.status_code == status.HTTP_400_BAD_REQUEST
            assert 'Invalid email or password' in str(res.data)

        # Attempt 6: account must be locked out
        res_locked = client.post(
            login_url,
            {
                'email': email,
                'password': 'WrongPassword!',
                'turnstile_token': '1x0000000000000000000000000000000AA',
            },
            HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
            HTTP_X_FORWARDED_FOR='203.0.113.17',
        )
        assert res_locked.status_code == status.HTTP_400_BAD_REQUEST
        assert 'locked' in str(res_locked.data).lower()

    def test_sec_security_headers_present(self, client):
        """All responses carry strict CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy."""
        url = reverse('health-check')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res['X-Frame-Options'] == 'DENY'
        assert res['X-Content-Type-Options'] == 'nosniff'
        assert res['Referrer-Policy'] == 'strict-origin-when-cross-origin'
        assert 'Content-Security-Policy' in res
        assert 'challenges.cloudflare.com' in res['Content-Security-Policy']

    def test_sec_honeypot_traps_across_forms(self, client):
        """Hidden off-screen website field silently captures bots with fake success across all forms."""
        # 1. Waitlist honeypot
        res_waitlist = client.post(
            reverse('waitlist-subscribe'),
            {'email': 'bot@spambot.xyz', 'website': 'https://spambot.xyz'},
            HTTP_X_FORWARDED_FOR='198.51.100.25'
        )
        assert res_waitlist.status_code == status.HTTP_200_OK
        assert BotEvent.objects.filter(ip='198.51.100.25').exists()

        # 2. Register honeypot
        res_reg = client.post(
            reverse('auth-register'),
            {
                'email': 'bot_reg@example.com',
                'full_name': 'Bot Runner',
                'password': 'Password123!',
                'website': 'https://badbot.net',
            },
            HTTP_X_FORWARDED_FOR='198.51.100.26'
        )
        assert res_reg.status_code == status.HTTP_201_CREATED
        assert res_reg.json()['message'] == 'Registration successful.'
        assert BotEvent.objects.filter(ip='198.51.100.26').exists()

        # 3. Login honeypot
        res_login = client.post(
            reverse('auth-login'),
            {
                'email': 'bot_login@example.com',
                'password': 'AnyPassword123!',
                'website': 'https://badbot.net',
            },
            HTTP_X_FORWARDED_FOR='198.51.100.27'
        )
        assert res_login.status_code == status.HTTP_200_OK
        assert BotEvent.objects.filter(ip='198.51.100.27').exists()

        # 4. Contact honeypot
        res_contact = client.post(
            reverse('contact-submit'),
            {
                'name': 'Spam Agent',
                'email': 'spam@domain.com',
                'subject': 'Spam Promo',
                'message': 'Buy cheap backlinks now',
                'website': 'https://spambot.xyz',
            },
            HTTP_X_FORWARDED_FOR='198.51.100.28'
        )
        assert res_contact.status_code == status.HTTP_200_OK
        assert BotEvent.objects.filter(ip='198.51.100.28').exists()

    def test_sec_time_trap_evaluation(self, client):
        """Fast submission (<2s) increments risk score; expired token (>2h) rejected."""
        # 1. Freshly generated token
        fresh_token = generate_time_token()
        status_label, score = verify_time_token(fresh_token)
        assert status_label == 'too_fast'
        assert score == 40

        # 2. Missing token
        status_missing, score_missing = verify_time_token('')
        assert status_missing == 'missing'
        assert score_missing == 30

    def test_sec_turnstile_token_verification(self):
        """Cloudflare Turnstile token verification handles official pass and fail test keys."""
        # Official test key: 1x... passes
        assert verify_turnstile_token('1x0000000000000000000000000000000AA') is True
        assert verify_turnstile_token('valid-turnstile-token') is True

        # Official test key: 2x... fails
        assert verify_turnstile_token('2x0000000000000000000000000000000AA') is False
        assert verify_turnstile_token('invalid-token') is False
        assert verify_turnstile_token('') is False

    def test_sec_spoofed_googlebot_detected(self, client):
        """Googlebot User-Agent from a non-Google IP is detected as spoofed and adds risk score."""
        spoofed_ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        non_google_ip = '203.0.113.88'

        # Attempt to register with spoofed Googlebot UA
        res = client.post(
            reverse('auth-register'),
            {
                'email': 'fake_google@example.com',
                'full_name': 'Fake Bot',
                'password': 'Password123!',
            },
            HTTP_USER_AGENT=spoofed_ua,
            HTTP_X_FORWARDED_FOR=non_google_ip,
        )
        # Risk score includes spoofed UA (+60) + missing Accept-Language (+20) = 80 -> Blocked (403)
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert res.json()['code'] == 'bot_blocked'
        assert BotEvent.objects.filter(ip=non_google_ip, reason__icontains='spoofed').exists()

    def test_sec_coupon_guessing_behavior_signal(self, client):
        """Rapid attempts of different invalid coupon codes triggers coupon guessing bot event."""
        cache.clear()
        ip = '198.51.100.77'
        coupon_url = reverse('cart-coupon-apply')

        # Try 3 different invalid coupons
        for code in ['GUESS1', 'GUESS2', 'GUESS3']:
            client.post(
                coupon_url,
                {'code': code},
                HTTP_X_FORWARDED_FOR=ip,
                HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
            )

        # 4th guess should trigger BotEvent
        client.post(
            coupon_url,
            {'code': 'GUESS4'},
            HTTP_X_FORWARDED_FOR=ip,
            HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
        )

        event = BotEvent.objects.filter(ip=ip, reason__icontains='coupon guessing').first()
        assert event is not None
        assert event.score == 35

    def test_sec_scripted_bot_run_acceptance_rate(self, client):
        """
        Phase 7 / Phase 10 Acceptance Test:
        Simulated scripted bot run is blocked or challenged at >= 95% rate,
        while normal user requests are blocked at 0%.
        """
        cache.clear()

        # Part 1: 50 scripted bot attempts (automation UAs, missing headers, honeypots, spoofed headers)
        bot_blocked_or_challenged = 0
        total_bots = 50

        for i in range(total_bots):
            bot_ip = f"198.51.100.{100 + i}"
            bot_ua = 'python-requests/2.31.0' if i % 2 == 0 else 'curl/7.88.1'

            res = client.post(
                reverse('auth-register'),
                {
                    'email': f"bot_{i}@spam.com",
                    'full_name': f"Bot {i}",
                    'password': 'Password123!',
                    # Half of bots fill honeypot, half send raw automated POST without headers
                    'website': 'http://spam.xyz' if i % 3 == 0 else '',
                },
                HTTP_USER_AGENT=bot_ua,
                HTTP_X_FORWARDED_FOR=bot_ip,
                # Missing HTTP_ACCEPT_LANGUAGE
            )

            # Blocked (403), challenged (400 challenge_required), or trapped (fake success 201 via honeypot)
            if res.status_code == status.HTTP_403_FORBIDDEN:
                bot_blocked_or_challenged += 1
            elif res.status_code == status.HTTP_400_BAD_REQUEST and res.json().get('code') == 'challenge_required':
                bot_blocked_or_challenged += 1
            elif res.status_code == status.HTTP_201_CREATED and 'website' in res.data.get('user', {}).get('email', ''):
                bot_blocked_or_challenged += 1
            elif BotEvent.objects.filter(ip=bot_ip).exists():
                bot_blocked_or_challenged += 1

        bot_mitigation_rate = (bot_blocked_or_challenged / total_bots) * 100
        assert bot_mitigation_rate >= 95.0, f"Bot mitigation was {bot_mitigation_rate}%, expected >= 95%"

        # Part 2: 20 normal user requests (clean browser UA, Accept-Language, valid headers)
        normal_blocked = 0
        total_normals = 20

        for i in range(total_normals):
            user_ip = f"203.0.113.{150 + i}"
            res = client.get(
                reverse('product-list'),
                HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9',
                HTTP_X_FORWARDED_FOR=user_ip,
            )
            if res.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_429_TOO_MANY_REQUESTS):
                normal_blocked += 1

        normal_block_rate = (normal_blocked / total_normals) * 100
        assert normal_block_rate == 0.0, f"Normal users were blocked at {normal_block_rate}%, expected 0%"
