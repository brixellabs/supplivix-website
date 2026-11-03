from django.conf import settings
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.security import evaluate_risk, generate_time_token

from .models import SiteSetting, WaitlistEntry
from .serializers import ContactMessageSerializer, WaitlistSerializer


class WaitlistView(APIView):
    """Subscribe email to the coming soon waitlist."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'waitlist'

    def post(self, request):
        action, score = evaluate_risk(request)
        if action == 'honeypot_fake_success':
            return Response(
                {'message': 'Thank you for joining the waitlist! We will notify you at launch.'},
                status=status.HTTP_200_OK
            )
        if action == 'token_expired':
            return Response(
                {'code': 'token_expired', 'message': 'Form session expired. Please refresh and try again.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'block':
            return Response(
                {'code': 'bot_blocked', 'message': 'Access denied due to automated activity detection.', 'fields': {}},
                status=status.HTTP_403_FORBIDDEN
            )
        if action == 'challenge_required':
            return Response(
                {
                    'code': 'challenge_required',
                    'message': 'Security verification challenge required. Please complete Cloudflare Turnstile.',
                    'fields': {'turnstile_token': ['Turnstile challenge required.']}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return Response(
                {'code': 'invalid_email', 'message': 'Please provide a valid email address.', 'fields': {'email': ['Invalid email.']}},
                status=status.HTTP_400_BAD_REQUEST
            )

        existing = WaitlistEntry.objects.filter(email=email).first()
        if existing:
            return Response(
                {'message': 'You are already on the list! We will notify you at launch.'},
                status=status.HTTP_200_OK
            )

        serializer = WaitlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(email=email)

        return Response(
            {'message': 'Thank you for joining the waitlist! We will notify you at launch.'},
            status=status.HTTP_201_CREATED
        )


class ContactView(APIView):
    """Submit customer support or inquiry message."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'contact'

    def post(self, request):
        action, score = evaluate_risk(request)
        if action == 'honeypot_fake_success':
            return Response(
                {'message': 'Thank you for contacting Supplivix. Our team will get back to you shortly.'},
                status=status.HTTP_200_OK
            )
        if action == 'token_expired':
            return Response(
                {'code': 'token_expired', 'message': 'Form session expired. Please refresh and try again.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'block':
            return Response(
                {'code': 'bot_blocked', 'message': 'Access denied due to automated activity detection.', 'fields': {}},
                status=status.HTTP_403_FORBIDDEN
            )
        if action == 'challenge_required':
            return Response(
                {
                    'code': 'challenge_required',
                    'message': 'Security verification challenge required. Please complete Cloudflare Turnstile.',
                    'fields': {'turnstile_token': ['Turnstile challenge required.']}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'Thank you for contacting Supplivix. Our team will get back to you shortly.'},
            status=status.HTTP_201_CREATED
        )


class SecurityTokenView(APIView):
    """Provide signed form timestamp and Turnstile public site key for frontend forms."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                'time_token': generate_time_token(),
                'turnstile_site_key': getattr(settings, 'TURNSTILE_SITE_KEY', '1x00000000000000000000AA'),
            },
            status=status.HTTP_200_OK
        )


class PublicSettingsView(APIView):
    """Retrieve public configuration (shipping rules, site mode, contact details)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached_settings = cache.get("public_settings_cache")
        if cached_settings:
            return Response(cached_settings, status=status.HTTP_200_OK)

        settings_dict = {
            'site_mode': SiteSetting.get_setting('site_mode', 'live'),
            'launch_date': SiteSetting.get_setting('launch_date', '2026-12-01T00:00:00Z'),
            'free_shipping_threshold': SiteSetting.get_int('free_shipping_threshold', 2000),
            'flat_shipping_fee': SiteSetting.get_int('flat_shipping_fee', 200),
            'store_phone': SiteSetting.get_setting('store_phone', '0300-0000000'),
            'store_email': SiteSetting.get_setting('store_email', 'info@supplivix.com'),
        }
        cache.set("public_settings_cache", settings_dict, timeout=300)
        return Response(settings_dict, status=status.HTTP_200_OK)
