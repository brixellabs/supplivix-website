from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.views import get_or_create_cart
from core.security import evaluate_risk
from promotions.models import CouponRedemption

from .models import Order
from .serializers import (
    CheckoutQuoteSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    PlaceOrderSerializer,
    TrackOrderSerializer,
)
from .services import calculate_checkout_quote, place_cod_order


class CheckoutQuoteView(APIView):
    """Calculate checkout totals strictly on the server."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cart = get_or_create_cart(request)
        serializer = CheckoutQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coupon_code = serializer.validated_data.get('coupon_code') or cart.coupon_code
        email = serializer.validated_data.get('email') or (request.user.email if request.user.is_authenticated else None)

        quote = calculate_checkout_quote(
            cart_items=list(cart.items.select_related('product').all()),
            coupon_code=coupon_code,
            user=request.user if request.user.is_authenticated else None,
            email=email
        )

        return Response(
            {
                'subtotal': quote['subtotal'],
                'discount_total': quote['discount_total'],
                'shipping_total': quote['shipping_total'],
                'grand_total': quote['grand_total'],
                'coupon_code': quote['coupon'].code if quote['coupon'] else '',
                'free_shipping_threshold': quote['threshold'],
                'shipping_fee': quote['shipping_fee'],
            },
            status=status.HTTP_200_OK
        )


class PlaceOrderView(APIView):
    """Place a Cash on Delivery (COD) order atomically."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'order'

    def post(self, request):
        action, score = evaluate_risk(request)
        if action == 'honeypot_fake_success':
            return Response(
                {
                    'message': 'Order placed successfully.',
                    'order': {
                        'number': 'SPLV-BOT-TRAP-9999',
                        'status': 'pending',
                        'payment_method': 'cod',
                        'grand_total': 2450,
                    }
                },
                status=status.HTTP_201_CREATED
            )
        if action == 'token_expired':
            return Response(
                {'code': 'token_expired', 'message': 'Checkout session expired. Please refresh and try again.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if action == 'block':
            return Response(
                {'code': 'bot_blocked', 'message': 'Access denied due to automated activity detection.', 'fields': {}},
                status=status.HTTP_403_FORBIDDEN
            )
        if action == 'challenge_required':
            return Response(
                {
                    'code': 'challenge_required',
                    'message': 'Security verification challenge required before order placement.',
                    'fields': {'turnstile_token': ['Turnstile challenge verification required.']}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        cart = get_or_create_cart(request)
        if not cart.items.exists():
            return Response(
                {'code': 'empty_cart', 'message': 'Cannot checkout with an empty cart.', 'fields': {}},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Double-submit protection via idempotency key
        idempotency_key = data.get('idempotency_key')
        if idempotency_key:
            cache_key = f"order_idempotency_{idempotency_key}"
            cached_order_number = cache.get(cache_key)
            if cached_order_number:
                order = Order.objects.filter(number=cached_order_number).first()
                if order:
                    return Response(
                        {
                            'message': 'Order placed successfully.',
                            'order': OrderDetailSerializer(order).data
                        },
                        status=status.HTTP_200_OK
                    )

        user = request.user if request.user.is_authenticated else None
        order = place_cod_order(cart=cart, checkout_data=data, user=user)

        if idempotency_key:
            cache.set(f"order_idempotency_{idempotency_key}", order.number, timeout=600)

        return Response(
            {
                'message': 'Order placed successfully.',
                'order': OrderDetailSerializer(order).data
            },
            status=status.HTTP_201_CREATED
        )


class OrderListView(APIView):
    """List orders for authenticated customer or create an order via POST."""

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        return PlaceOrderView().post(request)


class OrderDetailView(APIView):
    """Retrieve order detail by order number."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, number):
        order = Order.objects.filter(number=number).first()
        if not order:
            return Response(
                {'code': 'not_found', 'message': 'Order not found.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        # Object-level security: authenticated users only see their own orders
        if request.user.is_authenticated:
            if order.user and order.user != request.user and not request.user.is_staff:
                return Response(
                    {'code': 'forbidden', 'message': 'You do not have permission to view this order.', 'fields': {}},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = OrderDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CancelOrderView(APIView):
    """Cancel order while in pending or confirmed status, restoring stock and coupon."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, number):
        order = Order.objects.filter(number=number).first()
        if not order:
            return Response(
                {'code': 'not_found', 'message': 'Order not found.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user.is_authenticated:
            if order.user and order.user != request.user and not request.user.is_staff:
                return Response(
                    {'code': 'forbidden', 'message': 'You do not have permission to cancel this order.', 'fields': {}},
                    status=status.HTTP_403_FORBIDDEN
                )

        if order.status not in [Order.STATUS_PENDING, Order.STATUS_CONFIRMED]:
            return Response(
                {
                    'code': 'cannot_cancel',
                    'message': f"Orders with status '{order.get_status_display()}' cannot be cancelled.",
                    'fields': {}
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock
        for item in order.items.select_related('product'):
            if item.product:
                item.product.stock += item.quantity
                item.product.save(update_fields=['stock'])

        # Release coupon redemption
        CouponRedemption.objects.filter(order=order).delete()

        # Update order status
        user = request.user if request.user.is_authenticated else None
        order.transition_to(
            Order.STATUS_CANCELLED,
            user=user,
            note='Order cancelled by customer.'
        )

        return Response(
            {
                'message': 'Order has been cancelled and stock restored.',
                'order': OrderDetailSerializer(order).data
            },
            status=status.HTTP_200_OK
        )


class TrackOrderView(APIView):
    """Lookup order for guests using order number and normalized phone number."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TrackOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_number = serializer.validated_data['order_number'].strip()
        phone = serializer.validated_data['phone']

        order = Order.objects.filter(number=order_number).first()
        if not order:
            return Response(
                {'code': 'not_found', 'message': 'No order found with these credentials.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        order_phone = order.shipping_address_snapshot.get('phone', '')
        if order_phone != phone:
            return Response(
                {'code': 'not_found', 'message': 'No order found with these credentials.', 'fields': {}},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_200_OK)
