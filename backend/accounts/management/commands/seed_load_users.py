"""
Django management command to generate users for load testing (Phase 10).
Strictly zero emojis. Creates 100 benchmark customer accounts with addresses.
"""

import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Address, User


class Command(BaseCommand):
    help = "Generate load testing accounts for concurrent user testing."

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of load test accounts to create (default: 100)',
        )
        parser.add_argument(
            '--prefix',
            type=str,
            default='standard',
            choices=['standard', 'legacy'],
            help='Email format: standard (load+N@example.com) or legacy (loaduser_NNN@supplivix.load)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Invariant: Never run against the main/production Neon database branch
        neon_branch = os.environ.get('NEON_BRANCH', '').strip().lower()
        db_url = os.environ.get('DATABASE_URL', '').lower()
        if neon_branch in ['main', 'production'] or 'ep-prod' in db_url:
            raise CommandError(
                "ABORT: seed_load_users cannot be run against the main or production database branch. "
                "Execute strictly against a dedicated Neon test/staging branch."
            )

        count = options['count']
        prefix = options['prefix']
        created_count = 0

        self.stdout.write(f"Generating {count} load test user accounts with addresses...")

        cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi']
        provinces = ['Punjab', 'Sindh', 'Islamabad', 'Punjab', 'Punjab']

        for i in range(1, count + 1):
            if prefix == 'legacy':
                email = f"loaduser_{i:03d}@supplivix.load"
            else:
                email = f"load+{i}@example.com"

            phone = f"0300{i:07d}"
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

            city = cities[(i - 1) % len(cities)]
            province = provinces[(i - 1) % len(provinces)]

            Address.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': user.full_name,
                    'phone': user.phone,
                    'line1': f"House {i}, Street {((i % 10) + 1)}, Sector Block {chr(65 + (i % 6))}",
                    'line2': '',
                    'city': city,
                    'province': province,
                    'postal_code': f"{54000 + (i % 500)}",
                    'is_default': True,
                }
            )

        total_users = User.objects.filter(email__startswith='load+').count() + User.objects.filter(email__endswith='@supplivix.load').count()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {created_count} new load test users with saved addresses "
            f"(Total: {total_users} load users available)."
        ))
