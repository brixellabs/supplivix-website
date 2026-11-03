from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import BotEvent
from core.security import get_client_ip, track_coupon_guessing
from promotions.models import Coupon, CouponRedemption

from .models import Cart, CartItem
from .serializers import (
    AddCartItemSerializer,
    ApplyCouponSerializer,
    CartDetailSerializer,
    MergeCartSerializer,
    UpdateCartItemSerializer,
)


def get_or_create_cart(request):
    """Retrieve or create shopping cart for authenticated user or anonymous session."""
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    session_key = request.headers.get('X-Session-Key')
    if not session_key:
        if not request.session.session_key:
            request.session.create()
        session_key = request.session.session_key

    cart, _ = Cart.objects.get_or_create(session_key=session_key)
    return cart


class CartView(APIView):
    """Retrieve current cart with items and recomputed totals."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        serializer = CartDetailSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddCartItemView(APIView):
    """Add product to cart or increment quantity."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cart = get_or_create_cart(request)
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity, 'price_when_added': product.price}
        )

        if not created:
            if cart_item.price_when_added is None:
                cart_item.price_when_added = product.price
            new_qty = cart_item.quantity + quantity
            if new_qty > product.stock:
                return Response(
                    {
                        'code': 'insufficient_stock',
                        'message': f'Cannot add {quantity} more. Only {product.stock} in stock and you have {cart_item.quantity} in cart.',
                        'fields': {'quantity': ['Insufficient stock available.']}
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = min(new_qty, 10)
            cart_item.save(update_fields=['quantity'])

        return Response(CartDetailSerializer(cart).data, status=status.HTTP_200_OK)


class CartItemDetailView(APIView):
    """Update quantity or delete item from cart."""

    permission_classes = [permissions.AllowAny]

    def patch(self, request, pk):
        cart = get_or_create_cart(request)
        try:
            cart_item = CartItem.objects.get(pk=pk, cart=cart)
        except CartItem.DoesNotExist:
            return Response(
                {'code': 'not_found', 'message': 'Cart item not found.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateCartItemSerializer(data=request.data, context={'cart_item': cart_item})
        serializer.is_valid(raise_exception=True)

        cart_item.quantity = serializer.validated_data['quantity']
        cart_item.save(update_fields=['quantity'])

        return Response(CartDetailSerializer(cart).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        cart = get_or_create_cart(request)
        try:
            cart_item = CartItem.objects.get(pk=pk, cart=cart)
            cart_item.delete()
        except CartItem.DoesNotExist:
            return Response(
                {'code': 'not_found', 'message': 'Cart item not found.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(CartDetailSerializer(cart).data, status=status.HTTP_200_OK)


class ApplyCouponView(APIView):
    """Apply discount token / coupon to the cart."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'coupon'

    def delete(self, request):
        return RemoveCouponView().delete(request)

    def post(self, request):
        cart = get_or_create_cart(request)
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']

        coupon = Coupon.objects.filter(code=code).first()
        if not coupon:
            ip = get_client_ip(request)
            if track_coupon_guessing(ip, code):
                BotEvent.objects.create(
                    ip=ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                    path=request.path,
                    reason=f"Coupon guessing attack detected: attempted {code}",
                    score=35
                )
            return Response(
                {'code': 'invalid_code', 'message': 'This code is not valid.', 'fields': {'code': ['Code not recognized.']}},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid, error_msg = coupon.is_valid_now()
        if not is_valid:
            return Response(
                {'code': 'coupon_invalid', 'message': error_msg, 'fields': {'code': [error_msg]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        subtotal = sum(item.line_total for item in cart.items.all())
        if subtotal < coupon.min_order_amount:
            msg = f"Minimum order of Rs. {coupon.min_order_amount:,} required"
            return Response(
                {'code': 'min_order_unmet', 'message': msg, 'fields': {'code': [msg]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check category restriction if set
        if coupon.applies_to_category:
            has_matching_item = cart.items.filter(
                product__category=coupon.applies_to_category
            ).exists()
            if not has_matching_item:
                msg = "This code is not valid for the items in your cart"
                return Response(
                    {'code': 'category_mismatch', 'message': msg, 'fields': {'code': [msg]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check per-user limit if user is authenticated
        if request.user.is_authenticated:
            used_count = CouponRedemption.objects.filter(coupon=coupon, user=request.user).count()
            if used_count >= coupon.usage_limit_per_user:
                msg = "You have already used this code"
                return Response(
                    {'code': 'usage_limit_reached', 'message': msg, 'fields': {'code': [msg]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

        cart.coupon_code = coupon.code
        cart.save(update_fields=['coupon_code'])

        return Response(
            {
                'message': f"Coupon {coupon.code} applied successfully.",
                'cart': CartDetailSerializer(cart).data
            },
            status=status.HTTP_200_OK
        )


class RemoveCouponView(APIView):
    """Remove coupon from the cart."""

    permission_classes = [permissions.AllowAny]

    def delete(self, request):
        cart = get_or_create_cart(request)
        cart.coupon_code = ''
        cart.save(update_fields=['coupon_code'])
        return Response(CartDetailSerializer(cart).data, status=status.HTTP_200_OK)


class MergeCartView(APIView):
    """Merge guest cart items into authenticated user cart."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MergeCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_key = serializer.validated_data['session_key']

        guest_cart = Cart.objects.filter(session_key=session_key).first()
        if guest_cart and guest_cart.items.exists():
            user_cart, _ = Cart.objects.get_or_create(user=request.user)
            for item in guest_cart.items.select_related('product'):
                user_item, created = CartItem.objects.get_or_create(
                    cart=user_cart,
                    product=item.product,
                    defaults={'quantity': item.quantity}
                )
                if not created:
                    user_item.quantity = min(user_item.quantity + item.quantity, item.product.stock, 10)
                    user_item.save(update_fields=['quantity'])

            if guest_cart.coupon_code and not user_cart.coupon_code:
                user_cart.coupon_code = guest_cart.coupon_code
                user_cart.save(update_fields=['coupon_code'])

            guest_cart.items.all().delete()
            guest_cart.delete()
            return Response(CartDetailSerializer(user_cart).data, status=status.HTTP_200_OK)

        user_cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartDetailSerializer(user_cart).data, status=status.HTTP_200_OK)
