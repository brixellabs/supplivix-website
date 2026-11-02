"""
Django management command to generate users for load testing (Phase 10).
Strictly zero emojis. Creates 100 benchmark customer accounts.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Generate load testing accounts for concurrent user testing."

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of load test accounts to create (default: 100)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options['count']
        created_count = 0

        self.stdout.write(f"Generating {count} load test user accounts...")

        for i in range(1, count + 1):
            email = f"loaduser_{i:03d}@supplivix.load"
            phone = f"+92300000{i:04d}"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': f"Load Test Customer {i}",
                    'phone': phone,
                    'is_active': True,
                }
            )
            if created:
                user.set_password("LoadTestPass2026!")
                user.save()
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {created_count} new load test users "
            f"(Total: {User.objects.filter(email__endswith='@supplivix.load').count()} load users available)."
        ))
