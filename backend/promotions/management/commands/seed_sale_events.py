"""
Seed command to create a realistic sample Sale Event (e.g. 20% OFF Mega Season Sale)
for testing and demonstration.
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from promotions.models import SaleEvent
from promotions.services import PricingService


class Command(BaseCommand):
    help = 'Seed demo Sale Event for storefront testing.'

    def handle(self, *args, **options):
        now = timezone.now()
        event_name = 'Mega Wellness & Glow Sale'
        slug = 'mega-wellness-glow-sale'

        event, created = SaleEvent.objects.get_or_create(
            slug=slug,
            defaults={
                'name': event_name,
                'description': 'Enjoy flat 20% off all Supplivix beauty & multivitamin formulations across Pakistan. Limited time seasonal campaign.',
                'discount_type': SaleEvent.DISCOUNT_PERCENT,
                'discount_value': 20,
                'apply_on': SaleEvent.APPLY_ALL,
                'start_at': now - timedelta(hours=2),
                'end_at': now + timedelta(days=5),
                'priority': 10,
                'allow_coupon_stacking': False,
                'show_countdown': True,
                'badge_text': '20% OFF EID SALE',
                'status': SaleEvent.STATUS_ACTIVE,
                'is_enabled': True,
            }
        )

        if not created:
            # Ensure it is currently active
            event.start_at = now - timedelta(hours=2)
            event.end_at = now + timedelta(days=5)
            event.is_enabled = True
            event.status = SaleEvent.STATUS_ACTIVE
            event.save()
            self.stdout.write(self.style.SUCCESS(f'Updated existing event: {event.name} (Active until {event.end_at})'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created active demo Sale Event: {event.name} (Active until {event.end_at})'))

        PricingService.invalidate_cache()

