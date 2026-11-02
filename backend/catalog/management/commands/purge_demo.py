"""
Django management command to safely purge demo products, reviews, and test data.
Retains staff administrator accounts by default. Strictly zero emojis anywhere.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from catalog.models import Category, Product, Review
from promotions.models import Coupon


class Command(BaseCommand):
    help = "Purge seeded demo products, categories, reviews, and demo coupons."

    def add_arguments(self, parser):
        parser.add_argument(
            '--include-admin',
            action='store_true',
            help='Also remove admin@supplivix.com',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Purge demo products starting with SPLV-
        demo_products = Product.objects.filter(sku__startswith='SPLV-')
        product_count = demo_products.count()
        demo_products.delete()

        # 2. Purge orphaned demo reviews
        review_count, _ = Review.objects.filter(
            title__in=[
                'Noticeable difference in vitality',
                'Great daily support',
                'Excellent multivitamin',
            ]
        ).delete()

        # 3. Purge demo categories if empty
        cat_slugs = ['multivitamins', 'immunity', 'bones-joints', 'skin-glow', 'skincare', 'vitality']
        deleted_cats = 0
        for slug in cat_slugs:
            cats = Category.objects.filter(slug=slug, products__isnull=True)
            if cats.exists():
                cats.delete()
                deleted_cats += 1

        # 4. Purge demo coupons
        coupon_count, _ = Coupon.objects.filter(code__in=['WELCOME10', 'HEALTH20']).delete()

        # 5. Purge test buyer user
        User.objects.filter(email='usman@example.com').delete()

        if options.get('include_admin'):
            User.objects.filter(email='admin@supplivix.com').delete()

        self.stdout.write(self.style.SUCCESS(
            f"Purged {product_count} demo products, {review_count} demo reviews, "
            f"{deleted_cats} empty demo categories, {coupon_count} demo coupons."
        ))
