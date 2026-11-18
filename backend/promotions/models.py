from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from catalog.models import Category


class Coupon(models.Model):
    """Discount coupon / token model."""

    TYPE_PERCENT = 'percent'
    TYPE_FIXED = 'fixed'
    TYPE_CHOICES = [
        (TYPE_PERCENT, 'Percentage'),
        (TYPE_FIXED, 'Fixed Amount'),
    ]

    code = models.CharField(max_length=20, unique=True, db_index=True)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default=TYPE_PERCENT)
    value = models.PositiveIntegerField(help_text='Percentage (e.g. 15 for 15%) or Fixed Rupees')
    min_order_amount = models.PositiveIntegerField(default=0, help_text='Minimum subtotal required in PKR')
    max_discount_amount = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Cap on discount for percentage coupons in PKR'
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    usage_limit_total = models.PositiveIntegerField(null=True, blank=True, help_text='Maximum total redemptions')
    usage_limit_per_user = models.PositiveIntegerField(default=1, help_text='Maximum uses per user or email')
    is_active = models.BooleanField(default=True, db_index=True)
    applies_to_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='category_coupons'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['applies_to_category']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.code} ({self.get_type_display()} {self.value})"

    def clean(self):
        super().clean()
        if self.code:
            self.code = self.code.strip().upper()
        if self.type == self.TYPE_PERCENT and self.value > 100:
            raise ValidationError({'value': 'Percentage discount cannot exceed 100%'})

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()
        self.full_clean()
        super().save(*args, **kwargs)

    def is_valid_now(self):
        """Check if coupon is active and currently within valid dates."""
        if not self.is_active:
            return False, 'This code is inactive.'
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False, 'This code is not yet active.'
        if self.ends_at and now > self.ends_at:
            return False, 'This code has expired.'
        if self.usage_limit_total is not None:
            if self.redemptions.count() >= self.usage_limit_total:
                return False, 'This code has reached its maximum usage limit.'
        return True, ''

    def calculate_discount(self, subtotal, eligible_subtotal=None):
        """Calculate discount amount in whole PKR based on subtotal."""
        base_amount = eligible_subtotal if eligible_subtotal is not None else subtotal
        if base_amount <= 0:
            return 0

        if self.type == self.TYPE_PERCENT:
            raw_discount = round((base_amount * self.value) / 100)
            if self.max_discount_amount:
                raw_discount = min(raw_discount, self.max_discount_amount)
        else:
            raw_discount = self.value

        # Discount cannot exceed subtotal
        return min(raw_discount, subtotal)


class CouponRedemption(models.Model):
    """Audit log of coupon usage per order and customer."""

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='redemptions')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupon_redemptions'
    )
    email = models.EmailField(blank=True, db_index=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='coupon_redemptions'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Coupon Redemption'
        verbose_name_plural = 'Coupon Redemptions'
        indexes = [
            models.Index(fields=['coupon', 'user']),
            models.Index(fields=['coupon', 'email']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.coupon.code} redeemed on Order #{self.order.number}"


class Offer(models.Model):
    """Admin-controlled promotional deals and special offers."""

    title = models.CharField(max_length=255)
    badge = models.CharField(max_length=60, default='Special Offer', blank=True)
    description = models.TextField(blank=True)
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='promotional_offers'
    )
    price = models.PositiveIntegerField(help_text='Offer / Deal Price in PKR')
    original_price = models.PositiveIntegerField(null=True, blank=True, help_text='Original compare price in PKR')
    discount_percentage = models.PositiveIntegerField(default=0, blank=True)
    highlight = models.CharField(max_length=120, blank=True, default='', help_text='Optional highlight e.g. Free Nationwide Delivery')
    button_text = models.CharField(max_length=50, default='Shop Offer', blank=True)
    link = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='offers/', null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Offer'
        verbose_name_plural = 'Offers'
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return f"{self.title} (Rs. {self.price})"

    def save(self, *args, **kwargs):
        if self.original_price and self.price and self.original_price > self.price:
            calc_pct = round(((self.original_price - self.price) / self.original_price) * 100)
            if not self.discount_percentage:
                self.discount_percentage = calc_pct
        if not self.link and self.product:
            self.link = f"/products/{self.product.slug}"
        super().save(*args, **kwargs)

    def to_dict(self, request=None):
        img_url = None
        if self.image:
            img_url = request.build_absolute_uri(self.image.url) if request else self.image.url
        elif self.product:
            prim = self.product.images.order_by('sort_order', 'id').first()
            if prim and prim.image:
                img_url = request.build_absolute_uri(prim.image.url) if request else prim.image.url

        product_data = None
        if self.product:
            product_data = {
                'id': self.product.id,
                'name': self.product.name,
                'slug': self.product.slug,
                'price': self.price or self.product.price,
                'compare_at_price': self.original_price or self.product.compare_at_price,
                'stock': self.product.stock,
                'inventory_count': self.product.stock,
                'is_active': self.product.is_active,
                'category_name': self.product.category.name if self.product.category else '',
                'category_slug': self.product.category.slug if self.product.category else '',
                'rating': float(getattr(self.product, 'rating', 5.0) or 5.0),
                'reviews_count': int(getattr(self.product, 'reviews_count', 0) or 0),
                'image': img_url,
            }

        return {
            'id': self.id,
            'title': self.title,
            'badge': self.badge or 'Special Offer',
            'description': self.description,
            'price': self.price,
            'original_price': self.original_price,
            'discount_percentage': self.discount_percentage,
            'highlight': getattr(self, 'highlight', '') or '',
            'button_text': self.button_text or 'Shop Offer',
            'link': self.link or (f"/products/{self.product.slug}" if self.product else '/shop'),
            'image': img_url,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'product_id': self.product_id,
            'product': product_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class SaleEvent(models.Model):
    """
    Seasonal & Campaign Sale Events (e.g. Independence Day, Eid, Black Friday).
    Discounts are calculated at runtime by PricingService without altering catalog_product prices.
    """

    DISCOUNT_PERCENT = 'percent'
    DISCOUNT_FLAT = 'flat'
    DISCOUNT_TYPE_CHOICES = [
        (DISCOUNT_PERCENT, 'Percentage (%)'),
        (DISCOUNT_FLAT, 'Flat Amount (PKR)'),
    ]

    APPLY_ALL = 'all'
    APPLY_CATEGORIES = 'categories'
    APPLY_PRODUCTS = 'products'
    APPLY_ON_CHOICES = [
        (APPLY_ALL, 'All Catalog Products'),
        (APPLY_CATEGORIES, 'Specific Categories'),
        (APPLY_PRODUCTS, 'Specific Products'),
    ]

    STATUS_DRAFT = 'draft'
    STATUS_SCHEDULED = 'scheduled'
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_DISABLED = 'disabled'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_DISABLED, 'Disabled'),
    ]

    name = models.CharField(max_length=150, help_text='Campaign Name (e.g. Independence Day Mega Sale)')
    slug = models.SlugField(max_length=160, unique=True, db_index=True)
    description = models.TextField(blank=True)
    banner_image = models.ImageField(upload_to='sale_events/', null=True, blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default=DISCOUNT_PERCENT)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, help_text='Discount % or Flat PKR amount')
    max_discount_amount = models.PositiveIntegerField(null=True, blank=True, help_text='Cap in PKR for percent discounts')
    apply_on = models.CharField(max_length=15, choices=APPLY_ON_CHOICES, default=APPLY_ALL)
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(db_index=True)
    priority = models.IntegerField(default=0, help_text='Higher integer takes precedence when multiple events match')
    allow_coupon_stacking = models.BooleanField(default=False, help_text='Whether additional coupons can be applied on top')
    show_countdown = models.BooleanField(default=True, help_text='Show live urgency countdown timer on storefront')
    badge_text = models.CharField(max_length=60, default='Sale', blank=True, help_text='e.g. Independence Day Sale, 20% OFF')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, db_index=True)
    is_enabled = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_sale_events'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'sale_events'
        verbose_name = 'Sale Event'
        verbose_name_plural = 'Sale Events'
        ordering = ['-priority', '-start_at']
        indexes = [
            models.Index(fields=['start_at', 'end_at', 'is_enabled', 'status']),
            models.Index(fields=['is_enabled', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.discount_value}{'%' if self.discount_type == 'percent' else ' PKR'})"

    def clean(self):
        super().clean()
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValidationError({'end_at': 'End date & time must be strictly after Start date & time.'})
        if self.discount_value <= 0:
            raise ValidationError({'discount_value': 'Discount value must be greater than zero.'})
        if self.discount_type == self.DISCOUNT_PERCENT and self.discount_value > 100:
            raise ValidationError({'discount_value': 'Percentage discount cannot exceed 100%.'})

    def is_active_at(self, dt=None):
        if not self.is_enabled or self.deleted_at is not None:
            return False
        if dt is None:
            dt = timezone.now()
        return self.start_at <= dt < self.end_at

    def get_effective_status(self, dt=None):
        if not self.is_enabled or self.deleted_at is not None:
            return self.STATUS_DISABLED
        if dt is None:
            dt = timezone.now()
        if dt < self.start_at:
            return self.STATUS_SCHEDULED
        if self.start_at <= dt < self.end_at:
            return self.STATUS_ACTIVE
        return self.STATUS_EXPIRED

    def save(self, *args, **kwargs):
        from django.utils.text import slugify
        if not self.slug:
            base_slug = slugify(self.name) or 'sale-event'
            slug = base_slug
            idx = 1
            while SaleEvent.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{idx}"
                idx += 1
            self.slug = slug
        self.status = self.get_effective_status()
        self.full_clean()
        super().save(*args, **kwargs)
        self._invalidate_cache()

    def delete(self, using=None, keep_parents=False, soft=True):
        if soft:
            self.deleted_at = timezone.now()
            self.is_enabled = False
            self.save(update_fields=['deleted_at', 'is_enabled'])
        else:
            super().delete(using=using, keep_parents=keep_parents)
        self._invalidate_cache()

    def _invalidate_cache(self):
        from django.core.cache import cache
        cache.delete('active_sale_events_cache')
        cache.delete(f'sale_event_{self.slug}')

    def to_dict(self, request=None):
        banner_url = None
        if self.banner_image:
            banner_url = request.build_absolute_uri(self.banner_image.url) if request else self.banner_image.url

        now = timezone.now()
        eff_status = self.get_effective_status(now)
        is_active = eff_status == self.STATUS_ACTIVE

        # Target items
        category_ids = list(self.items.filter(target_type='category', is_excluded=False).values_list('target_id', flat=True))
        product_ids = list(self.items.filter(target_type='product', is_excluded=False).values_list('target_id', flat=True))
        excluded_product_ids = list(self.items.filter(target_type='product', is_excluded=True).values_list('target_id', flat=True))

        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'banner_image': banner_url,
            'discount_type': self.discount_type,
            'discount_value': float(self.discount_value),
            'max_discount_amount': self.max_discount_amount,
            'apply_on': self.apply_on,
            'start_at': self.start_at.isoformat(),
            'end_at': self.end_at.isoformat(),
            'priority': self.priority,
            'allow_coupon_stacking': self.allow_coupon_stacking,
            'show_countdown': self.show_countdown,
            'badge_text': self.badge_text or f"{int(self.discount_value)}% OFF",
            'status': self.status,
            'effective_status': eff_status,
            'is_enabled': self.is_enabled,
            'is_active': is_active,
            'category_ids': category_ids,
            'product_ids': product_ids,
            'excluded_product_ids': excluded_product_ids,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class SaleEventItem(models.Model):
    """Specific category/product targeting, exclusion, or custom discount overrides for a SaleEvent."""

    TARGET_CATEGORY = 'category'
    TARGET_PRODUCT = 'product'
    TARGET_TYPE_CHOICES = [
        (TARGET_CATEGORY, 'Category'),
        (TARGET_PRODUCT, 'Product'),
    ]

    sale_event = models.ForeignKey(SaleEvent, on_delete=models.CASCADE, related_name='items')
    target_type = models.CharField(max_length=15, choices=TARGET_TYPE_CHOICES)
    target_id = models.PositiveIntegerField(help_text='ID of Category or Product')
    custom_discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Optional override discount for this specific item'
    )
    is_excluded = models.BooleanField(
        default=False,
        help_text='If True, this target is excluded from an apply_on=all event'
    )

    class Meta:
        db_table = 'sale_event_items'
        verbose_name = 'Sale Event Item'
        verbose_name_plural = 'Sale Event Items'
        unique_together = [('sale_event', 'target_type', 'target_id')]
        indexes = [
            models.Index(fields=['sale_event', 'target_type', 'target_id']),
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        ex_str = ' (EXCLUDED)' if self.is_excluded else ''
        return f"{self.sale_event.name} -> {self.target_type} #{self.target_id}{ex_str}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.sale_event._invalidate_cache()

    def delete(self, *args, **kwargs):
        event = self.sale_event
        super().delete(*args, **kwargs)
        event._invalidate_cache()


