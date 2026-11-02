import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from catalog.models import Product


class Order(models.Model):
    """Customer order with Cash on Delivery (COD) as payment method."""

    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_PACKED = 'packed'
    STATUS_SHIPPED = 'shipped'
    STATUS_DELIVERED = 'delivered'
    STATUS_COD_COLLECTED = 'cod_collected'
    STATUS_CANCELLED = 'cancelled'
    STATUS_RETURNED = 'returned'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_PACKED, 'Packed'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_COD_COLLECTED, 'COD Collected'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_RETURNED, 'Returned'),
    ]

    ALLOWED_TRANSITIONS = {
        STATUS_PENDING: [STATUS_CONFIRMED, STATUS_CANCELLED],
        STATUS_CONFIRMED: [STATUS_PACKED, STATUS_CANCELLED],
        STATUS_PACKED: [STATUS_SHIPPED, STATUS_CANCELLED],
        STATUS_SHIPPED: [STATUS_DELIVERED, STATUS_RETURNED],
        STATUS_DELIVERED: [STATUS_COD_COLLECTED, STATUS_RETURNED],
        STATUS_COD_COLLECTED: [STATUS_RETURNED],
        STATUS_CANCELLED: [],
        STATUS_RETURNED: [],
    }

    number = models.CharField(max_length=32, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    guest_email = models.EmailField(blank=True, db_index=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True
    )
    payment_method = models.CharField(max_length=20, default='COD')
    subtotal = models.PositiveIntegerField(help_text='Subtotal in PKR')
    discount_total = models.PositiveIntegerField(default=0, help_text='Discount in PKR')
    shipping_total = models.PositiveIntegerField(default=0, help_text='Shipping fee in PKR')
    grand_total = models.PositiveIntegerField(help_text='Grand total in PKR')
    coupon_code = models.CharField(max_length=30, blank=True)
    shipping_address_snapshot = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['number']),
            models.Index(fields=['status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['guest_email']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Order #{self.number} ({self.get_status_display()})"

    @classmethod
    def generate_order_number(cls):
        """Generate unique readable order number: SPLV-XXXX-XXXX."""
        rand = uuid.uuid4().hex[:8].upper()
        return f"SPLV-{rand[:4]}-{rand[4:]}"

    def can_transition_to(self, new_status):
        """Check whether status transition is valid."""
        if self.status == new_status:
            return True
        allowed = self.ALLOWED_TRANSITIONS.get(self.status, [])
        return new_status in allowed

    def transition_to(self, new_status, user=None, note=''):
        """Perform validated status transition and record history."""
        if not self.can_transition_to(new_status):
            raise ValidationError(
                f"Invalid order status transition from {self.status} to {new_status}"
            )
        old_status = self.status
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])
        OrderStatusHistory.objects.create(
            order=self,
            from_status=old_status,
            to_status=new_status,
            changed_by=user,
            note=note
        )


class OrderItem(models.Model):
    """Line item in an order with snapshot of product details."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=60)
    unit_price = models.PositiveIntegerField(help_text='Unit price in PKR')
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.PositiveIntegerField(help_text='Line total in PKR')

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"{self.quantity}x {self.product_name} (#{self.order.number})"


class OrderStatusHistory(models.Model):
    """Audit history of all order status changes."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Order Status History'
        verbose_name_plural = 'Order Status Histories'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order', 'created_at']),
        ]

    def __str__(self):
        return f"Order #{self.order.number}: {self.from_status} -> {self.to_status}"
