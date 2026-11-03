from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from rest_framework.exceptions import ValidationError

from catalog.models import Product
from content.models import SiteSetting
from promotions.models import Coupon, CouponRedemption

from .models import Order, OrderItem, OrderStatusHistory


def calculate_checkout_quote(cart_items, coupon_code=None, user=None, email=None):
    """
    Compute checkout totals strictly on the server:
    subtotal = sum(item.price * item.quantity)
    discount = coupon discount on eligible subtotal (capped at subtotal)
    shipping = 0 if (subtotal - discount) >= threshold else flat_fee
    grand_total = subtotal - discount + shipping
    """
    if not cart_items:
        raise ValidationError({'cart': 'Cannot quote an empty cart.'})

    subtotal = 0
    item_rows = []

    for item in cart_items:
        product = item.product
        if not product.is_active:
            raise ValidationError({'cart': f"Product {product.name} is no longer available. Please remove it to proceed."})
        unit_price = product.price
        qty = item.quantity
        line_total = unit_price * qty
        subtotal += line_total
        item_rows.append({
            'product': product,
            'product_name': product.name,
            'sku': product.sku,
            'unit_price': unit_price,
            'quantity': qty,
            'line_total': line_total,
        })

    discount = 0
    coupon = None

    if coupon_code:
        clean_code = coupon_code.strip().upper()
        coupon = Coupon.objects.filter(code=clean_code, is_active=True).first()
        if coupon:
            is_valid, _ = coupon.is_valid_now()
            if is_valid and subtotal >= coupon.min_order_amount:
                # Check user limit
                user_allowed = True
                if user and user.is_authenticated:
                    if CouponRedemption.objects.filter(coupon=coupon, user=user).count() >= coupon.usage_limit_per_user:
                        user_allowed = False
                elif email:
                    if CouponRedemption.objects.filter(coupon=coupon, email=email.strip().lower()).count() >= coupon.usage_limit_per_user:
                        user_allowed = False

                if user_allowed:
                    eligible_subtotal = subtotal
                    if coupon.applies_to_category:
                        eligible_subtotal = sum(
                            row['line_total'] for row in item_rows
                            if row['product'].category_id == coupon.applies_to_category_id
                        )
                    discount = coupon.calculate_discount(subtotal, eligible_subtotal)

    subtotal_after_discount = max(0, subtotal - discount)
    threshold = SiteSetting.get_int('free_shipping_threshold', 2000)
    flat_fee = SiteSetting.get_int('flat_shipping_fee', 200)

    if subtotal_after_discount >= threshold:
        shipping = 0
    else:
        shipping = flat_fee

    grand_total = max(0, subtotal - discount) + shipping

    return {
        'subtotal': subtotal,
        'discount_total': discount,
        'shipping_total': shipping,
        'grand_total': grand_total,
        'coupon': coupon,
        'item_rows': item_rows,
        'threshold': threshold,
        'shipping_fee': flat_fee,
    }


@transaction.atomic
def place_cod_order(cart, checkout_data, user=None):
    """
    Atomically places a COD order:
    1. Locks products with select_for_update() and decrements stock.
    2. Locks coupon row with select_for_update() to prevent race conditions exceeding usage limits.
    3. Writes Order, OrderItem snapshots, and OrderStatusHistory row.
    4. Records CouponRedemption if coupon applied.
    5. Clears the cart items.
    """
    items = list(cart.items.select_related('product').all())
    if not items:
        raise ValidationError({'cart': 'Cannot place an order with an empty cart.'})

    # Validate payment method is strictly COD
    if checkout_data.get('payment_method') != 'COD':
        raise ValidationError({'payment_method': 'Cash on Delivery (COD) is the only accepted payment method.'})

    guest_email = checkout_data.get('email', '').strip().lower()
    if not user or not user.is_authenticated:
        if not guest_email:
            raise ValidationError({'email': 'Guest email is required.'})

    # 1. Lock and verify product stock
    product_ids = [item.product_id for item in items]
    locked_products = {
        p.id: p
        for p in Product.objects.select_for_update().filter(id__in=product_ids)
    }

    for item in items:
        p = locked_products.get(item.product_id)
        if not p or not p.is_active:
            raise ValidationError({'cart': f"Product {item.product.name} is no longer available."})
        if p.stock < item.quantity:
            raise ValidationError(
                {'cart': f"Insufficient stock for {p.name}. Only {p.stock} available, you requested {item.quantity}."}
            )

    # 2. Lock coupon if code applied
    coupon_code = cart.coupon_code.strip().upper() if cart.coupon_code else None
    locked_coupon = None
    if coupon_code:
        locked_coupon = Coupon.objects.select_for_update().filter(code=coupon_code, is_active=True).first()
        if locked_coupon:
            is_valid, err = locked_coupon.is_valid_now()
            if not is_valid:
                raise ValidationError({'coupon': err})
            # Check user/guest redemption limit under lock
            if user and user.is_authenticated:
                if CouponRedemption.objects.filter(coupon=locked_coupon, user=user).count() >= locked_coupon.usage_limit_per_user:
                    raise ValidationError({'coupon': 'You have already reached the usage limit for this coupon.'})
            elif guest_email:
                if CouponRedemption.objects.filter(coupon=locked_coupon, email=guest_email).count() >= locked_coupon.usage_limit_per_user:
                    raise ValidationError({'coupon': 'This email has already reached the usage limit for this coupon.'})

    # 3. Calculate authoritative quote
    quote = calculate_checkout_quote(
        cart_items=items,
        coupon_code=locked_coupon.code if locked_coupon else None,
        user=user if user and user.is_authenticated else None,
        email=guest_email
    )

    # 4. Decrement stock
    for item in items:
        p = locked_products[item.product_id]
        p.stock -= item.quantity
        p.save(update_fields=['stock'])

    # 5. Create Order
    shipping_snapshot = {
        'full_name': checkout_data['full_name'],
        'phone': checkout_data['phone'],
        'line1': checkout_data.get('line1') or checkout_data.get('street_address', ''),
        'line2': checkout_data.get('line2', ''),
        'city': checkout_data['city'],
        'province': checkout_data['province'],
        'postal_code': checkout_data.get('postal_code', ''),
    }

    order = Order.objects.create(
        number=Order.generate_order_number(),
        user=user if user and user.is_authenticated else None,
        guest_email=guest_email if not (user and user.is_authenticated) else '',
        status=Order.STATUS_PENDING,
        payment_method='COD',
        subtotal=quote['subtotal'],
        discount_total=quote['discount_total'],
        shipping_total=quote['shipping_total'],
        grand_total=quote['grand_total'],
        coupon_code=locked_coupon.code if locked_coupon else '',
        shipping_address_snapshot=shipping_snapshot,
        notes=checkout_data.get('notes', '')
    )

    # 6. Create OrderItem snapshots
    order_items_to_create = [
        OrderItem(
            order=order,
            product=row['product'],
            product_name=row['product_name'],
            sku=row['sku'],
            unit_price=row['unit_price'],
            quantity=row['quantity'],
            line_total=row['line_total']
        )
        for row in quote['item_rows']
    ]
    OrderItem.objects.bulk_create(order_items_to_create)

    # 7. Record initial status history
    OrderStatusHistory.objects.create(
        order=order,
        from_status='',
        to_status=Order.STATUS_PENDING,
        changed_by=user if user and user.is_authenticated else None,
        note='Order placed with Cash on Delivery (COD)'
    )

    # 8. Record CouponRedemption
    if locked_coupon and quote['discount_total'] > 0:
        CouponRedemption.objects.create(
            coupon=locked_coupon,
            user=user if user and user.is_authenticated else None,
            email=user.email if (user and user.is_authenticated) else guest_email,
            order=order
        )

    # 9. Clear cart
    cart.items.all().delete()
    cart.coupon_code = ''
    cart.save(update_fields=['coupon_code'])

    # 10. Send order confirmation email
    _send_order_confirmation(order.id)

    return order


def _send_order_confirmation(order_id):
    try:
        ord_obj = Order.objects.prefetch_related('items').get(id=order_id)
        recipient = ord_obj.customer_email
        if not recipient:
            return
        items_summary = "\n".join(
            [f"- {item.product_name} x {item.quantity}: Rs. {item.line_total:,}" for item in ord_obj.items.all()]
        )
        subject = f"Order Confirmation - {ord_obj.number} - Supplivix"
        message = (
            f"Dear {ord_obj.shipping_address_snapshot.get('full_name', 'Customer')},\n\n"
            f"Thank you for placing your order with Supplivix.\n\n"
            f"Order Number: {ord_obj.number}\n"
            f"Payment Method: Cash on Delivery (COD)\n"
            f"Status: Pending Confirmation\n\n"
            f"Items:\n{items_summary}\n\n"
            f"Subtotal: Rs. {ord_obj.subtotal:,}\n"
            f"Discount: Rs. {ord_obj.discount_total:,}\n"
            f"Shipping: Rs. {ord_obj.shipping_total:,}\n"
            f"Total Payable at Delivery: Rs. {ord_obj.grand_total:,}\n\n"
            f"Delivery Address:\n"
            f"{ord_obj.shipping_address_snapshot.get('line1', '')}\n"
            f"{ord_obj.shipping_address_snapshot.get('city', '')}, {ord_obj.shipping_address_snapshot.get('province', '')}\n"
            f"Phone: {ord_obj.shipping_address_snapshot.get('phone', '')}\n\n"
            f"Our team will prepare your package. Please keep exact cash ready upon arrival.\n\n"
            f"Regards,\nSupplivix Team"
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'orders@supplivix.com'),
            recipient_list=[recipient],
            fail_silently=True,
        )
    except Exception:
        pass

