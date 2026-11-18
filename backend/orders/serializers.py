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
    order_number = serializers.CharField(source='number', read_only=True)
    items = OrderItemDetailSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recipient_name = serializers.SerializerMethodField()
    street_address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    province = serializers.SerializerMethodField()
    postal_code = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'number', 'order_number', 'status', 'status_display', 'payment_method',
            'subtotal', 'discount_total', 'shipping_total', 'grand_total',
            'coupon_code', 'shipping_address_snapshot', 'notes',
            'recipient_name', 'street_address', 'city', 'province', 'postal_code', 'phone',
            'items', 'status_history', 'created_at', 'updated_at'
        ]

    def get_recipient_name(self, obj):
        snap = obj.shipping_address_snapshot or {}
        name = snap.get('full_name') or snap.get('recipient_name') or ''
        if not name or name.strip() == 'undefined undefined':
            if obj.user and obj.user.full_name:
                name = obj.user.full_name
            else:
                name = 'Valued Customer'
        return name

    def get_street_address(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('line1') or snap.get('street_address') or ''

    def get_city(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('city') or ''

    def get_province(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('province') or ''

    def get_postal_code(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('postal_code') or ''

    def get_phone(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('phone') or ''


class OrderListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    street_address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    province = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'number', 'order_number', 'status', 'status_display',
            'grand_total', 'total_items',
            'recipient_name', 'street_address', 'city', 'province', 'phone',
            'created_at'
        ]

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_recipient_name(self, obj):
        snap = obj.shipping_address_snapshot or {}
        name = snap.get('full_name') or snap.get('recipient_name') or ''
        if not name or name.strip() == 'undefined undefined':
            if obj.user and obj.user.full_name:
                name = obj.user.full_name
            else:
                name = 'Valued Customer'
        return name

    def get_street_address(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('line1') or snap.get('street_address') or ''

    def get_city(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('city') or ''

    def get_province(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('province') or ''

    def get_phone(self, obj):
        snap = obj.shipping_address_snapshot or {}
        return snap.get('phone') or ''


class CheckoutQuoteSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')


class PlaceOrderSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=True)
    recipient_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30)
    line1 = serializers.CharField(max_length=255, required=True)
    street_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    line2 = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    payment_method = serializers.CharField(default='COD', required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_notes = serializers.CharField(required=False, allow_blank=True, default='')
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = dict(data)
            if not data.get('full_name') and data.get('recipient_name'):
                data['full_name'] = data.get('recipient_name')
            if not data.get('line1') and data.get('street_address'):
                data['line1'] = data.get('street_address')
            if not data.get('notes') and data.get('delivery_notes'):
                data['notes'] = data.get('delivery_notes')
        return super().to_internal_value(data)

    def validate_payment_method(self, value):
        val = str(value or '').strip().upper()
        if val != 'COD':
            raise serializers.ValidationError('Cash on Delivery (COD) is the only accepted payment method.')
        return 'COD'

    def validate_phone(self, value):
        return normalize_pakistani_phone(value)

    def validate(self, attrs):
        name = attrs.get('full_name') or attrs.get('recipient_name')
        if not name or not name.strip():
            raise serializers.ValidationError({'full_name': 'Full recipient name is required.'})
        attrs['full_name'] = name.strip()

        address = attrs.get('line1') or attrs.get('street_address')
        if not address or not address.strip():
            raise serializers.ValidationError({'line1': 'Delivery street address is required.'})
        attrs['line1'] = address.strip()

        notes = attrs.get('notes') or attrs.get('delivery_notes') or ''
        attrs['notes'] = notes.strip()

        pm = str(attrs.get('payment_method') or 'COD').strip().upper()
        if pm != 'COD':
            raise serializers.ValidationError({'payment_method': 'Cash on Delivery (COD) is the only accepted payment method.'})
        attrs['payment_method'] = 'COD'

        return attrs


class TrackOrderSerializer(serializers.Serializer):
    order_number = serializers.CharField(max_length=32)
    phone = serializers.CharField(max_length=30)

    def validate_phone(self, value):
        return normalize_pakistani_phone(value)
