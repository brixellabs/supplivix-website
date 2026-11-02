"""
Staff-only REST API endpoints for the Supplivix Admin Dashboard (/admin-panel).
Enforces IsAdminUser permissions on all actions.
"""

import csv
import io
import uuid
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, views
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import User
from catalog.models import Category, Product, Review
from content.models import ContactMessage
from core.models import BlockedIP, BotEvent
from orders.models import Order
from promotions.models import Coupon


class AdminOverviewView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()

        # KPIs
        delivered_orders = Order.objects.filter(status='delivered')
        total_revenue = delivered_orders.aggregate(total=Sum('grand_total'))['total'] or 0
        total_orders_count = Order.objects.count()
        pending_dispatch_count = Order.objects.filter(status__in=['pending', 'confirmed', 'packed']).count()
        out_of_stock_count = Product.objects.filter(stock__lte=0).count()

        # Recent 10 orders
        recent_orders = [
            {
                'id': o.id,
                'order_number': o.number,
                'recipient_name': o.shipping_address_snapshot.get('full_name', 'Guest'),
                'phone': o.shipping_address_snapshot.get('phone', ''),
                'city': o.shipping_address_snapshot.get('city', ''),
                'status': o.status,
                'grand_total': o.grand_total,
                'created_at': o.created_at.isoformat(),
            }
            for o in Order.objects.order_by('-created_at')[:10]
        ]

        # Top 5 products by stock/order
        top_products = [
            {
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'price': p.price,
                'stock': p.stock,
            }
            for p in Product.objects.order_by('-is_featured', '-stock')[:5]
        ]

        # Daily sales over the last 7 days
        sales_timeline = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_orders = Order.objects.filter(
                created_at__date=day
            ).exclude(status='cancelled')
            day_rev = day_orders.aggregate(rev=Sum('grand_total'))['rev'] or 0
            sales_timeline.append({
                'date': day.strftime('%b %d'),
                'orders_count': day_orders.count(),
                'revenue': day_rev,
            })

        return Response({
            'total_revenue': total_revenue,
            'total_orders_count': total_orders_count,
            'pending_dispatch_count': pending_dispatch_count,
            'out_of_stock_count': out_of_stock_count,
            'recent_orders': recent_orders,
            'top_products': top_products,
            'sales_timeline': sales_timeline,
        })


class AdminProductListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Product.objects.select_related('category').order_by('-id')
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        products = [
            {
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'sku': p.sku,
                'category_name': p.category.name if p.category else 'Uncategorized',
                'category_id': p.category_id,
                'product_type': p.product_type,
                'price': p.price,
                'compare_at_price': p.compare_at_price,
                'stock': p.stock,
                'is_active': p.is_active,
                'is_featured': p.is_featured,
            }
            for p in queryset
        ]
        return Response({'results': products, 'count': len(products)})

    def post(self, request):
        data = request.data
        name = data.get('name', '').strip()
        slug = data.get('slug', '').strip().lower()
        if not name:
            return Response({'message': 'Product name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not slug:
            slug = name.lower().replace(' ', '-').replace('/', '-')

        sku = data.get('sku', '').strip() or f"SPLV-{uuid.uuid4().hex[:6].upper()}"

        product = Product.objects.create(
            name=name,
            slug=slug,
            sku=sku,
            category_id=data.get('category_id'),
            product_type=data.get('product_type', 'multivitamin'),
            price=int(data.get('price', 0)),
            compare_at_price=int(data.get('compare_at_price', 0)) or None,
            stock=int(data.get('inventory_count', data.get('stock', 0))),
            description=data.get('description', ''),
            is_active=bool(data.get('is_active', True)),
            is_featured=bool(data.get('is_featured', False)),
        )
        return Response({'message': 'Product created successfully.', 'id': product.id}, status=status.HTTP_201_CREATED)


class AdminProductDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data:
            product.name = data['name'].strip()
        if 'price' in data:
            product.price = int(data['price'])
        if 'compare_at_price' in data:
            product.compare_at_price = int(data['compare_at_price']) if data['compare_at_price'] else None
        if 'stock' in data:
            product.stock = int(data['stock'])
        elif 'inventory_count' in data:
            product.stock = int(data['inventory_count'])
        if 'is_active' in data:
            product.is_active = bool(data['is_active'])
        if 'is_featured' in data:
            product.is_featured = bool(data['is_featured'])
        if 'category_id' in data:
            product.category_id = data['category_id']

        product.save()
        return Response({'message': 'Product updated successfully.'})


class AdminProductCSVExportView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="supplivix_products.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Slug', 'SKU', 'Category', 'Type', 'Price_PKR', 'Compare_Price_PKR', 'Stock', 'Active', 'Featured'])

        for p in Product.objects.select_related('category').all():
            writer.writerow([
                p.id,
                p.name,
                p.slug,
                p.sku,
                p.category.name if p.category else '',
                p.product_type,
                p.price,
                p.compare_at_price or '',
                p.stock,
                p.is_active,
                p.is_featured,
            ])
        return response


class AdminProductCSVImportView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'message': 'No CSV file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        decoded_file = file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created_count = 0
        updated_count = 0

        for row in reader:
            slug = row.get('Slug', '').strip().lower()
            if not slug:
                continue

            name = row.get('Name', '').strip()
            price = int(row.get('Price_PKR', 0))
            stock = int(row.get('Stock', 0))
            sku = row.get('SKU', '').strip() or f"SPLV-{uuid.uuid4().hex[:6].upper()}"

            product, created = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'sku': sku,
                    'price': price,
                    'stock': stock,
                    'product_type': row.get('Type', 'multivitamin'),
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response({
            'message': f'CSV import completed: {created_count} created, {updated_count} updated.',
            'created': created_count,
            'updated': updated_count,
        })


class AdminOrderListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Order.objects.prefetch_related('items').order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) |
                Q(guest_email__icontains=search) |
                Q(shipping_address_snapshot__icontains=search)
            )

        orders = [
            {
                'id': o.id,
                'order_number': o.number,
                'recipient_name': o.shipping_address_snapshot.get('full_name', 'Guest'),
                'email': o.user.email if o.user else o.guest_email,
                'phone': o.shipping_address_snapshot.get('phone', ''),
                'street_address': o.shipping_address_snapshot.get('line1', ''),
                'city': o.shipping_address_snapshot.get('city', ''),
                'province': o.shipping_address_snapshot.get('province', ''),
                'status': o.status,
                'grand_total': o.grand_total,
                'subtotal': o.subtotal,
                'shipping_fee': o.shipping_total,
                'discount_amount': o.discount_total,
                'items_count': o.items.count(),
                'created_at': o.created_at.isoformat(),
            }
            for o in queryset
        ]
        return Response({'results': orders, 'count': len(orders)})


class AdminOrderDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, number):
        try:
            order = Order.objects.prefetch_related('items', 'status_history').get(number=number)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        items = [
            {
                'id': item.id,
                'product_name': item.product_name,
                'unit_price': item.unit_price,
                'quantity': item.quantity,
                'line_total': item.line_total,
            }
            for item in order.items.all()
        ]

        history = [
            {
                'status': h.to_status,
                'notes': h.note,
                'created_at': h.created_at.isoformat(),
            }
            for h in order.status_history.order_by('created_at')
        ]

        snapshot = order.shipping_address_snapshot or {}

        return Response({
            'id': order.id,
            'order_number': order.number,
            'recipient_name': snapshot.get('full_name', 'Guest'),
            'email': order.user.email if order.user else order.guest_email,
            'phone': snapshot.get('phone', ''),
            'street_address': snapshot.get('line1', ''),
            'city': snapshot.get('city', ''),
            'province': snapshot.get('province', ''),
            'postal_code': snapshot.get('postal_code', ''),
            'delivery_notes': order.notes,
            'payment_method': order.payment_method,
            'status': order.status,
            'subtotal': order.subtotal,
            'discount_amount': order.discount_total,
            'shipping_fee': order.shipping_total,
            'grand_total': order.grand_total,
            'created_at': order.created_at.isoformat(),
            'items': items,
            'history': history,
        })


class AdminOrderTransitionView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, number):
        try:
            order = Order.objects.get(number=number)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get('status')
        notes = request.data.get('notes', '')

        try:
            order.transition_to(target_status, user=request.user, note=notes)
            return Response({
                'message': f'Order transitioned to {target_status}.',
                'order_number': order.number,
                'status': order.status,
            })
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminCategoryListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        categories = [
            {
                'id': c.id,
                'name': c.name,
                'slug': c.slug,
                'is_active': c.is_active,
                'sort_order': c.sort_order,
                'products_count': c.products.count(),
            }
            for c in Category.objects.annotate(products_count=Count('products')).order_by('sort_order', 'name')
        ]
        return Response({'results': categories})

    def post(self, request):
        data = request.data
        name = data.get('name', '').strip()
        slug = data.get('slug', '').strip().lower() or name.lower().replace(' ', '-')
        cat = Category.objects.create(
            name=name,
            slug=slug,
            sort_order=int(data.get('sort_order', data.get('position', 0))),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'message': 'Category created.', 'id': cat.id}, status=status.HTTP_201_CREATED)


class AdminCouponListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        coupons = [
            {
                'id': c.id,
                'code': c.code,
                'discount_type': c.discount_type,
                'discount_value': c.discount_value,
                'max_discount_amount': c.max_discount_amount,
                'min_order_amount': c.min_order_amount,
                'usage_limit': c.usage_limit,
                'times_used': c.times_used,
                'is_active': c.is_active,
            }
            for c in Coupon.objects.order_by('-id')
        ]
        return Response({'results': coupons})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        coupon = Coupon.objects.create(
            code=code,
            discount_type=data.get('discount_type', 'percentage'),
            discount_value=int(data.get('discount_value', 10)),
            max_discount_amount=int(data.get('max_discount_amount', 0)) or None,
            min_order_amount=int(data.get('min_order_amount', 0)),
            usage_limit=int(data.get('usage_limit', 0)) or None,
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'message': 'Coupon created successfully.', 'id': coupon.id}, status=status.HTTP_201_CREATED)


class AdminCustomerListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        customers = [
            {
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'phone': u.phone,
                'is_active': u.is_active,
                'date_joined': u.date_joined.isoformat(),
            }
            for u in User.objects.filter(is_staff=False).order_by('-date_joined')
        ]
        return Response({'results': customers})


class AdminCustomerToggleStatusView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            customer = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'message': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        customer.is_active = not customer.is_active
        customer.save()
        return Response({
            'message': f"Customer {'unblocked' if customer.is_active else 'blocked'} successfully.",
            'is_active': customer.is_active,
        })


class AdminReviewListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reviews = [
            {
                'id': r.id,
                'product_name': r.product.name,
                'user_email': r.user.email if r.user else 'Guest',
                'rating': r.rating,
                'title': r.title,
                'content': r.body,
                'is_approved': r.is_approved,
                'created_at': r.created_at.isoformat(),
            }
            for r in Review.objects.select_related('product', 'user').order_by('-created_at')
        ]
        return Response({'results': reviews})


class AdminReviewModerateView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'message': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

        approved = bool(request.data.get('approved', False))
        review.is_approved = approved
        review.save()
        return Response({'message': f"Review {'approved' if approved else 'rejected'}."})


class AdminMessageListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        messages = [
            {
                'id': m.id,
                'name': m.name,
                'email': m.email,
                'phone': m.phone,
                'subject': m.subject,
                'message': m.message,
                'is_read': m.is_read,
                'created_at': m.created_at.isoformat(),
            }
            for m in ContactMessage.objects.order_by('-created_at')
        ]
        return Response({'results': messages})


class AdminMessageMarkReadView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'message': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        msg.is_read = True
        msg.save()
        return Response({'message': 'Message marked as read.'})


class AdminSecurityLogsView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        bot_events = [
            {
                'id': e.id,
                'event_type': e.reason,
                'ip_address': e.ip,
                'details': f"Path: {e.path}, Score: {e.score}",
                'created_at': e.created_at.isoformat(),
            }
            for e in BotEvent.objects.order_by('-created_at')[:50]
        ]

        blocked_ips = [
            {
                'id': b.id,
                'ip_address': b.ip,
                'reason': b.reason,
                'created_at': b.created_at.isoformat(),
            }
            for b in BlockedIP.objects.order_by('-created_at')
        ]

        return Response({
            'bot_events': bot_events,
            'blocked_ips': blocked_ips,
        })


class AdminSecurityUnblockIPView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        ip = request.data.get('ip_address') or request.data.get('ip')
        if not ip:
            return Response({'message': 'IP address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = BlockedIP.objects.filter(ip=ip).delete()
        return Response({'message': f'IP {ip} unblocked.', 'deleted_count': deleted})
