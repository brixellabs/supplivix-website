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
