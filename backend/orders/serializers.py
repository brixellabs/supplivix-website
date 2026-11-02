from rest_framework import serializers

from accounts.serializers import normalize_pakistani_phone

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'sku', 'unit_price', 'quantity', 'line_total']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['from_status', 'to_status', 'note', 'created_at']


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemDetailSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'number', 'status', 'status_display', 'payment_method',
            'subtotal', 'discount_total', 'shipping_total', 'grand_total',
            'coupon_code', 'shipping_address_snapshot', 'notes',
            'items', 'status_history', 'created_at', 'updated_at'
        ]


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['number', 'status', 'status_display', 'grand_total', 'total_items', 'created_at']

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())


class CheckoutQuoteSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')


class PlaceOrderSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30)
    line1 = serializers.CharField(max_length=255)
    line2 = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    payment_method = serializers.CharField(default='COD')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')

    def validate_phone(self, value):
        return normalize_pakistani_phone(value)

    def validate_payment_method(self, value):
        if value != 'COD':
            raise serializers.ValidationError('Cash on Delivery (COD) is the only accepted payment method.')
        return value


class TrackOrderSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=32)
    phone = serializers.CharField(max_length=30)

    def validate_phone(self, value):
        return normalize_pakistani_phone(value)
