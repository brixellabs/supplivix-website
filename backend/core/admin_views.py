"""
Staff-only REST API endpoints for the Supplivix Admin Dashboard (/admin-panel).
Enforces IsAdminUser permissions on all actions and logs mutating operations to AdminAuditLog.
"""

import csv
import io
import random
import string
import uuid
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, views
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import User
from catalog.models import Category, Product, ProductFAQ, ProductImage, Review
from content.models import ContactMessage, SiteSetting, WaitlistEntry
from core.models import AdminAuditLog, BlockedIP, BotEvent, FailedLoginLog
from orders.models import Order
from promotions.models import Coupon


def log_admin_action(request, action, target_model, target_id='', details=''):
    """Audit helper: record who, what, when, IP for staff actions."""
    user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '127.0.0.1')).split(',')[0].strip()
    return AdminAuditLog.objects.create(
        user=user,
        action=action,
        target_model=target_model,
        target_id=str(target_id),
        details=str(details)[:1000],
        ip_address=ip or '127.0.0.1',
    )


def paginate_queryset(queryset, request, default_page_size=20):
    """Helper to paginate queryset server-side."""
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.query_params.get('page_size', default_page_size))))
    except (ValueError, TypeError):
        page_size = default_page_size

    total_count = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    items = list(queryset[start:end])
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return {
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
        'results': items,
    }


# ==============================================================================
# 1. OVERVIEW & KPIS
# ==============================================================================

class AdminOverviewView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        thirty_days_ago = now - timedelta(days=30)

        # 1. Total delivered revenue and total orders
        delivered_orders = Order.objects.filter(status='delivered')
        total_revenue = delivered_orders.aggregate(total=Sum('grand_total'))['total'] or 0
        total_orders_count = Order.objects.count()

        # 2. Today orders count and revenue (aggregate query)
        today_stats = Order.objects.filter(created_at__date=today).exclude(status='cancelled').aggregate(
            orders=Count('id'),
            revenue=Sum('grand_total')
        )
        today_orders_count = today_stats['orders'] or 0
        today_revenue = today_stats['revenue'] or 0

        # 3. 30-day orders count and revenue (aggregate query)
        thirty_day_stats = Order.objects.filter(created_at__gte=thirty_days_ago).exclude(status='cancelled').aggregate(
            orders=Count('id'),
            revenue=Sum('grand_total')
        )
        thirty_day_orders_count = thirty_day_stats['orders'] or 0
        thirty_day_revenue = thirty_day_stats['revenue'] or 0

        # 4. COD pending amount: orders pending dispatch or in transit awaiting cash collection
        cod_pending_amount = Order.objects.filter(
            payment_method='COD',
            status__in=['pending', 'confirmed', 'packed', 'shipped']
        ).aggregate(total=Sum('grand_total'))['total'] or 0

        pending_dispatch_count = Order.objects.filter(status__in=['pending', 'confirmed', 'packed']).count()
        out_of_stock_count = Product.objects.filter(stock__lte=0).count()

        # 5. Orders by status breakdown (aggregate query)
        status_counts = dict(
            Order.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        for st in ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cod_collected', 'returned', 'cancelled']:
            status_counts.setdefault(st, 0)

        # 6. Low stock products list (stock <= 10)
        low_stock_list = [
            {
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'sku': p.sku,
                'stock': p.stock,
                'price': p.price,
                'category_name': p.category.name if p.category else 'Uncategorized',
            }
            for p in Product.objects.filter(stock__lte=10).select_related('category').order_by('stock')[:10]
        ]

        # 7. New users in last 30 days
        new_users_count = User.objects.filter(is_staff=False, date_joined__gte=thirty_days_ago).count()

        # 8. Recent 10 orders
        recent_orders = [
            {
                'id': o.id,
                'order_number': o.number,
                'recipient_name': (o.shipping_address_snapshot or {}).get('full_name', 'Guest'),
                'phone': (o.shipping_address_snapshot or {}).get('phone', ''),
                'city': (o.shipping_address_snapshot or {}).get('city', ''),
                'status': o.status,
                'grand_total': o.grand_total,
                'created_at': o.created_at.isoformat(),
            }
            for o in Order.objects.order_by('-created_at')[:10]
        ]

        # 9. Top 5 products by stock and featured status
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

        # 10. 30-day timeline for revenue line chart (aggregate group by date)
        timeline_map = {
            item['created_at__date'].strftime('%b %d'): item
            for item in Order.objects.filter(
                created_at__gte=thirty_days_ago
            ).exclude(status='cancelled').values('created_at__date').annotate(
                revenue=Sum('grand_total'),
                orders_count=Count('id')
            )
        }

        sales_timeline = []
        for i in range(29, -1, -1):
            day = (now - timedelta(days=i)).date()
            label = day.strftime('%b %d')
            entry = timeline_map.get(label, {})
            sales_timeline.append({
                'date': label,
                'orders_count': entry.get('orders_count', 0),
                'revenue': entry.get('revenue', 0) or 0,
            })

        return Response({
            'total_revenue': total_revenue,
            'total_orders_count': total_orders_count,
            'today_orders_count': today_orders_count,
            'today_revenue': today_revenue,
            'thirty_day_orders_count': thirty_day_orders_count,
            'thirty_day_revenue': thirty_day_revenue,
            'cod_pending_amount': cod_pending_amount,
            'pending_dispatch_count': pending_dispatch_count,
            'out_of_stock_count': out_of_stock_count,
            'new_users_count': new_users_count,
            'orders_by_status': status_counts,
            'low_stock_list': low_stock_list,
            'recent_orders': recent_orders,
            'top_products': top_products,
            'sales_timeline': sales_timeline,
        })


# ==============================================================================
# 2. PRODUCTS MODULE
# ==============================================================================

class AdminProductListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Product.objects.select_related('category').prefetch_related('images').order_by('-id')

        # Filters
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(sku__icontains=search))

        category = request.query_params.get('category')
        if category:
            if category.isdigit():
                queryset = queryset.filter(category_id=int(category))
            else:
                queryset = queryset.filter(category__slug=category)

        product_type = request.query_params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)

        is_active = request.query_params.get('is_active')
        if is_active in ['true', '1']:
            queryset = queryset.filter(is_active=True)
        elif is_active in ['false', '0']:
            queryset = queryset.filter(is_active=False)

        stock_status = request.query_params.get('stock_status')
        if stock_status == 'in_stock':
            queryset = queryset.filter(stock__gt=10)
        elif stock_status == 'low_stock':
            queryset = queryset.filter(stock__gt=0, stock__lte=10)
        elif stock_status == 'out_of_stock':
            queryset = queryset.filter(stock__lte=0)

        # Sorting
        ordering = request.query_params.get('ordering')
        if ordering in ['price', '-price', 'stock', '-stock', 'name', '-name', 'created_at', '-created_at', '-id']:
            queryset = queryset.order_by(ordering)

        paginated = paginate_queryset(queryset, request)
        results = [
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
                'seo_title': p.seo_title,
                'seo_description': p.seo_description,
                'primary_image': p.images.first().image.url if p.images.exists() else None,
            }
            for p in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': results,
        })

    def post(self, request):
        data = request.data
        name = data.get('name', '').strip()
        slug = data.get('slug', '').strip().lower()
        if not name:
            return Response({'message': 'Product name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not slug:
            slug = name.lower().replace(' ', '-').replace('/', '-')

        sku = data.get('sku', '').strip() or f"SPLV-{uuid.uuid4().hex[:6].upper()}"

        try:
            price = int(data.get('price', 0))
            if price <= 0:
                return Response({'message': 'Price must be a positive integer in PKR.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'message': 'Invalid price format.'}, status=status.HTTP_400_BAD_REQUEST)

        compare_at = data.get('compare_at_price')
        compare_price = int(compare_at) if compare_at else None

        stock = int(data.get('inventory_count', data.get('stock', 0)))

        category_id = data.get('category_id')
        if not category_id:
            category = Category.objects.filter(is_active=True).first()
            category_id = category.id if category else None

        product = Product.objects.create(
            name=name,
            slug=slug,
            sku=sku,
            category_id=category_id,
            product_type=data.get('product_type', 'multivitamin'),
            price=price,
            compare_at_price=compare_price,
            stock=stock,
            short_description=data.get('short_description', ''),
            description=data.get('description', ''),
            seo_title=data.get('seo_title', '')[:70],
            seo_description=data.get('seo_description', '')[:170],
            is_active=bool(data.get('is_active', True)),
            is_featured=bool(data.get('is_featured', False)),
        )

        log_admin_action(request, 'create_product', 'Product', product.id, f"Created {product.name} (SKU: {product.sku})")
        return Response({'message': 'Product created successfully.', 'id': product.id}, status=status.HTTP_201_CREATED)


class AdminProductDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            product = Product.objects.select_related('category').prefetch_related('images', 'faqs').get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        images = [
            {'id': img.id, 'image': img.image.url, 'alt_text': img.alt_text, 'sort_order': img.sort_order}
            for img in product.images.all()
        ]
        faqs = [
            {'id': f.id, 'question': f.question, 'answer': f.answer, 'sort_order': f.sort_order}
            for f in product.faqs.all()
        ]

        return Response({
            'id': product.id,
            'name': product.name,
            'slug': product.slug,
            'sku': product.sku,
            'category_id': product.category_id,
            'category_name': product.category.name if product.category else '',
            'product_type': product.product_type,
            'price': product.price,
            'compare_at_price': product.compare_at_price,
            'stock': product.stock,
            'short_description': product.short_description,
            'description': product.description,
            'seo_title': product.seo_title,
            'seo_description': product.seo_description,
            'is_active': product.is_active,
            'is_featured': product.is_featured,
            'images': images,
            'faqs': faqs,
        })

    def patch(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data:
            product.name = data['name'].strip()
        if 'slug' in data:
            product.slug = data['slug'].strip().lower()
        if 'price' in data:
            product.price = int(data['price'])
        if 'compare_at_price' in data:
            product.compare_at_price = int(data['compare_at_price']) if data['compare_at_price'] else None
        if 'stock' in data:
            product.stock = int(data['stock'])
        elif 'inventory_count' in data:
            product.stock = int(data['inventory_count'])
        if 'short_description' in data:
            product.short_description = data['short_description']
        if 'description' in data:
            product.description = data['description']
        if 'seo_title' in data:
            product.seo_title = data['seo_title'][:70]
        if 'seo_description' in data:
            product.seo_description = data['seo_description'][:170]
        if 'is_active' in data:
            product.is_active = bool(data['is_active'])
        if 'is_featured' in data:
            product.is_featured = bool(data['is_featured'])
        if 'category_id' in data:
            product.category_id = data['category_id']
        if 'product_type' in data:
            product.product_type = data['product_type']

        product.save()
        log_admin_action(request, 'update_product', 'Product', product.id, f"Updated fields on {product.name}")
        return Response({'message': 'Product updated successfully.'})

    def delete(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        name = product.name
        product.delete()
        log_admin_action(request, 'delete_product', 'Product', pk, f"Deleted product {name}")
        return Response({'message': f'Product {name} deleted successfully.'})


class AdminProductBulkStatusView(views.APIView):
    """Bulk activate or deactivate products."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        ids = request.data.get('ids', [])
        raw_active = request.data.get('is_active')
        if isinstance(raw_active, str):
            is_active = raw_active.lower() in ['true', '1', 'yes']
        else:
            is_active = bool(raw_active)

        if not ids:
            return Response({'message': 'No product IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        count = Product.objects.filter(id__in=ids).update(is_active=is_active)
        action_name = 'bulk_activate' if is_active else 'bulk_deactivate'
        log_admin_action(request, action_name, 'Product', '', f"{action_name} on {count} products (IDs: {ids})")
        return Response({'message': f"{count} products {'activated' if is_active else 'deactivated'} successfully."})


class AdminProductImageUploadView(views.APIView):
    """Upload product image with alt text (accepts JPEG, PNG, WebP, SVG; max 2 MB)."""
    permission_classes = [IsAdminUser]

    ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'message': 'No image file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        if image_file.size > self.MAX_FILE_SIZE:
            return Response({'message': 'Image exceeds maximum allowed size of 2 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        content_type = getattr(image_file, 'content_type', '')
        if content_type not in self.ALLOWED_MIME_TYPES:
            return Response(
                {'message': f'Unsupported format {content_type}. Accepted formats: JPEG, PNG, WebP, SVG.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alt_text = request.data.get('alt_text', '').strip() or product.name
        sort_order = int(request.data.get('sort_order', product.images.count()))

        img = ProductImage.objects.create(
            product=product,
            image=image_file,
            alt_text=alt_text,
            sort_order=sort_order,
        )

        log_admin_action(request, 'upload_product_image', 'ProductImage', img.id, f"Uploaded image for {product.name}")
        return Response({
            'message': 'Image uploaded successfully.',
            'id': img.id,
            'image_url': img.image.url,
            'alt_text': img.alt_text,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, pk, image_id):
        try:
            img = ProductImage.objects.get(pk=image_id, product_id=pk)
        except ProductImage.DoesNotExist:
            return Response({'message': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)

        img.delete()
        log_admin_action(request, 'delete_product_image', 'ProductImage', image_id, f"Deleted image from product {pk}")
        return Response({'message': 'Image deleted successfully.'})


class AdminProductFAQView(views.APIView):
    """Manage product FAQs feeding AEO."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        q = request.data.get('question', '').strip()
        a = request.data.get('answer', '').strip()
        if not q or not a:
            return Response({'message': 'Question and answer are required.'}, status=status.HTTP_400_BAD_REQUEST)

        faq = ProductFAQ.objects.create(
            product=product,
            question=q,
            answer=a,
            sort_order=int(request.data.get('sort_order', product.faqs.count()))
        )
        log_admin_action(request, 'create_product_faq', 'ProductFAQ', faq.id, f"Added FAQ to {product.name}")
        return Response({'message': 'FAQ created.', 'id': faq.id}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk, faq_id):
        try:
            faq = ProductFAQ.objects.get(pk=faq_id, product_id=pk)
        except ProductFAQ.DoesNotExist:
            return Response({'message': 'FAQ not found.'}, status=status.HTTP_404_NOT_FOUND)

        faq.delete()
        log_admin_action(request, 'delete_product_faq', 'ProductFAQ', faq_id, f"Deleted FAQ from product {pk}")
        return Response({'message': 'FAQ deleted.'})


class AdminProductCSVExportView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="supplivix_products.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Name', 'Slug', 'SKU', 'Category', 'Type', 'Price_PKR', 'Compare_Price_PKR', 'Stock', 'Active', 'Featured', 'SEO_Title', 'SEO_Description'])

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
                p.seo_title,
                p.seo_description,
            ])
        log_admin_action(request, 'export_products_csv', 'Product', '', 'Exported all catalog products to CSV')
        return response


class AdminProductCSVImportView(views.APIView):
    """Bulk update prices and stocks or create products from CSV."""
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
            price = int(row.get('Price_PKR', row.get('price', 0)))
            stock = int(row.get('Stock', row.get('stock', 0)))
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

        msg = f'CSV update completed: {created_count} created, {updated_count} updated.'
        log_admin_action(request, 'import_products_csv', 'Product', '', msg)
        return Response({'message': msg, 'created': created_count, 'updated': updated_count})


# ==============================================================================
# 3. CATEGORIES MODULE
# ==============================================================================

class AdminCategoryListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        categories_qs = Category.objects.annotate(products_count=Count('products')).order_by('sort_order', 'name')
        categories = [
            {
                'id': c.id,
                'name': c.name,
                'slug': c.slug,
                'parent_id': c.parent_id,
                'parent_name': c.parent.name if c.parent else None,
                'description': c.description,
                'is_active': c.is_active,
                'sort_order': c.sort_order,
                'products_count': c.products_count,
            }
            for c in categories_qs
        ]
        return Response({'results': categories})

    def post(self, request):
        data = request.data
        name = data.get('name', '').strip()
        slug = data.get('slug', '').strip().lower() or name.lower().replace(' ', '-')
        parent_id = data.get('parent_id') or None
        sort_order = int(data.get('sort_order', 0))

        cat = Category.objects.create(
            name=name,
            slug=slug,
            parent_id=parent_id,
            description=data.get('description', ''),
            sort_order=sort_order,
            is_active=bool(data.get('is_active', True)),
        )
        log_admin_action(request, 'create_category', 'Category', cat.id, f"Created category {cat.name}")
        return Response({'message': 'Category created.', 'id': cat.id}, status=status.HTTP_201_CREATED)


class AdminCategoryDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            cat = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({'message': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data:
            cat.name = data['name'].strip()
        if 'slug' in data:
            cat.slug = data['slug'].strip().lower()
        if 'parent_id' in data:
            cat.parent_id = data['parent_id'] or None
        if 'sort_order' in data:
            cat.sort_order = int(data['sort_order'])
        if 'is_active' in data:
            cat.is_active = bool(data['is_active'])
        if 'description' in data:
            cat.description = data['description']

        cat.save()
        log_admin_action(request, 'update_category', 'Category', cat.id, f"Updated category {cat.name}")
        return Response({'message': 'Category updated successfully.'})

    def delete(self, request, pk):
        try:
            cat = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({'message': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        if cat.products.exists():
            return Response(
                {'message': f'Cannot delete category containing {cat.products.count()} active products.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = cat.name
        cat.delete()
        log_admin_action(request, 'delete_category', 'Category', pk, f"Deleted category {name}")
        return Response({'message': f'Category {name} deleted.'})


class AdminCategoryReorderView(views.APIView):
    """Reorder categories sort order."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        order_list = request.data.get('order', [])
        for item in order_list:
            cat_id = item.get('id')
            sort_order = item.get('sort_order', 0)
            if cat_id is not None:
                Category.objects.filter(id=cat_id).update(sort_order=sort_order)

        log_admin_action(request, 'reorder_categories', 'Category', '', f"Reordered {len(order_list)} categories")
        return Response({'message': 'Categories reordered successfully.'})


# ==============================================================================
# 4. ORDERS MODULE
# ==============================================================================

class AdminOrderListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Order.objects.prefetch_related('items').order_by('-created_at')

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        city = request.query_params.get('city')
        if city:
            queryset = queryset.filter(shipping_address_snapshot__city__iexact=city)

        cod_collected = request.query_params.get('cod_collected')
        if cod_collected in ['true', '1']:
            queryset = queryset.filter(status='cod_collected')

        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) |
                Q(guest_email__icontains=search) |
                Q(user__email__icontains=search) |
                Q(shipping_address_snapshot__icontains=search)
            )

        # Sorting
        ordering = request.query_params.get('ordering')
        if ordering in ['created_at', '-created_at', 'grand_total', '-grand_total', 'status', '-status']:
            queryset = queryset.order_by(ordering)

        paginated = paginate_queryset(queryset, request)
        orders = [
            {
                'id': o.id,
                'order_number': o.number,
                'recipient_name': (o.shipping_address_snapshot or {}).get('full_name', 'Guest'),
                'email': o.user.email if o.user else o.guest_email,
                'phone': (o.shipping_address_snapshot or {}).get('phone', ''),
                'street_address': (o.shipping_address_snapshot or {}).get('line1', ''),
                'city': (o.shipping_address_snapshot or {}).get('city', ''),
                'province': (o.shipping_address_snapshot or {}).get('province', ''),
                'status': o.status,
                'grand_total': o.grand_total,
                'subtotal': o.subtotal,
                'shipping_fee': o.shipping_total,
                'discount_amount': o.discount_total,
                'coupon_code': o.coupon_code,
                'items_count': o.items.count(),
                'created_at': o.created_at.isoformat(),
            }
            for o in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': orders,
        })


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
                'sku': item.sku,
                'unit_price': item.unit_price,
                'quantity': item.quantity,
                'line_total': item.line_total,
            }
            for item in order.items.all()
        ]

        history = [
            {
                'status': h.to_status,
                'from_status': h.from_status,
                'changed_by': str(h.changed_by) if h.changed_by else 'System',
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
            'street_address2': snapshot.get('line2', ''),
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
            'coupon_code': order.coupon_code,
            'created_at': order.created_at.isoformat(),
            'items': items,
            'history': history,
        })


class AdminOrderTransitionView(views.APIView):
    """Transition order status, logging to OrderStatusHistory. Restores stock on cancellation."""
    permission_classes = [IsAdminUser]

    def post(self, request, number):
        try:
            order = Order.objects.get(number=number)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_status = request.data.get('status')
        notes = request.data.get('notes', '')

        try:
            if target_status == 'cancelled':
                order.cancel(user=request.user, note=notes or 'Cancelled by staff admin')
            else:
                order.transition_to(target_status, user=request.user, note=notes)

            log_admin_action(
                request,
                'order_transition',
                'Order',
                order.number,
                f"Transitioned to {target_status}. Notes: {notes}"
            )
            return Response({
                'message': f'Order transitioned to {order.status}.',
                'order_number': order.number,
                'status': order.status,
            })
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminOrderMarkCODCollectedView(views.APIView):
    """Mark Cash on Delivery as collected."""
    permission_classes = [IsAdminUser]

    def post(self, request, number):
        try:
            order = Order.objects.get(number=number)
        except Order.DoesNotExist:
            return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            order.transition_to('cod_collected', user=request.user, note='Cash on Delivery collected from courier')
            log_admin_action(request, 'mark_cod_collected', 'Order', order.number, 'Marked COD collected')
            return Response({'message': 'COD collected successfully recorded.', 'status': order.status})
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminOrderCSVExportView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="supplivix_orders.csv"'

        writer = csv.writer(response)
        writer.writerow(['Order_Number', 'Date', 'Recipient_Name', 'Phone', 'City', 'Province', 'Status', 'Payment_Method', 'Subtotal_PKR', 'Discount_PKR', 'Shipping_PKR', 'Grand_Total_PKR'])

        for o in Order.objects.all().order_by('-created_at'):
            snapshot = o.shipping_address_snapshot or {}
            writer.writerow([
                o.number,
                o.created_at.strftime('%Y-%m-%d %H:%M'),
                snapshot.get('full_name', ''),
                snapshot.get('phone', ''),
                snapshot.get('city', ''),
                snapshot.get('province', ''),
                o.status,
                o.payment_method,
                o.subtotal,
                o.discount_total,
                o.shipping_total,
                o.grand_total,
            ])
        log_admin_action(request, 'export_orders_csv', 'Order', '', 'Exported all orders to CSV')
        return response


# ==============================================================================
# 5. COUPONS MODULE
# ==============================================================================

class AdminCouponListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        coupons_qs = Coupon.objects.annotate(
            redemptions_count=Count('redemptions')
        ).select_related('applies_to_category').order_by('-id')

        coupons = [
            {
                'id': c.id,
                'code': c.code,
                'type': c.type,
                'discount_type': 'percentage' if c.type == 'percent' else 'fixed',
                'value': c.value,
                'discount_value': c.value,
                'min_order_amount': c.min_order_amount,
                'max_discount_amount': c.max_discount_amount,
                'usage_limit_total': c.usage_limit_total,
                'usage_limit': c.usage_limit_total,
                'usage_limit_per_user': c.usage_limit_per_user,
                'starts_at': c.starts_at.isoformat() if c.starts_at else None,
                'ends_at': c.ends_at.isoformat() if c.ends_at else None,
                'applies_to_category_id': c.applies_to_category_id,
                'applies_to_category_name': c.applies_to_category.name if c.applies_to_category else 'All Categories',
                'is_active': c.is_active,
                'times_used': c.redemptions_count,
            }
            for c in coupons_qs
        ]
        return Response({'results': coupons})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        if not code:
            return Response({'message': 'Coupon code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_type = data.get('type') or data.get('discount_type', 'percent')
        coupon_type = 'percent' if raw_type in ['percentage', 'percent'] else 'fixed'

        value = int(data.get('value', data.get('discount_value', 10)))
        min_order = int(data.get('min_order_amount', 0))
        max_discount = data.get('max_discount_amount')
        max_discount_val = int(max_discount) if max_discount else None
        usage_total = data.get('usage_limit_total', data.get('usage_limit'))
        usage_total_val = int(usage_total) if usage_total else None

        coupon = Coupon.objects.create(
            code=code,
            type=coupon_type,
            value=value,
            min_order_amount=min_order,
            max_discount_amount=max_discount_val,
            usage_limit_total=usage_total_val,
            usage_limit_per_user=int(data.get('usage_limit_per_user', 1)),
            applies_to_category_id=data.get('applies_to_category_id') or None,
            is_active=bool(data.get('is_active', True)),
        )
        log_admin_action(request, 'create_coupon', 'Coupon', coupon.id, f"Created coupon {coupon.code}")
        return Response({'message': 'Coupon created successfully.', 'id': coupon.id}, status=status.HTTP_201_CREATED)


class AdminCouponDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'message': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'code' in data:
            coupon.code = data['code'].strip().upper()
        if 'type' in data or 'discount_type' in data:
            raw_type = data.get('type', data.get('discount_type'))
            coupon.type = 'percent' if raw_type in ['percentage', 'percent'] else 'fixed'
        if 'value' in data or 'discount_value' in data:
            coupon.value = int(data.get('value', data.get('discount_value')))
        if 'min_order_amount' in data:
            coupon.min_order_amount = int(data['min_order_amount'])
        if 'max_discount_amount' in data:
            val = data['max_discount_amount']
            coupon.max_discount_amount = int(val) if val else None
        if 'usage_limit_total' in data or 'usage_limit' in data:
            val = data.get('usage_limit_total', data.get('usage_limit'))
            coupon.usage_limit_total = int(val) if val else None
        if 'is_active' in data:
            coupon.is_active = bool(data['is_active'])

        coupon.save()
        log_admin_action(request, 'update_coupon', 'Coupon', coupon.id, f"Updated coupon {coupon.code}")
        return Response({'message': 'Coupon updated successfully.'})

    def delete(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'message': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        code = coupon.code
        coupon.delete()
        log_admin_action(request, 'delete_coupon', 'Coupon', pk, f"Deleted coupon {code}")
        return Response({'message': f'Coupon {code} deleted.'})


class AdminCouponGenerateCodeView(views.APIView):
    """Generate unique random coupon token."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        prefix = request.query_params.get('prefix', 'SPLV').upper()
        chars = string.ascii_uppercase + string.digits
        for _ in range(10):
            token = f"{prefix}-" + ''.join(random.choices(chars, k=6))
            if not Coupon.objects.filter(code=token).exists():
                return Response({'code': token})
        return Response({'code': f"{prefix}-{uuid.uuid4().hex[:6].upper()}"})


class AdminCouponRedemptionsView(views.APIView):
    """List redemptions of a specific coupon."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            coupon = Coupon.objects.get(pk=pk)
        except Coupon.DoesNotExist:
            return Response({'message': 'Coupon not found.'}, status=status.HTTP_404_NOT_FOUND)

        redemptions = [
            {
                'id': r.id,
                'order_number': r.order.number,
                'email': r.user.email if r.user else r.email,
                'discount_amount': r.order.discount_total,
                'grand_total': r.order.grand_total,
                'redeemed_at': r.created_at.isoformat(),
            }
            for r in coupon.redemptions.select_related('order', 'user').order_by('-created_at')
        ]
        return Response({
            'coupon_code': coupon.code,
            'count': len(redemptions),
            'results': redemptions,
        })


# ==============================================================================
# 6. SHIPPING & SETTINGS MODULE
# ==============================================================================

class AdminSettingsView(views.APIView):
    """View and update site settings (free shipping threshold, flat fee, store contact, site mode, launch date)."""
    permission_classes = [IsAdminUser]

    KEYS = [
        'free_shipping_threshold',
        'flat_shipping_fee',
        'store_phone',
        'store_email',
        'corporate_address',
        'site_mode',
        'launch_date',
    ]

    def get(self, request):
        settings_data = {}
        for k in self.KEYS:
            settings_data[k] = SiteSetting.get_setting(k, '')
        settings_data['free_shipping_threshold'] = SiteSetting.get_int('free_shipping_threshold', 2000)
        settings_data['flat_shipping_fee'] = SiteSetting.get_int('flat_shipping_fee', 200)
        return Response(settings_data)

    def patch(self, request):
        updated = {}
        for key, val in request.data.items():
            if key in self.KEYS:
                obj, _ = SiteSetting.objects.update_or_create(
                    key=key,
                    defaults={'value': str(val)}
                )
                updated[key] = obj.value

        log_admin_action(request, 'update_site_settings', 'SiteSetting', '', f"Updated settings: {list(updated.keys())}")
        return Response({'message': 'Settings updated successfully.', 'settings': updated})


# ==============================================================================
# 7. CUSTOMERS MODULE
# ==============================================================================

class AdminCustomerListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = User.objects.filter(is_staff=False).annotate(
            orders_count=Count('orders')
        ).order_by('-date_joined')

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(full_name__icontains=search) |
                Q(phone__icontains=search)
            )

        paginated = paginate_queryset(queryset, request)
        customers = [
            {
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'phone': u.phone,
                'is_active': u.is_active,
                'orders_count': u.orders_count,
                'date_joined': u.date_joined.isoformat(),
            }
            for u in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': customers,
        })


class AdminCustomerOrdersView(views.APIView):
    """View customer order history."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'message': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        orders = [
            {
                'id': o.id,
                'order_number': o.number,
                'grand_total': o.grand_total,
                'status': o.status,
                'payment_method': o.payment_method,
                'created_at': o.created_at.isoformat(),
            }
            for o in user.orders.all().order_by('-created_at')
        ]
        return Response({
            'customer_email': user.email,
            'customer_name': user.full_name,
            'count': len(orders),
            'results': orders,
        })


class AdminCustomerToggleStatusView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            customer = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'message': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        customer.is_active = not customer.is_active
        customer.save()
        action_name = 'unblock_customer' if customer.is_active else 'block_customer'
        log_admin_action(request, action_name, 'User', customer.id, f"Customer {customer.email} active set to {customer.is_active}")
        return Response({
            'message': f"Customer {'unblocked' if customer.is_active else 'blocked'} successfully.",
            'is_active': customer.is_active,
        })


# ==============================================================================
# 8. REVIEWS MODULE
# ==============================================================================

class AdminReviewListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Review.objects.select_related('product', 'user').order_by('-created_at')

        status_param = request.query_params.get('status')
        if status_param == 'approved':
            queryset = queryset.filter(is_approved=True)
        elif status_param == 'pending':
            queryset = queryset.filter(is_approved=False)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(product__name__icontains=search) | Q(title__icontains=search) | Q(body__icontains=search))

        paginated = paginate_queryset(queryset, request)
        reviews = [
            {
                'id': r.id,
                'product_name': r.product.name,
                'product_slug': r.product.slug,
                'user_email': r.user.email if r.user else 'Guest',
                'rating': r.rating,
                'title': r.title,
                'content': r.body,
                'is_approved': r.is_approved,
                'created_at': r.created_at.isoformat(),
            }
            for r in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': reviews,
        })


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
        log_admin_action(request, 'moderate_review', 'Review', review.id, f"Review approved={approved}")
        return Response({'message': f"Review {'approved' if approved else 'rejected'}."})


class AdminReviewDeleteView(views.APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'message': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

        review.delete()
        log_admin_action(request, 'delete_review', 'Review', pk, 'Deleted review')
        return Response({'message': 'Review deleted successfully.'})


# ==============================================================================
# 9. MESSAGES & WAITLIST MODULE
# ==============================================================================

class AdminMessageListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = ContactMessage.objects.order_by('-created_at')
        handled = request.query_params.get('handled')
        if handled in ['true', '1']:
            queryset = queryset.filter(is_handled=True)
        elif handled in ['false', '0']:
            queryset = queryset.filter(is_handled=False)

        paginated = paginate_queryset(queryset, request)
        messages = [
            {
                'id': m.id,
                'name': m.name,
                'email': m.email,
                'phone': m.phone,
                'subject': m.subject,
                'message': m.message,
                'is_handled': m.is_handled,
                'is_read': m.is_handled,
                'created_at': m.created_at.isoformat(),
            }
            for m in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': messages,
        })


class AdminMessageToggleHandledView(views.APIView):
    """Toggle contact message handled flag."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'message': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        msg.is_handled = not msg.is_handled
        msg.save()
        log_admin_action(request, 'toggle_message_handled', 'ContactMessage', msg.id, f"Handled set to {msg.is_handled}")
        return Response({'message': f"Message marked as {'handled' if msg.is_handled else 'unhandled'}.", 'is_handled': msg.is_handled})


class AdminMessageMarkReadView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'message': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        msg.is_handled = True
        msg.save()
        log_admin_action(request, 'mark_message_read', 'ContactMessage', msg.id, 'Marked message as handled')
        return Response({'message': 'Message marked as read.'})


class AdminWaitlistListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = WaitlistEntry.objects.order_by('-created_at')
        paginated = paginate_queryset(queryset, request)
        results = [
            {'id': w.id, 'email': w.email, 'source': w.source, 'created_at': w.created_at.isoformat()}
            for w in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': results,
        })


class AdminWaitlistCSVExportView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="supplivix_waitlist.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Email', 'Source', 'Joined_At'])

        for w in WaitlistEntry.objects.all().order_by('-created_at'):
            writer.writerow([w.id, w.email, w.source, w.created_at.strftime('%Y-%m-%d %H:%M')])

        log_admin_action(request, 'export_waitlist_csv', 'WaitlistEntry', '', 'Exported waitlist entries to CSV')
        return response


# ==============================================================================
# 10. SECURITY & AUDIT LOGS MODULE
# ==============================================================================

class AdminSecurityLogsView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        bot_events = [
            {
                'id': e.id,
                'event_type': e.reason,
                'ip_address': e.ip,
                'path': e.path,
                'score': e.score,
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
                'expires_at': b.expires_at.isoformat() if b.expires_at else None,
            }
            for b in BlockedIP.objects.order_by('-created_at')
        ]

        failed_logins = [
            {
                'id': f.id,
                'email': f.email,
                'ip_address': f.ip_address,
                'created_at': f.created_at.isoformat(),
            }
            for f in FailedLoginLog.objects.order_by('-created_at')[:50]
        ]

        return Response({
            'bot_events': bot_events,
            'blocked_ips': blocked_ips,
            'failed_logins': failed_logins,
        })


class AdminSecurityBlockIPView(views.APIView):
    """Manually add an IP address to the blocklist."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        ip = request.data.get('ip') or request.data.get('ip_address')
        if not ip:
            return Response({'message': 'IP address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', 'Blocked by staff admin')
        hours = int(request.data.get('hours', 24))
        expires_at = timezone.now() + timedelta(hours=hours) if hours > 0 else None

        blocked, _ = BlockedIP.objects.update_or_create(
            ip=ip.strip(),
            defaults={'reason': reason, 'expires_at': expires_at}
        )
        log_admin_action(request, 'block_ip', 'BlockedIP', blocked.id, f"Blocked IP {ip} ({reason})")
        return Response({'message': f'IP {ip} has been blocked.', 'id': blocked.id}, status=status.HTTP_201_CREATED)


class AdminSecurityUnblockIPView(views.APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        ip = request.data.get('ip_address') or request.data.get('ip')
        if not ip:
            return Response({'message': 'IP address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = BlockedIP.objects.filter(ip=ip.strip()).delete()
        log_admin_action(request, 'unblock_ip', 'BlockedIP', '', f"Unblocked IP {ip}")
        return Response({'message': f'IP {ip} unblocked.', 'deleted_count': deleted})


class AdminAuditLogsView(views.APIView):
    """View immutable staff action audit logs."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = AdminAuditLog.objects.select_related('user').order_by('-created_at')
        paginated = paginate_queryset(queryset, request)
        logs = [
            {
                'id': log_entry.id,
                'staff_email': log_entry.user.email if log_entry.user else 'System',
                'action': log_entry.action,
                'target_model': log_entry.target_model,
                'target_id': log_entry.target_id,
                'details': log_entry.details,
                'ip_address': log_entry.ip_address,
                'created_at': log_entry.created_at.isoformat(),
            }
            for log_entry in paginated['results']
        ]
        return Response({
            'count': paginated['count'],
            'page': paginated['page'],
            'page_size': paginated['page_size'],
            'total_pages': paginated['total_pages'],
            'results': logs,
        })
