"""
Django management command to safely purge demo products, reviews, test data, and demo images.
Retains staff administrator accounts by default. Strictly zero emojis anywhere.
Leaves an empty but working store with default site settings intact.
"""

import glob
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Address, User
from catalog.models import Category, Product, Review
from orders.models import Order
from promotions.models import Coupon


class Command(BaseCommand):
    help = "Purge seeded demo products, categories, reviews, demo orders, demo users, and demo image assets."

    def add_arguments(self, parser):
        parser.add_argument(
            '--include-admin',
            action='store_true',
            help='Also remove admin@supplivix.com',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Purge demo orders
        demo_orders = Order.objects.filter(number__startswith='ORD-')
        order_count = demo_orders.count()
        demo_orders.delete()

        # 2. Purge demo products starting with SPLV-
        demo_products = Product.objects.filter(sku__startswith='SPLV-')
        product_count = demo_products.count()
        demo_products.delete()

        # 3. Purge orphaned demo reviews
        review_count, _ = Review.objects.filter(
            title__in=[
                'Noticeable difference in vitality',
                'Noticeable improvement in daily vitality',
                'Great daily support',
                'Excellent multivitamin',
                'Excellent bioavailable multivitamin',
                'Authentic formula and quick delivery',
                'Very good results after one month',
                'Quality ingredients verified',
                'Smooth checkout and authentic product',
                'Consistent quality and reliable service',
                'Impressed with the bioavailability',
            ]
        ).delete()

        # 4. Purge demo categories if empty
        cat_slugs = ['multivitamins', 'immunity', 'bones-joints', 'skin-glow', 'skincare', 'vitality']
        deleted_cats = 0
        for slug in cat_slugs:
            cats = Category.objects.filter(slug=slug, products__isnull=True)
            if cats.exists():
                cats.delete()
                deleted_cats += 1

        # 5. Purge demo coupons
        coupon_codes = ['WELCOME10', 'SAVE500', 'EXPIRED25', 'FUTURE15', 'MAXEDOUT', 'SKINGLOW', 'HEALTH20']
        coupon_count, _ = Coupon.objects.filter(code__in=coupon_codes).delete()

        # 6. Purge test customer accounts and demo users (demo+N@example.com)
        demo_users = User.objects.filter(email__startswith='demo+')
        user_count = demo_users.count()
        Address.objects.filter(user__in=demo_users).delete()
        demo_users.delete()
        User.objects.filter(email='usman@example.com').delete()

        if options.get('include_admin'):
            User.objects.filter(email='admin@supplivix.com').delete()

        # 7. Purge demo image files (demo-*)
        deleted_files_count = 0
        search_dirs = [
            os.path.join(settings.MEDIA_ROOT, 'products'),
            os.path.join(settings.MEDIA_ROOT, 'categories'),
            os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'frontend', 'src', 'assets', 'demo')),
        ]

        for s_dir in search_dirs:
            if os.path.exists(s_dir):
                for fpath in glob.glob(os.path.join(s_dir, 'demo-*')):
                    try:
                        os.remove(fpath)
                        deleted_files_count += 1
                    except OSError:
                        pass

        self.stdout.write(self.style.SUCCESS(
            f"Purge complete: {product_count} demo products, {review_count} demo reviews, "
            f"{order_count} demo orders, {user_count} demo users, {coupon_count} demo coupons, "
            f"{deleted_files_count} demo image files removed. Store remains active and operational."
        ))
