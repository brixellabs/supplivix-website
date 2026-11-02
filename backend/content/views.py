from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.middleware import BotProtectionMiddleware
from core.models import BotEvent

from .models import SiteSetting, WaitlistEntry
from .serializers import ContactMessageSerializer, WaitlistSerializer


class WaitlistView(APIView):
    """Subscribe email to the coming soon waitlist."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'waitlist'

    def post(self, request):
        honeypot = request.data.get('website') or request.data.get('company_name')
        if honeypot:
            ip = BotProtectionMiddleware.get_client_ip(request)
            BotEvent.objects.create(
                ip=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                path=request.path,
                reason='Honeypot triggered on waitlist submission',
                score=100
            )
            return Response(
                {'message': 'Thank you for joining the waitlist! We will notify you at launch.'},
                status=status.HTTP_200_OK
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
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'Thank you for contacting Supplivix. Our team will get back to you shortly.'},
            status=status.HTTP_201_CREATED
        )


class PublicSettingsView(APIView):
    """Retrieve public configuration (shipping rules, site mode, contact details)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings_dict = {
            'site_mode': SiteSetting.get_setting('site_mode', 'live'),
            'launch_date': SiteSetting.get_setting('launch_date', '2026-12-01T00:00:00Z'),
            'free_shipping_threshold': SiteSetting.get_int('free_shipping_threshold', 2000),
            'flat_shipping_fee': SiteSetting.get_int('flat_shipping_fee', 200),
            'store_phone': SiteSetting.get_setting('store_phone', '0300-0000000'),
            'store_email': SiteSetting.get_setting('store_email', 'info@supplivix.com'),
        }
        return Response(settings_dict, status=status.HTTP_200_OK)
