from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'product_name', 'sku', 'unit_price', 'quantity', 'line_total')


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('from_status', 'to_status', 'changed_by', 'note', 'created_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('number', 'user', 'guest_email', 'status', 'payment_method', 'grand_total', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('number', 'user__email', 'guest_email', 'notes')
    readonly_fields = ('number', 'subtotal', 'discount_total', 'shipping_total', 'grand_total', 'created_at', 'updated_at')
    inlines = [OrderItemInline, OrderStatusHistoryInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product_name', 'sku', 'unit_price', 'quantity', 'line_total')
    list_filter = ('order__status',)
    search_fields = ('order__number', 'product_name', 'sku')


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'from_status', 'to_status', 'changed_by', 'created_at')
    list_filter = ('from_status', 'to_status', 'created_at')
    search_fields = ('order__number', 'note')
