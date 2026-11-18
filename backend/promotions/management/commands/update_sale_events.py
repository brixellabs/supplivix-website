"""
Housekeeping command for Sale Events.
Runs periodically (e.g. via cron / celery beat every minute) to:
1. Transition stored status (scheduled -> active -> expired).
2. Clear pricing and event caches when transitions occur.
3. Log status changes for administrative visibility.

Note: Runtime pricing correctness does NOT depend on this command;
PricingService always computes effective status at runtime from start_at / end_at.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from promotions.models import SaleEvent
from promotions.services import PricingService


class Command(BaseCommand):
    help = 'Update stored status of Sale Events and clear pricing caches when transitions occur.'

    def handle(self, *args, **options):
        now = timezone.now()
        events = SaleEvent.objects.filter(deleted_at__isnull=True)
        transitions = []

        for event in events:
            effective_status = event.get_effective_status(now)
            if event.status != effective_status:
                old_status = event.status
                event.status = effective_status
                event.save(update_fields=['status'])
                transitions.append((event.name, old_status, effective_status))

        if transitions:
            PricingService.invalidate_cache()
            for name, old_s, new_s in transitions:
                self.stdout.write(
                    self.style.SUCCESS(f'[TRANSITION] Event "{name}": {old_s} -> {new_s}')
                )
            self.stdout.write(
                self.style.SUCCESS(f'Updated {len(transitions)} event(s) and invalidated pricing cache.')
            )
        else:
            self.stdout.write(self.style.NOTICE(f'All {events.count()} events are up to date at {now.isoformat()}.'))

