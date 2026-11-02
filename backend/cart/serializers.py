from rest_framework import serializers

from catalog.models import Product
from catalog.serializers import ProductListSerializer
from content.models import SiteSetting
from promotions.models import Coupon

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source='product',
        write_only=True
    )
    line_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'line_total']


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=10)

    def validate(self, attrs):
        product_id = attrs['product_id']
        quantity = attrs['quantity']
        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Product does not exist or is inactive.'})

        if product.stock < quantity:
            raise serializers.ValidationError(
                {'quantity': f'Only {product.stock} items in stock.' if product.stock > 0 else 'Product is out of stock.'}
            )
        attrs['product'] = product
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=10)

    def validate(self, attrs):
        cart_item = self.context.get('cart_item')
        quantity = attrs['quantity']
        if cart_item and cart_item.product.stock < quantity:
            raise serializers.ValidationError(
                {'quantity': f'Only {cart_item.product.stock} items in stock.' if cart_item.product.stock > 0 else 'Product is out of stock.'}
            )
        return attrs


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)

    def validate_code(self, value):
        cleaned = value.strip().upper()
        if not (4 <= len(cleaned) <= 20 and cleaned.isalnum()):
            raise serializers.ValidationError('Coupon code must be between 4 and 20 alphanumeric characters.')
        return cleaned


class MergeCartSerializer(serializers.Serializer):
    session_key = serializers.CharField(max_length=40)


class CartDetailSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount_total = serializers.SerializerMethodField()
    shipping_total = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    free_shipping_threshold = serializers.SerializerMethodField()
    amount_needed_for_free_shipping = serializers.SerializerMethodField()
    free_shipping_message = serializers.SerializerMethodField()
    free_shipping_eligible = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'total_items', 'subtotal', 'coupon_code',
            'discount_total', 'shipping_total', 'grand_total',
            'free_shipping_threshold', 'amount_needed_for_free_shipping',
            'free_shipping_message', 'free_shipping_eligible'
        ]

    def _get_calculation(self, obj):
        if not hasattr(obj, '_calc_cache'):
            subtotal = sum(item.line_total for item in obj.items.all())
            discount = 0
            coupon = None

            if obj.coupon_code:
                coupon = Coupon.objects.filter(code=obj.coupon_code, is_active=True).first()
                if coupon:
                    is_valid, _ = coupon.is_valid_now()
                    if is_valid and subtotal >= coupon.min_order_amount:
                        discount = coupon.calculate_discount(subtotal)
                    else:
                        # Auto-remove invalid coupon
                        obj.coupon_code = ''
                        obj.save(update_fields=['coupon_code'])

            subtotal_after_discount = max(0, subtotal - discount)
            threshold = SiteSetting.get_int('free_shipping_threshold', 2000)
            flat_fee = SiteSetting.get_int('flat_shipping_fee', 200)

            if subtotal_after_discount == 0:
                shipping = 0
                eligible = False
                needed = threshold
            elif subtotal_after_discount >= threshold:
                shipping = 0
                eligible = True
                needed = 0
            else:
                shipping = flat_fee
                eligible = False
                needed = threshold - subtotal_after_discount

            grand_total = subtotal - discount + shipping

            if eligible:
                msg = "You have unlocked free shipping!"
            elif needed > 0 and subtotal > 0:
                msg = f"Add Rs. {needed:,} more for free shipping"
            else:
                msg = f"Free shipping on orders above Rs. {threshold:,}"

            obj._calc_cache = {
                'subtotal': subtotal,
                'discount': discount,
                'shipping': shipping,
                'grand_total': grand_total,
                'threshold': threshold,
                'needed': needed,
                'msg': msg,
                'eligible': eligible,
            }
        return obj._calc_cache

    def get_subtotal(self, obj):
        return self._get_calculation(obj)['subtotal']

    def get_discount_total(self, obj):
        return self._get_calculation(obj)['discount']

    def get_shipping_total(self, obj):
        return self._get_calculation(obj)['shipping']

    def get_grand_total(self, obj):
        return self._get_calculation(obj)['grand_total']

    def get_free_shipping_threshold(self, obj):
        return self._get_calculation(obj)['threshold']

    def get_amount_needed_for_free_shipping(self, obj):
        return self._get_calculation(obj)['needed']

    def get_free_shipping_message(self, obj):
        return self._get_calculation(obj)['msg']

    def get_free_shipping_eligible(self, obj):
        return self._get_calculation(obj)['eligible']
