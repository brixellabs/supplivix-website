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
    price_when_added = serializers.IntegerField(read_only=True)
    price_changed = serializers.SerializerMethodField()
    price_change_notice = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source='product.is_active', read_only=True)
    flagged_inactive = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_id', 'quantity', 'line_total',
            'price_when_added', 'price_changed', 'price_change_notice',
            'is_active', 'flagged_inactive'
        ]

    def get_price_changed(self, obj):
        if obj.price_when_added is not None and obj.product.price != obj.price_when_added:
            return True
        return False

    def get_price_change_notice(self, obj):
        if obj.price_when_added is not None and obj.product.price != obj.price_when_added:
            return f"Price updated to Rs. {obj.product.price:,} (was Rs. {obj.price_when_added:,})"
        return None

    def get_flagged_inactive(self, obj):
        return not obj.product.is_active


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
    notices = serializers.SerializerMethodField()
    has_inactive_items = serializers.SerializerMethodField()
    checkout_blocked = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'total_items', 'subtotal', 'coupon_code',
            'discount_total', 'shipping_total', 'grand_total',
            'free_shipping_threshold', 'amount_needed_for_free_shipping',
            'free_shipping_message', 'free_shipping_eligible',
            'notices', 'has_inactive_items', 'checkout_blocked'
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
                    category_ok = True
                    if coupon.applies_to_category_id:
                        category_ok = any(item.product.category_id == coupon.applies_to_category_id for item in obj.items.all())

                    if is_valid and subtotal >= coupon.min_order_amount and category_ok:
                        discount = coupon.calculate_discount(subtotal)
                    else:
                        # Auto-remove invalid coupon with notice
                        removed_code = obj.coupon_code
                        obj.coupon_code = ''
                        obj.save(update_fields=['coupon_code'])
                        notice = f"Notice: Coupon {removed_code} was removed as cart requirements are no longer met."
                        obj._coupon_notice = notice
                        if obj.id:
                            from django.core.cache import cache
                            cache.set(f"cart_notice_{obj.id}", notice, timeout=120)
                else:
                    removed_code = obj.coupon_code
                    obj.coupon_code = ''
                    obj.save(update_fields=['coupon_code'])
                    notice = f"Notice: Coupon {removed_code} was removed."
                    obj._coupon_notice = notice
                    if obj.id:
                        from django.core.cache import cache
                        cache.set(f"cart_notice_{obj.id}", notice, timeout=120)

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

    def get_notices(self, obj):
        self._get_calculation(obj)
        notices = []
        if getattr(obj, '_coupon_notice', None):
            notices.append(obj._coupon_notice)
        elif obj.id:
            from django.core.cache import cache
            cached_notice = cache.get(f"cart_notice_{obj.id}")
            if cached_notice and cached_notice not in notices:
                notices.append(cached_notice)
        for item in obj.items.select_related('product').all():
            if not item.product.is_active:
                notices.append(f"{item.product.name} is no longer available. Please remove it to proceed to checkout.")
            elif item.price_when_added is not None and item.product.price != item.price_when_added:
                diff = item.product.price - item.price_when_added
                direction = "increased" if diff > 0 else "decreased"
                notices.append(
                    f"Notice: Price for {item.product.name} has {direction} to Rs. {item.product.price:,} (was Rs. {item.price_when_added:,})."
                )
        return notices

    def get_has_inactive_items(self, obj):
        return any(not item.product.is_active for item in obj.items.select_related('product').all())

    def get_checkout_blocked(self, obj):
        return self.get_has_inactive_items(obj)
