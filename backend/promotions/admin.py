from django.contrib import admin

from .models import Coupon, CouponRedemption


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'type', 'value', 'min_order_amount', 'max_discount_amount', 'is_active', 'starts_at', 'ends_at')
    list_filter = ('type', 'is_active', 'applies_to_category')
    search_fields = ('code',)


@admin.register(CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ('coupon', 'user', 'email', 'order', 'created_at')
    list_filter = ('coupon', 'created_at')
    search_fields = ('coupon__code', 'user__email', 'email', 'order__number')
