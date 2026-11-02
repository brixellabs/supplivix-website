from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_key', 'coupon_code', 'created_at', 'updated_at')
    search_fields = ('user__email', 'session_key', 'coupon_code')
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product', 'quantity', 'created_at')
    list_filter = ('product',)
    search_fields = ('cart__user__email', 'cart__session_key', 'product__name')
