from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.security import evaluate_risk, generate_time_token

from .models import Certificate, HeroSlide, SiteSetting, WaitlistEntry
from .serializers import CertificateSerializer, ContactMessageSerializer, WaitlistSerializer


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
    """Retrieve public configuration (shipping rules, site mode, contact details, returns policy)."""

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
            'announcement_bar_enabled': SiteSetting.get_setting('announcement_bar_enabled', 'true').strip().lower() in ['true', '1', 'yes'],
            'announcement_text_primary': SiteSetting.get_setting('announcement_text_primary', 'Free delivery on orders above Rs. 2,000'),
            'announcement_text_secondary': SiteSetting.get_setting('announcement_text_secondary', 'Cash on Delivery (COD) Across Pakistan'),
            'store_phone': SiteSetting.get_setting('store_phone', '0302-5222405'),
            'store_email': SiteSetting.get_setting('store_email', 'supplivix@gmail.com'),
            'instagram_url': SiteSetting.get_setting('instagram_url', 'https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2'),
            'facebook_url': SiteSetting.get_setting('facebook_url', 'https://facebook.com'),
            'deals_enabled': SiteSetting.get_setting('deals_enabled', 'true').strip().lower() in ['true', '1', 'yes'],
            'deal_banner_1_badge': SiteSetting.get_setting('deal_banner_1_badge', 'Special Bundle'),
            'deal_banner_1_title': SiteSetting.get_setting('deal_banner_1_title', 'Complete Daily Glow Duo'),
            'deal_banner_1_desc': SiteSetting.get_setting(
                'deal_banner_1_desc',
                'Pair our daily multivitamin with pure clarifying serum for comprehensive internal nutrition and external skin radiance.'
            ),
            'deal_banner_1_price': SiteSetting.get_setting('deal_banner_1_price', '3499'),
            'deal_banner_1_original_price': SiteSetting.get_setting('deal_banner_1_original_price', '4350'),
            'deal_banner_1_button_text': SiteSetting.get_setting('deal_banner_1_button_text', 'Shop The Duo'),
            'deal_banner_1_link': SiteSetting.get_setting('deal_banner_1_link', '/shop?bundle=glow-duo'),
            'deal_banner_2_badge': SiteSetting.get_setting('deal_banner_2_badge', 'Family Pack'),
            'deal_banner_2_title': SiteSetting.get_setting('deal_banner_2_title', '3-Month Wellness Supply'),
            'deal_banner_2_desc': SiteSetting.get_setting(
                'deal_banner_2_desc',
                'Ensure daily vitamin consistency with our bulk family package. Includes free nationwide COD shipping.'
            ),
            'deal_banner_2_highlight': SiteSetting.get_setting('deal_banner_2_highlight', 'Free Nationwide Delivery'),
            'deal_banner_2_button_text': SiteSetting.get_setting('deal_banner_2_button_text', 'View Family Pack'),
            'deal_banner_2_link': SiteSetting.get_setting('deal_banner_2_link', '/multivitamins'),
        }
        cache.set("public_settings_cache", settings_dict, timeout=300)
        return Response(settings_dict, status=status.HTTP_200_OK)


class CertificateListView(APIView):
    """Public endpoint to list verified active certificates."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        certs = Certificate.objects.filter(is_active=True).order_by('sort_order', 'id')
        serializer = CertificateSerializer(certs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicOfferView(APIView):
    """Public endpoint to list active admin-configured offers."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from promotions.models import Offer
        offers = Offer.objects.filter(is_active=True).select_related('product', 'product__category')
        results = [o.to_dict(request) for o in offers]
        return Response({'count': len(results), 'results': results}, status=status.HTTP_200_OK)


class PublicActiveSaleEventView(APIView):
    """Public endpoint returning the highest-priority active sale event for the homepage banner and countdown."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from promotions.services import PricingService
        now = timezone.now()
        events = PricingService.get_active_events(now=now)
        if not events:
            return Response({'has_active_event': False, 'event': None})
        top_event = events[0]
        return Response({'has_active_event': True, 'event': top_event.to_dict(request)})


class PublicSaleEventDetailView(APIView):
    """Public endpoint returning a specific sale event by slug and its eligible products."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        from promotions.models import SaleEvent
        from promotions.services import PricingService
        from catalog.models import Product
        from catalog.serializers import ProductListSerializer

        event = SaleEvent.objects.filter(slug=slug, deleted_at__isnull=True).prefetch_related('items').first()
        if not event:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        products = list(Product.objects.filter(is_active=True).select_related('category').prefetch_related('images'))
        eligible = [p for p in products if PricingService.is_product_eligible(event, p)]
        PricingService.batch_annotate_products(eligible)
        serializer = ProductListSerializer(eligible, many=True, context={'request': request})

        return Response({
            'event': event.to_dict(request),
            'count': len(eligible),
            'products': serializer.data,
        })


class PublicHeroSlideListView(APIView):
    """Public endpoint returning active hero slides ordered by sort_order."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        slides = HeroSlide.objects.filter(is_active=True).order_by('sort_order', 'id')
        results = [s.to_dict(request) for s in slides]
        return Response({'count': len(results), 'results': results}, status=status.HTTP_200_OK)

