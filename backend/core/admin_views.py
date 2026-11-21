"""
Staff-only REST API endpoints for the Supplivix Admin Dashboard (/admin-panel).
Enforces IsAdminUser permissions on all actions and logs mutating operations to AdminAuditLog.
"""

import csv
import io
import mimetypes
import random
import re
import string
import uuid
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, views
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from accounts.models import User
from accounts.serializers import StaffMemberSerializer, StaffRegisterSerializer
from catalog.models import Category, Product, ProductAttribute, ProductFAQ, ProductImage, Review
from content.models import Certificate, ContactMessage, HeroSlide, SiteSetting, WaitlistEntry
from content.serializers import CertificateSerializer
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


def check_staff_perm(request, perm_key):
    """
    Check if the authenticated staff user has permission for a specific module.
    Returns None if permitted, or Response(403) if denied.
    """
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or not user.is_staff:
        return Response({'code': 'permission_denied', 'message': 'Staff authentication required.'}, status=status.HTTP_403_FORBIDDEN)
    if user.is_superuser:
        return None
    if user.has_staff_perm(perm_key):
        return None
    return Response(
        {'code': 'permission_denied', 'message': f'Access denied: You do not have permission to access {perm_key}.'},
        status=status.HTTP_403_FORBIDDEN
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

        # 1. Total revenue (delivered and cod_collected) and total orders
        completed_orders = Order.objects.filter(status__in=['delivered', 'cod_collected'])
        total_revenue = completed_orders.aggregate(total=Sum('grand_total'))['total'] or 0
        total_orders_count = Order.objects.count()
        cod_collected_amount = Order.objects.filter(status='cod_collected').aggregate(total=Sum('grand_total'))['total'] or 0

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
            'cod_collected_amount': cod_collected_amount,
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
            'free_shipping_threshold': SiteSetting.get_int('free_shipping_threshold', 2000),
            'flat_shipping_fee': SiteSetting.get_int('flat_shipping_fee', 200),
        })


# ==============================================================================
# 2. PRODUCTS MODULE
# ==============================================================================

class AdminProductListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Product.objects.select_related('category').prefetch_related('images', 'attributes').order_by('-id')

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
        results = []
        for p in paginated['results']:
            attrs_map = {a.key.lower(): a.value for a in p.attributes.all()}
            results.append({
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
                'description': p.description,
                'short_description': p.short_description,
                'serving_size': attrs_map.get('serving size', ''),
                'directions': attrs_map.get('directions', attrs_map.get('suggested daily use', attrs_map.get('suggested use', ''))),
                'ingredients': attrs_map.get('active nutritional matrix', attrs_map.get('ingredients', attrs_map.get('key actives', ''))),
                'storage': attrs_map.get('storage', attrs_map.get('storage guidelines', '')),
                'description_ur': p.description_ur or '',
                'directions_ur': p.directions_ur or '',
                'ingredients_ur': p.ingredients_ur or '',
                'primary_image': p.images.all()[0].image.url if p.images.all() else None,
                'images_count': len(p.images.all()),
                'images': [
                    {'id': img.id, 'image': img.image.url, 'alt_text': img.alt_text, 'sort_order': img.sort_order}
                    for img in p.images.all()
                ],
            })
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

        desc = data.get('description', '')
        desc_ur = (data.get('description_ur') or '').strip()
        dir_ur = (data.get('directions_ur') or '').strip()
        ing_ur = (data.get('ingredients_ur') or '').strip()

        # Automatic Urdu translation fallback if admin left Urdu fields blank
        if not desc_ur and desc:
            try:
                desc_ur = translate_text_to_urdu(desc)
            except Exception:
                desc_ur = ''

        directions_input = data.get('directions', '')
        if not dir_ur and directions_input:
            try:
                dir_ur = translate_text_to_urdu(directions_input)
            except Exception:
                dir_ur = ''

        ingredients_input = data.get('ingredients', '')
        if not ing_ur and ingredients_input:
            try:
                ing_ur = translate_text_to_urdu(ingredients_input)
            except Exception:
                ing_ur = ''

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
            description=desc,
            description_ur=desc_ur,
            directions_ur=dir_ur,
            ingredients_ur=ing_ur,
            seo_title=data.get('seo_title', '')[:70],
            seo_description=data.get('seo_description', '')[:170],
            is_active=bool(data.get('is_active', True)),
            is_featured=bool(data.get('is_featured', False)),
        )

        # Custom product attributes / supplement facts
        if data.get('serving_size'):
            ProductAttribute.objects.update_or_create(
                product=product,
                key='Serving Size',
                defaults={'value': str(data['serving_size']).strip()}
            )
        if data.get('directions'):
            ProductAttribute.objects.update_or_create(
                product=product,
                key='Directions',
                defaults={'value': str(data['directions']).strip()}
            )
        if data.get('ingredients'):
            ProductAttribute.objects.update_or_create(
                product=product,
                key='Active Nutritional Matrix',
                defaults={'value': str(data['ingredients']).strip()}
            )
        if data.get('storage'):
            ProductAttribute.objects.update_or_create(
                product=product,
                key='Storage',
                defaults={'value': str(data['storage']).strip()}
            )

        log_admin_action(request, 'create_product', 'Product', product.id, f"Created {product.name} (SKU: {product.sku})")
        return Response({'message': 'Product created successfully.', 'id': product.id}, status=status.HTTP_201_CREATED)


class AdminProductDetailView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            product = Product.objects.select_related('category').prefetch_related('images', 'faqs', 'attributes').get(pk=pk)
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

        attrs_map = {a.key.lower(): a.value for a in product.attributes.all()}
        serving_size = attrs_map.get('serving size', '')
        directions = attrs_map.get('directions', attrs_map.get('suggested daily use', attrs_map.get('suggested use', '')))
        ingredients = attrs_map.get('active nutritional matrix', attrs_map.get('ingredients', attrs_map.get('key actives', '')))
        storage = attrs_map.get('storage', attrs_map.get('storage guidelines', ''))

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
            'serving_size': serving_size,
            'directions': directions,
            'ingredients': ingredients,
            'storage': storage,
            'description_ur': product.description_ur or '',
            'directions_ur': product.directions_ur or '',
            'ingredients_ur': product.ingredients_ur or '',
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
        if 'description_ur' in data:
            product.description_ur = data['description_ur']
        elif 'description' in data and not product.description_ur:
            try:
                product.description_ur = translate_text_to_urdu(data['description'])
            except Exception:
                pass

        if 'directions_ur' in data:
            product.directions_ur = data['directions_ur']
        elif 'directions' in data and not product.directions_ur:
            try:
                product.directions_ur = translate_text_to_urdu(data['directions'])
            except Exception:
                pass

        if 'ingredients_ur' in data:
            product.ingredients_ur = data['ingredients_ur']
        elif 'ingredients' in data and not product.ingredients_ur:
            try:
                product.ingredients_ur = translate_text_to_urdu(data['ingredients'])
            except Exception:
                pass

        if 'serving_size' in data:
            val = str(data['serving_size']).strip()
            if val:
                ProductAttribute.objects.update_or_create(
                    product=product, key='Serving Size', defaults={'value': val}
                )
            else:
                product.attributes.filter(key__iexact='Serving Size').delete()

        if 'directions' in data:
            val = str(data['directions']).strip()
            if val:
                ProductAttribute.objects.update_or_create(
                    product=product, key='Directions', defaults={'value': val}
                )
            else:
                product.attributes.filter(key__in=['Directions', 'Suggested Daily Use', 'Suggested Use']).delete()

        if 'ingredients' in data:
            val = str(data['ingredients']).strip()
            if val:
                ProductAttribute.objects.update_or_create(
                    product=product, key='Active Nutritional Matrix', defaults={'value': val}
                )
            else:
                product.attributes.filter(key__in=['Active Nutritional Matrix', 'Ingredients', 'Key Actives']).delete()

        if 'storage' in data:
            val = str(data['storage']).strip()
            if val:
                ProductAttribute.objects.update_or_create(
                    product=product, key='Storage', defaults={'value': val}
                )
            else:
                product.attributes.filter(key__in=['Storage', 'Storage Guidelines']).delete()

        product.save()
        log_admin_action(request, 'update_product', 'Product', product.id, f"Updated fields on {product.name}")
        return Response({
            'message': 'Product updated successfully.',
            'product': {
                'id': product.id,
                'name': product.name,
                'slug': product.slug,
                'price': product.price,
                'stock': product.stock,
                'is_active': product.is_active,
                'description': product.description,
                'serving_size': str(data.get('serving_size', '')),
                'directions': str(data.get('directions', '')),
                'ingredients': str(data.get('ingredients', '')),
                'storage': str(data.get('storage', '')),
            }
        })

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
    """Upload or update product image with alt text (accepts JPEG, PNG, WebP, SVG, JFIF, AVIF; max 2 MB)."""
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/pjpeg',
        'image/png',
        'image/x-png',
        'image/webp',
        'image/svg+xml',
        'image/jfif',
        'image/pipeg',
        'image/avif',
    ]
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

    def _validate_image(self, image_file):
        if image_file.size > self.MAX_FILE_SIZE:
            return Response({'message': 'Image exceeds maximum allowed size of 2 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        initial_bytes = image_file.read(16)
        image_file.seek(0)
        file_name = getattr(image_file, 'name', '').lower()
        if (
            initial_bytes.startswith(b'MZ')
            or initial_bytes.startswith(b'\x7fELF')
            or initial_bytes.startswith(b'#!')
            or file_name.endswith(('.exe', '.dll', '.bat', '.sh', '.cmd', '.com'))
        ):
            return Response(
                {'message': 'Executable and binary files are strictly prohibited.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        content_type = getattr(image_file, 'content_type', '').lower()
        if not content_type or content_type == 'application/octet-stream':
            guessed, _ = mimetypes.guess_type(file_name)
            if guessed:
                content_type = guessed.lower()

        is_allowed_mime = content_type in self.ALLOWED_MIME_TYPES
        is_svg = content_type == 'image/svg+xml' or file_name.endswith('.svg')

        if not is_svg:
            try:
                from PIL import Image as PILImage
                image_file.seek(0)
                img_verify = PILImage.open(image_file)
                img_verify.verify()
                image_file.seek(0)
            except Exception:
                if not is_allowed_mime:
                    return Response(
                        {'message': f'Unsupported format {content_type}. Accepted formats: JPEG, PNG, WebP, SVG.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                return Response(
                    {'message': 'Invalid image format or corrupted file.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return None

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        replace_id = request.data.get('replace_image_id')
        replace_img = None
        if replace_id:
            try:
                replace_img = ProductImage.objects.filter(pk=int(replace_id), product=product).first()
            except (ValueError, TypeError):
                pass

        if not replace_img and product.images.count() >= 3:
            return Response(
                {'message': 'A maximum of 3 images can be uploaded per product. Delete an existing image to upload a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'message': 'No image file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        val_err = self._validate_image(image_file)
        if val_err:
            return val_err

        alt_text = request.data.get('alt_text', '').strip() or product.name
        sort_order = int(request.data.get('sort_order', product.images.count()))

        if replace_img:
            replace_img.image = image_file
            if alt_text:
                replace_img.alt_text = alt_text
            replace_img.save()
            img = replace_img
            log_admin_action(request, 'replace_product_image', 'ProductImage', img.id, f"Replaced image for {product.name}")
        else:
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
            'sort_order': img.sort_order,
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, pk, image_id):
        try:
            img = ProductImage.objects.get(pk=image_id, product_id=pk)
        except ProductImage.DoesNotExist:
            return Response({'message': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get('image')
        if image_file:
            val_err = self._validate_image(image_file)
            if val_err:
                return val_err
            img.image = image_file

        if 'alt_text' in request.data:
            alt = request.data.get('alt_text', '').strip()
            if alt:
                img.alt_text = alt
        if 'sort_order' in request.data:
            try:
                img.sort_order = int(request.data['sort_order'])
            except (ValueError, TypeError):
                pass

        img.save()
        log_admin_action(request, 'update_product_image', 'ProductImage', img.id, f"Updated image {img.id} for {img.product.name}")
        return Response({
            'message': 'Image updated successfully.',
            'id': img.id,
            'image_url': img.image.url,
            'alt_text': img.alt_text,
            'sort_order': img.sort_order,
        })

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
    """Bulk update prices and stocks or create products from CSV with validation and atomic rollback."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'message': 'No CSV file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file.read().decode('utf-8')
        except Exception:
            return Response({'message': 'Invalid CSV encoding. Must be UTF-8.'}, status=status.HTTP_400_BAD_REQUEST)

        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        created_count = 0
        updated_count = 0
        errors = []
        rows_to_apply = []

        for row_idx, row in enumerate(reader, start=2):
            slug = (row.get('Slug') or row.get('slug') or '').strip().lower()
            name = (row.get('Name') or row.get('name') or '').strip()
            raw_price = row.get('Price_PKR') if 'Price_PKR' in row else row.get('price')
            raw_stock = row.get('Stock') if 'Stock' in row else row.get('stock')

            # Skip empty lines
            if not slug and not name and raw_price is None and raw_stock is None:
                continue

            row_errs = []
            if not slug:
                row_errs.append('Slug is required')
            if not name:
                row_errs.append('Name is required')

            price = 0
            if raw_price is not None and str(raw_price).strip() != '':
                try:
                    price = int(float(str(raw_price).strip()))
                    if price < 0:
                        row_errs.append('Price cannot be negative')
                except (ValueError, TypeError):
                    row_errs.append(f"Invalid price value '{raw_price}'")
            else:
                row_errs.append('Price is required')

            stock = 0
            if raw_stock is not None and str(raw_stock).strip() != '':
                try:
                    stock = int(float(str(raw_stock).strip()))
                    if stock < 0:
                        row_errs.append('Stock cannot be negative')
                except (ValueError, TypeError):
                    row_errs.append(f"Invalid stock value '{raw_stock}'")
            else:
                row_errs.append('Stock is required')

            if row_errs:
                errors.append({'row': row_idx, 'errors': row_errs, 'slug': slug or '(none)'})
            else:
                sku = (row.get('SKU') or row.get('sku') or '').strip() or f"SPLV-{uuid.uuid4().hex[:6].upper()}"
                prod_type = (row.get('Type') or row.get('product_type') or 'multivitamin').strip() or 'multivitamin'
                rows_to_apply.append((slug, name, sku, price, stock, prod_type))

        if errors:
            return Response({
                'message': f'CSV import rejected: {len(errors)} bad row(s) found. All changes rolled back.',
                'errors': errors,
                'created': 0,
                'updated': 0,
                'valid_applied': False,
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        default_cat = Category.objects.first()
        if not default_cat:
            default_cat = Category.objects.create(name='Multivitamins', slug='multivitamins')

        with transaction.atomic():
            for slug, name, sku, price, stock, prod_type in rows_to_apply:
                product, created = Product.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'name': name,
                        'sku': sku,
                        'price': price,
                        'stock': stock,
                        'product_type': prod_type,
                        'category': default_cat,
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        msg = f'CSV update completed: {created_count} created, {updated_count} updated.'
        log_admin_action(request, 'import_products_csv', 'Product', '', msg)
        return Response({'message': msg, 'created': created_count, 'updated': updated_count, 'errors': []})


def translate_text_to_urdu(text):
    """Translate English text to Urdu using Google Translate endpoint with graceful fallback."""
    if not text or not str(text).strip():
        return ''
    clean_text = str(text).strip()
    try:
        import urllib.request
        import urllib.parse
        import json
        q = urllib.parse.quote(clean_text)
        url = f'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q={q}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_pieces = [part[0] for part in data[0] if part and len(part) > 0 and part[0]]
            return ''.join(translated_pieces)
    except Exception:
        return clean_text


class AdminProductTranslateUrduView(views.APIView):
    """Generates AI/NLP draft Urdu translations for description, directions, and ingredients."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        perm_error = check_staff_perm(request, 'products')
        if perm_error:
            return perm_error

        description = request.data.get('description', '')
        directions = request.data.get('directions', '')
        ingredients = request.data.get('ingredients', '')

        description_ur = translate_text_to_urdu(description) if description else ''
        directions_ur = translate_text_to_urdu(directions) if directions else ''
        ingredients_ur = translate_text_to_urdu(ingredients) if ingredients else ''

        return Response({
            'description_ur': description_ur,
            'directions_ur': directions_ur,
            'ingredients_ur': ingredients_ur,
        })


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
        if not name:
            return Response({'message': 'Category name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_slug = data.get('slug', '').strip().lower() or name.lower().replace(' ', '-')
        clean_slug = re.sub(r'[^\w\-]', '', raw_slug).strip('-')
        slug = clean_slug or f"cat-{uuid.uuid4().hex[:6]}"
        if Category.objects.filter(slug=slug).exists():
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"

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
# 5b. CERTIFICATES MODULE
# ==============================================================================

class AdminCertificateListView(views.APIView):
    """List and create brand compliance certificates."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        certificates = Certificate.objects.all().order_by('sort_order', 'id')
        serializer = CertificateSerializer(certificates, many=True, context={'request': request})
        return Response({'count': certificates.count(), 'results': serializer.data})

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'code': 'validation_error', 'message': 'Certificate name is required.', 'fields': {'name': ['This field is required.']}},
                status=status.HTTP_400_BAD_REQUEST
            )

        badge_code = request.data.get('badge_code', '').strip().lower()
        if not badge_code:
            badge_code = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

        cert = Certificate.objects.create(
            name=name,
            badge_code=badge_code,
            subtitle=request.data.get('subtitle', '').strip(),
            issuer=request.data.get('issuer', '').strip(),
            description=request.data.get('description', '').strip(),
            sort_order=int(request.data.get('sort_order', 0) or 0),
            is_active=str(request.data.get('is_active', 'true')).lower() in ['true', '1', 'yes'],
        )
        if 'image' in request.FILES:
            cert.image = request.FILES['image']
            cert.save()

        log_admin_action(request, 'create_certificate', 'Certificate', cert.id, f"Created certificate: {cert.name}")
        serializer = CertificateSerializer(cert, context={'request': request})
        return Response({'message': 'Certificate created successfully.', 'certificate': serializer.data}, status=status.HTTP_201_CREATED)


class AdminCertificateDetailView(views.APIView):
    """Retrieve, update, and delete individual certificates."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            cert = Certificate.objects.get(pk=pk)
        except Certificate.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Certificate not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = CertificateSerializer(cert, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        try:
            cert = Certificate.objects.get(pk=pk)
        except Certificate.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Certificate not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            val = request.data.get('name', '').strip()
            if val:
                cert.name = val
        if 'subtitle' in request.data:
            cert.subtitle = request.data.get('subtitle', '').strip()
        if 'issuer' in request.data:
            cert.issuer = request.data.get('issuer', '').strip()
        if 'badge_code' in request.data:
            val = request.data.get('badge_code', '').strip()
            if val:
                cert.badge_code = val
        if 'description' in request.data:
            cert.description = request.data.get('description', '').strip()
        if 'sort_order' in request.data:
            try:
                cert.sort_order = int(request.data.get('sort_order', cert.sort_order))
            except (ValueError, TypeError):
                pass
        if 'is_active' in request.data:
            val = request.data.get('is_active')
            cert.is_active = val in [True, 'true', 'True', '1', 1]
        if 'image' in request.FILES:
            cert.image = request.FILES['image']

        cert.save()
        log_admin_action(request, 'update_certificate', 'Certificate', cert.id, f"Updated certificate: {cert.name}")
        serializer = CertificateSerializer(cert, context={'request': request})
        return Response({'message': 'Certificate updated successfully.', 'certificate': serializer.data})

    def delete(self, request, pk):
        try:
            cert = Certificate.objects.get(pk=pk)
        except Certificate.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Certificate not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)

        name = cert.name
        cert.delete()
        log_admin_action(request, 'delete_certificate', 'Certificate', pk, f"Deleted certificate: {name}")
        return Response({'message': f'Certificate "{name}" deleted successfully.'})


# ==============================================================================
# 5b-2. HERO BANNER SLIDES MANAGEMENT
# ==============================================================================

class AdminHeroSlideListView(views.APIView):
    """List and create promotional hero banner slides."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        slides = HeroSlide.objects.all().order_by('sort_order', 'id')
        results = [s.to_dict(request) for s in slides]
        active_count = HeroSlide.objects.filter(is_active=True).count()
        return Response({
            'count': len(results),
            'active_count': active_count,
            'results': results,
        })

    def post(self, request):
        title = request.data.get('title', '').strip()
        if not title:
            return Response(
                {'code': 'validation_error', 'message': 'Banner title is required.', 'fields': {'title': ['This field is required.']}},
                status=status.HTTP_400_BAD_REQUEST
            )

        link = request.data.get('link', '/shop').strip() or '/shop'
        subtitle = request.data.get('subtitle', '').strip()
        button_text = request.data.get('button_text', 'Shop Now').strip()
        image_url_path = request.data.get('image_url_path', '').strip()

        try:
            sort_order = int(request.data.get('sort_order', 0) or 0)
        except (ValueError, TypeError):
            sort_order = 0

        is_active = str(request.data.get('is_active', 'true')).lower() in ['true', '1', 'yes']

        slide = HeroSlide.objects.create(
            title=title,
            subtitle=subtitle,
            link=link,
            button_text=button_text,
            image_url_path=image_url_path,
            sort_order=sort_order,
            is_active=is_active,
        )

        if 'image' in request.FILES:
            slide.image = request.FILES['image']
            slide.save()

        log_admin_action(request, 'create_hero_slide', 'HeroSlide', slide.id, f"Created hero banner: {slide.title}")
        return Response(
            {'message': 'Hero banner created successfully.', 'slide': slide.to_dict(request)},
            status=status.HTTP_201_CREATED
        )


class AdminHeroSlideDetailView(views.APIView):
    """Retrieve, update, and delete individual hero banner slides."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            slide = HeroSlide.objects.get(pk=pk)
        except HeroSlide.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Hero slide not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response(slide.to_dict(request))

    def patch(self, request, pk):
        try:
            slide = HeroSlide.objects.get(pk=pk)
        except HeroSlide.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Hero slide not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)

        if 'title' in request.data:
            val = request.data.get('title', '').strip()
            if val:
                slide.title = val
        if 'subtitle' in request.data:
            slide.subtitle = request.data.get('subtitle', '').strip()
        if 'link' in request.data:
            val = request.data.get('link', '').strip()
            if val:
                slide.link = val
        if 'button_text' in request.data:
            slide.button_text = request.data.get('button_text', '').strip()
        if 'image_url_path' in request.data:
            slide.image_url_path = request.data.get('image_url_path', '').strip()
        if 'sort_order' in request.data:
            try:
                slide.sort_order = int(request.data.get('sort_order', slide.sort_order))
            except (ValueError, TypeError):
                pass
        if 'is_active' in request.data:
            val = request.data.get('is_active')
            slide.is_active = val in [True, 'true', 'True', '1', 1]
        if 'image' in request.FILES:
            slide.image = request.FILES['image']

        slide.save()
        log_admin_action(request, 'update_hero_slide', 'HeroSlide', slide.id, f"Updated hero banner: {slide.title}")
        return Response({'message': 'Hero banner updated successfully.', 'slide': slide.to_dict(request)})

    def delete(self, request, pk):
        try:
            slide = HeroSlide.objects.get(pk=pk)
        except HeroSlide.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Hero slide not found.', 'fields': {}}, status=status.HTTP_404_NOT_FOUND)

        title = slide.title
        slide_id = slide.id
        slide.delete()
        log_admin_action(request, 'delete_hero_slide', 'HeroSlide', slide_id, f"Deleted hero banner: {title}")
        return Response({'message': f'Hero banner "{title}" deleted successfully.'}, status=status.HTTP_200_OK)



# ==============================================================================
# 6. SHIPPING & SETTINGS MODULE
# ==============================================================================

class AdminSettingsView(views.APIView):
    """View and update site settings (free shipping threshold, flat fee, store contact, site mode, launch date, deals)."""
    permission_classes = [IsAdminUser]

    KEYS = [
        'free_shipping_threshold',
        'flat_shipping_fee',
        'announcement_bar_enabled',
        'announcement_text_primary',
        'announcement_text_secondary',
        'store_phone',
        'store_email',
        'corporate_address',
        'instagram_url',
        'facebook_url',
        'site_mode',
        'launch_date',
        'deals_enabled',
        'deal_banner_1_badge',
        'deal_banner_1_title',
        'deal_banner_1_desc',
        'deal_banner_1_price',
        'deal_banner_1_original_price',
        'deal_banner_1_button_text',
        'deal_banner_1_link',
        'deal_banner_2_badge',
        'deal_banner_2_title',
        'deal_banner_2_desc',
        'deal_banner_2_highlight',
        'deal_banner_2_button_text',
        'deal_banner_2_link',
    ]

    def get(self, request):
        settings_data = {}
        for k in self.KEYS:
            settings_data[k] = SiteSetting.get_setting(k, '')
        settings_data['free_shipping_threshold'] = SiteSetting.get_int('free_shipping_threshold', 2000)
        settings_data['flat_shipping_fee'] = SiteSetting.get_int('flat_shipping_fee', 200)
        if not settings_data.get('announcement_bar_enabled'):
            settings_data['announcement_bar_enabled'] = SiteSetting.get_setting('announcement_bar_enabled', 'true')
        if not settings_data.get('announcement_text_primary'):
            settings_data['announcement_text_primary'] = SiteSetting.get_setting(
                'announcement_text_primary',
                f"Free delivery on orders above Rs. {settings_data['free_shipping_threshold']:,}"
            )
        if not settings_data.get('announcement_text_secondary'):
            settings_data['announcement_text_secondary'] = SiteSetting.get_setting(
                'announcement_text_secondary',
                'Cash on Delivery (COD) Across Pakistan'
            )
        if not settings_data.get('deals_enabled'):
            settings_data['deals_enabled'] = SiteSetting.get_setting('deals_enabled', 'true')
        if not settings_data.get('deal_banner_1_badge'):
            settings_data['deal_banner_1_badge'] = SiteSetting.get_setting('deal_banner_1_badge', 'Special Bundle')
        if not settings_data.get('deal_banner_1_title'):
            settings_data['deal_banner_1_title'] = SiteSetting.get_setting('deal_banner_1_title', 'Complete Daily Glow Duo')
        if not settings_data.get('deal_banner_1_desc'):
            settings_data['deal_banner_1_desc'] = SiteSetting.get_setting(
                'deal_banner_1_desc',
                'Pair our daily multivitamin with pure clarifying serum for comprehensive internal nutrition and external skin radiance.'
            )
        if not settings_data.get('deal_banner_1_price'):
            settings_data['deal_banner_1_price'] = SiteSetting.get_setting('deal_banner_1_price', '3499')
        if not settings_data.get('deal_banner_1_original_price'):
            settings_data['deal_banner_1_original_price'] = SiteSetting.get_setting('deal_banner_1_original_price', '4350')
        if not settings_data.get('deal_banner_1_button_text'):
            settings_data['deal_banner_1_button_text'] = SiteSetting.get_setting('deal_banner_1_button_text', 'Shop The Duo')
        if not settings_data.get('deal_banner_1_link'):
            settings_data['deal_banner_1_link'] = SiteSetting.get_setting('deal_banner_1_link', '/shop?bundle=glow-duo')
        if not settings_data.get('deal_banner_2_badge'):
            settings_data['deal_banner_2_badge'] = SiteSetting.get_setting('deal_banner_2_badge', 'Family Pack')
        if not settings_data.get('deal_banner_2_title'):
            settings_data['deal_banner_2_title'] = SiteSetting.get_setting('deal_banner_2_title', '3-Month Wellness Supply')
        if not settings_data.get('deal_banner_2_desc'):
            settings_data['deal_banner_2_desc'] = SiteSetting.get_setting(
                'deal_banner_2_desc',
                'Ensure daily vitamin consistency with our bulk family package. Includes free nationwide COD shipping.'
            )
        if not settings_data.get('deal_banner_2_highlight'):
            settings_data['deal_banner_2_highlight'] = SiteSetting.get_setting('deal_banner_2_highlight', 'Free Nationwide Delivery')
        if not settings_data.get('deal_banner_2_button_text'):
            settings_data['deal_banner_2_button_text'] = SiteSetting.get_setting('deal_banner_2_button_text', 'View Family Pack')
        if not settings_data.get('deal_banner_2_link'):
            settings_data['deal_banner_2_link'] = SiteSetting.get_setting('deal_banner_2_link', '/multivitamins')
        if not settings_data.get('instagram_url'):
            settings_data['instagram_url'] = SiteSetting.get_setting(
                'instagram_url',
                'https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2'
            )
        if not settings_data.get('facebook_url'):
            settings_data['facebook_url'] = SiteSetting.get_setting('facebook_url', 'https://facebook.com')

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

        from django.core.cache import cache
        cache.delete("public_settings_cache")

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
                'phone': getattr(m, 'phone', ''),
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


# ==============================================================================
# 11. STAFF MANAGEMENT MODULE
# ==============================================================================

class AdminStaffListView(views.APIView):
    """List all staff accounts and register new staff members with assigned roles/permissions."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        perm_err = check_staff_perm(request, 'staff')
        if perm_err:
            return perm_err

        staff_qs = User.objects.filter(is_staff=True).order_by('-date_joined')
        serializer = StaffMemberSerializer(staff_qs, many=True)
        return Response({'count': staff_qs.count(), 'results': serializer.data})

    def post(self, request):
        perm_err = check_staff_perm(request, 'staff')
        if perm_err:
            return perm_err

        serializer = StaffRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'code': 'validation_error', 'message': 'Invalid staff registration data.', 'fields': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        staff_role = data.get('staff_role', 'General Staff')
        staff_permissions = data.get('staff_permissions', [])
        if not staff_permissions:
            staff_permissions = ['overview', 'orders', 'products', 'categories', 'reviews', 'messages', 'certificates']

        new_staff = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            full_name=data['full_name'],
            phone=data.get('phone', ''),
            is_staff=True,
            is_active=data.get('is_active', True),
            staff_role=staff_role,
            staff_permissions=staff_permissions,
        )

        log_admin_action(
            request,
            'create_staff',
            'User',
            new_staff.id,
            f"Registered staff member: {new_staff.email} ({new_staff.full_name}) - Role: {staff_role} - Permissions: {','.join(staff_permissions)}"
        )

        return Response(
            {
                'message': f'Staff member "{new_staff.full_name}" registered successfully.',
                'staff': StaffMemberSerializer(new_staff).data,
            },
            status=status.HTTP_201_CREATED
        )


class AdminStaffDetailView(views.APIView):
    """Retrieve, update, and remove individual staff members."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        perm_err = check_staff_perm(request, 'staff')
        if perm_err:
            return perm_err

        try:
            staff_user = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(StaffMemberSerializer(staff_user).data)

    def patch(self, request, pk):
        perm_err = check_staff_perm(request, 'staff')
        if perm_err:
            return perm_err

        try:
            staff_user = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'full_name' in data:
            val = str(data['full_name']).strip()
            if val:
                staff_user.full_name = val
        if 'phone' in data:
            staff_user.phone = str(data['phone']).strip()
        if 'staff_role' in data:
            staff_user.staff_role = str(data['staff_role']).strip() or 'General Staff'
        if 'staff_permissions' in data:
            perms = data['staff_permissions']
            if isinstance(perms, list):
                staff_user.staff_permissions = perms
        if 'is_active' in data:
            if staff_user.id == request.user.id and not data['is_active']:
                return Response(
                    {'message': 'You cannot deactivate your own account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            staff_user.is_active = bool(data['is_active'])
        if 'password' in data and data['password']:
            pwd = str(data['password']).strip()
            if len(pwd) < 8:
                return Response(
                    {'message': 'Password must be at least 8 characters long.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            staff_user.set_password(pwd)

        staff_user.save()
        log_admin_action(
            request,
            'update_staff',
            'User',
            staff_user.id,
            f"Updated staff member: {staff_user.email} (Role: {staff_user.staff_role})"
        )

        return Response({
            'message': f'Staff member "{staff_user.full_name}" updated successfully.',
            'staff': StaffMemberSerializer(staff_user).data,
        })

    def delete(self, request, pk):
        perm_err = check_staff_perm(request, 'staff')
        if perm_err:
            return perm_err

        try:
            staff_user = User.objects.get(pk=pk, is_staff=True)
        except User.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if staff_user.id == request.user.id:
            return Response(
                {'message': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if staff_user.is_superuser and not request.user.is_superuser:
            return Response(
                {'message': 'You do not have permission to delete a superuser.'},
                status=status.HTTP_403_FORBIDDEN
            )

        name = staff_user.full_name
        email = staff_user.email
        staff_user.delete()

        log_admin_action(request, 'delete_staff', 'User', pk, f"Deleted staff member: {email} ({name})")
        return Response({'message': f'Staff member "{name}" deleted successfully.'})


# ==============================================================================
# PROMOTIONAL OFFERS MANAGEMENT
# ==============================================================================

class AdminOfferListView(views.APIView):
    """List and create promotional offers (Admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from promotions.models import Offer
        offers = Offer.objects.all().select_related('product', 'product__category').order_by('sort_order', '-created_at')
        results = [o.to_dict(request) for o in offers]
        total_count = len(results)
        active_count = sum(1 for o in results if o['is_active'])
        return Response({
            'count': total_count,
            'active_count': active_count,
            'inactive_count': total_count - active_count,
            'results': results,
        })

    def post(self, request):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from promotions.models import Offer
        from catalog.models import Product

        title = request.data.get('title', '').strip()
        price = request.data.get('price')
        if not title:
            return Response(
                {'code': 'validation_error', 'message': 'Offer title is required.', 'fields': {'title': ['Title is required.']}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if price is None or str(price).strip() == '':
            if request.data.get('highlight'):
                price = 0
            else:
                return Response(
                    {'code': 'validation_error', 'message': 'Offer price or highlight perk is required.', 'fields': {'price': ['Price is required.']}},
                    status=status.HTTP_400_BAD_REQUEST
                )

        product_id = request.data.get('product_id')
        product = None
        if product_id:
            try:
                product = Product.objects.get(pk=int(product_id))
            except (Product.DoesNotExist, ValueError):
                pass

        original_price = request.data.get('original_price')
        if original_price:
            try:
                original_price = int(original_price)
            except (ValueError, TypeError):
                original_price = None

        discount_percentage = request.data.get('discount_percentage')
        if discount_percentage:
            try:
                discount_percentage = int(discount_percentage)
            except (ValueError, TypeError):
                discount_percentage = 0

        offer = Offer.objects.create(
            title=title,
            badge=request.data.get('badge', 'Special Offer').strip(),
            description=request.data.get('description', '').strip(),
            product=product,
            price=int(price),
            original_price=original_price,
            discount_percentage=discount_percentage or 0,
            highlight=request.data.get('highlight', '').strip(),
            button_text=request.data.get('button_text', 'Shop Offer').strip(),
            link=request.data.get('link', '').strip(),
            sort_order=int(request.data.get('sort_order', 0) or 0),
            is_active=str(request.data.get('is_active', 'true')).lower() in ['true', '1', 'yes'],
        )

        if 'image' in request.FILES:
            offer.image = request.FILES['image']
            offer.save(update_fields=['image'])

        log_admin_action(request, 'create_offer', 'Offer', offer.id, f"Created offer: {offer.title} (Rs. {offer.price})")
        return Response(offer.to_dict(request), status=status.HTTP_201_CREATED)


class AdminOfferDetailView(views.APIView):
    """Retrieve, update, and delete individual promotional offers."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import Offer
        try:
            offer = Offer.objects.select_related('product', 'product__category').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(offer.to_dict(request))

    def patch(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import Offer
        from catalog.models import Product

        try:
            offer = Offer.objects.select_related('product', 'product__category').get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'title' in request.data:
            val = request.data.get('title', '').strip()
            if val:
                offer.title = val
        if 'badge' in request.data:
            offer.badge = request.data.get('badge', '').strip()
        if 'description' in request.data:
            offer.description = request.data.get('description', '').strip()
        if 'price' in request.data:
            val = request.data.get('price')
            if val is not None and str(val).strip() != '':
                offer.price = int(val)
        if 'original_price' in request.data:
            val = request.data.get('original_price')
            offer.original_price = int(val) if val not in [None, '', 'null'] else None
        if 'discount_percentage' in request.data:
            val = request.data.get('discount_percentage')
            offer.discount_percentage = int(val) if val not in [None, '', 'null'] else 0
        if 'highlight' in request.data:
            offer.highlight = request.data.get('highlight', '').strip()
        if 'button_text' in request.data:
            offer.button_text = request.data.get('button_text', '').strip()
        if 'link' in request.data:
            offer.link = request.data.get('link', '').strip()
        if 'is_active' in request.data:
            offer.is_active = str(request.data.get('is_active')).lower() in ['true', '1', 'yes']
        if 'sort_order' in request.data:
            offer.sort_order = int(request.data.get('sort_order', 0) or 0)
        if 'product_id' in request.data:
            pid = request.data.get('product_id')
            if pid in [None, '', 'null', 0, '0']:
                offer.product = None
            else:
                try:
                    offer.product = Product.objects.get(pk=int(pid))
                except (Product.DoesNotExist, ValueError):
                    pass
        if 'image' in request.FILES:
            offer.image = request.FILES['image']

        offer.save()
        log_admin_action(request, 'update_offer', 'Offer', offer.id, f"Updated offer: {offer.title}")
        return Response(offer.to_dict(request))

    def delete(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import Offer
        try:
            offer = Offer.objects.get(pk=pk)
        except Offer.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)
        title = offer.title
        offer.delete()
        log_admin_action(request, 'delete_offer', 'Offer', pk, f"Deleted offer: {title}")
        return Response({'message': f'Offer "{title}" deleted successfully.'}, status=status.HTTP_200_OK)


# ==============================================================================
# 5d. Sale Events & Campaigns (Seasonal/Occasion-based Discount Engine)
# ==============================================================================

def _parse_admin_datetime(dt_val):
    """Parse datetime from admin input (ISO string, datetime-local, etc.) into an aware datetime."""
    if not dt_val:
        return None
    if isinstance(dt_val, (timezone.datetime,)):
        return dt_val
    from django.utils.dateparse import parse_datetime
    dt = parse_datetime(str(dt_val))
    if dt is None:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(str(dt_val))
        except Exception:
            return None
    if timezone.is_naive(dt):
        try:
            import zoneinfo
            karachi_tz = zoneinfo.ZoneInfo('Asia/Karachi')
            dt = timezone.make_aware(dt, karachi_tz)
        except Exception:
            dt = timezone.make_aware(dt, timezone.utc)
    return dt


class AdminSaleEventListView(views.APIView):
    """
    List, filter, and create seasonal/occasion Sale Events.
    Protected by staff permissions for 'promotions'.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from promotions.models import SaleEvent
        now = timezone.now()
        status_filter = request.GET.get('status', 'all').lower().strip()
        search = request.GET.get('search', '').strip()

        base_qs = SaleEvent.objects.filter(deleted_at__isnull=True)
        all_events = list(base_qs)

        kpis = {
            'total': len(all_events),
            'active': sum(1 for e in all_events if e.is_enabled and e.start_at <= now < e.end_at),
            'scheduled': sum(1 for e in all_events if e.is_enabled and e.start_at > now),
            'expired': sum(1 for e in all_events if e.end_at <= now),
            'disabled': sum(1 for e in all_events if not e.is_enabled),
        }

        qs = base_qs.prefetch_related('items')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        if status_filter == 'active':
            qs = qs.filter(is_enabled=True, start_at__lte=now, end_at__gt=now)
        elif status_filter == 'scheduled':
            qs = qs.filter(is_enabled=True, start_at__gt=now)
        elif status_filter == 'expired':
            qs = qs.filter(end_at__lte=now)
        elif status_filter == 'disabled':
            qs = qs.filter(is_enabled=False)
        elif status_filter == 'draft':
            qs = qs.filter(status=SaleEvent.STATUS_DRAFT)

        events_data = [e.to_dict(request) for e in qs]
        return Response({
            'kpis': kpis,
            'events': events_data,
        })

    def post(self, request):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from decimal import Decimal, InvalidOperation
        from promotions.models import SaleEvent, SaleEventItem
        from promotions.services import PricingService
        from django.db import transaction

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'code': 'invalid_name', 'message': 'Event name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = request.data.get('discount_type', 'percent')
        if discount_type not in ['percent', 'flat']:
            return Response({'code': 'invalid_type', 'message': 'Discount type must be percent or flat.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount_value = Decimal(str(request.data.get('discount_value', '0')))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'code': 'invalid_value', 'message': 'Invalid discount value.'}, status=status.HTTP_400_BAD_REQUEST)

        if discount_value <= 0:
            return Response({'code': 'invalid_value', 'message': 'Discount value must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        # Guard rails
        confirm_high = str(request.data.get('confirm_high_discount', '')).lower() in ['true', '1', 'yes']
        guardrail_warning = None
        if discount_type == 'percent':
            if discount_value > 100:
                return Response({'code': 'invalid_percent', 'message': 'Percentage discount cannot exceed 100%.'}, status=status.HTTP_400_BAD_REQUEST)
            if discount_value > 90 and not confirm_high:
                return Response({
                    'code': 'high_discount_confirmation_required',
                    'message': f'Discount is {discount_value}%, which exceeds 90%. Please confirm before proceeding.',
                    'requires_confirmation': True
                }, status=status.HTTP_400_BAD_REQUEST)
            elif discount_value > 70:
                guardrail_warning = f'Warning: A high discount rate of {discount_value}% will be applied.'

        start_at = _parse_admin_datetime(request.data.get('start_at'))
        end_at = _parse_admin_datetime(request.data.get('end_at'))
        if not start_at or not end_at:
            return Response({'code': 'invalid_dates', 'message': 'Both start and end dates/times are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if end_at <= start_at:
            return Response({'code': 'invalid_dates', 'message': 'End date & time must be strictly after Start date & time.'}, status=status.HTTP_400_BAD_REQUEST)

        apply_on = request.data.get('apply_on', 'all')
        if apply_on not in ['all', 'categories', 'products']:
            return Response({'code': 'invalid_apply_on', 'message': 'Invalid apply_on value.'}, status=status.HTTP_400_BAD_REQUEST)

        category_ids = request.data.get('category_ids') or []
        product_ids = request.data.get('product_ids') or []
        excluded_product_ids = request.data.get('excluded_product_ids') or []

        # Convert strings / comma-separated lists if needed
        def _clean_ids(ids_raw):
            if isinstance(ids_raw, str):
                import json
                try:
                    parsed = json.loads(ids_raw)
                    if isinstance(parsed, list):
                        return [int(x) for x in parsed if str(x).isdigit()]
                except Exception:
                    return [int(x.strip()) for x in ids_raw.split(',') if x.strip().isdigit()]
            elif isinstance(ids_raw, list):
                return [int(x) for x in ids_raw if str(x).isdigit()]
            return []

        category_ids = _clean_ids(category_ids)
        product_ids = _clean_ids(product_ids)
        excluded_product_ids = _clean_ids(excluded_product_ids)

        if apply_on == 'categories' and not category_ids:
            return Response({'code': 'missing_categories', 'message': 'Please select at least one category.'}, status=status.HTTP_400_BAD_REQUEST)
        if apply_on == 'products' and not product_ids:
            return Response({'code': 'missing_products', 'message': 'Please select at least one product.'}, status=status.HTTP_400_BAD_REQUEST)

        max_disc = request.data.get('max_discount_amount')
        max_discount_amount = int(max_disc) if max_disc not in [None, '', 'null'] else None
        priority = int(request.data.get('priority', 0) or 0)
        allow_coupon_stacking = str(request.data.get('allow_coupon_stacking', '')).lower() in ['true', '1', 'yes']
        show_countdown = str(request.data.get('show_countdown', 'true')).lower() in ['true', '1', 'yes']
        badge_text = request.data.get('badge_text', '').strip() or (f"{int(discount_value)}% OFF" if discount_type == 'percent' else f"Rs. {int(discount_value)} OFF")
        description = request.data.get('description', '').strip()
        is_enabled = str(request.data.get('is_enabled', 'true')).lower() in ['true', '1', 'yes']

        # Overlap detection
        overlapping = SaleEvent.objects.filter(
            deleted_at__isnull=True,
            is_enabled=True,
            start_at__lt=end_at,
            end_at__gt=start_at
        )
        overlap_warnings = []
        for other in overlapping:
            winner = 'This event (higher priority)' if priority > other.priority else (
                f'{other.name} (higher priority)' if other.priority > priority else 'Tie (lowest sale price will win)'
            )
            overlap_warnings.append({
                'id': other.id,
                'name': other.name,
                'priority': other.priority,
                'resolution': winner,
            })

        with transaction.atomic():
            event = SaleEvent(
                name=name,
                description=description,
                discount_type=discount_type,
                discount_value=discount_value,
                max_discount_amount=max_discount_amount,
                apply_on=apply_on,
                start_at=start_at,
                end_at=end_at,
                priority=priority,
                allow_coupon_stacking=allow_coupon_stacking,
                show_countdown=show_countdown,
                badge_text=badge_text,
                is_enabled=is_enabled,
                created_by=request.user,
            )
            if 'banner_image' in request.FILES:
                event.banner_image = request.FILES['banner_image']
            event.save()

            # Create items
            items_to_create = []
            if apply_on == 'categories':
                for cid in set(category_ids):
                    items_to_create.append(SaleEventItem(sale_event=event, target_type='category', target_id=cid, is_excluded=False))
            elif apply_on == 'products':
                for pid in set(product_ids):
                    items_to_create.append(SaleEventItem(sale_event=event, target_type='product', target_id=pid, is_excluded=False))

            for ex_pid in set(excluded_product_ids):
                items_to_create.append(SaleEventItem(sale_event=event, target_type='product', target_id=ex_pid, is_excluded=True))

            if items_to_create:
                SaleEventItem.objects.bulk_create(items_to_create)

        PricingService.invalidate_cache()
        log_admin_action(request, 'create_sale_event', 'SaleEvent', event.id, f"Created sale event: {event.name}")

        res_data = event.to_dict(request)
        return Response({
            'event': res_data,
            'overlap_warnings': overlap_warnings,
            'guardrail_warning': guardrail_warning,
            'message': f'Sale Event "{event.name}" created successfully.',
        }, status=status.HTTP_201_CREATED)


class AdminSaleEventDetailView(views.APIView):
    """View, update, or soft-delete a Sale Event."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(event.to_dict(request))

    def patch(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from decimal import Decimal, InvalidOperation
        from promotions.models import SaleEvent, SaleEventItem
        from promotions.services import PricingService
        from django.db import transaction

        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            name = request.data.get('name', '').strip()
            if not name:
                return Response({'code': 'invalid_name', 'message': 'Name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            event.name = name

        if 'description' in request.data:
            event.description = request.data.get('description', '').strip()

        if 'discount_type' in request.data:
            dtype = request.data.get('discount_type')
            if dtype in ['percent', 'flat']:
                event.discount_type = dtype

        if 'discount_value' in request.data:
            try:
                val = Decimal(str(request.data.get('discount_value', '0')))
                if val <= 0:
                    return Response({'code': 'invalid_value', 'message': 'Discount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
                if event.discount_type == 'percent' and val > 100:
                    return Response({'code': 'invalid_percent', 'message': 'Percentage cannot exceed 100%.'}, status=status.HTTP_400_BAD_REQUEST)
                event.discount_value = val
            except (InvalidOperation, TypeError, ValueError):
                return Response({'code': 'invalid_value', 'message': 'Invalid discount value.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'max_discount_amount' in request.data:
            max_disc = request.data.get('max_discount_amount')
            event.max_discount_amount = int(max_disc) if max_disc not in [None, '', 'null'] else None

        if 'start_at' in request.data:
            st = _parse_admin_datetime(request.data.get('start_at'))
            if st:
                event.start_at = st
        if 'end_at' in request.data:
            en = _parse_admin_datetime(request.data.get('end_at'))
            if en:
                event.end_at = en

        if event.end_at <= event.start_at:
            return Response({'code': 'invalid_dates', 'message': 'End date & time must be strictly after Start date & time.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'priority' in request.data:
            event.priority = int(request.data.get('priority', 0) or 0)

        if 'allow_coupon_stacking' in request.data:
            event.allow_coupon_stacking = str(request.data.get('allow_coupon_stacking')).lower() in ['true', '1', 'yes']

        if 'show_countdown' in request.data:
            event.show_countdown = str(request.data.get('show_countdown')).lower() in ['true', '1', 'yes']

        if 'badge_text' in request.data:
            event.badge_text = request.data.get('badge_text', '').strip()

        if 'is_enabled' in request.data:
            event.is_enabled = str(request.data.get('is_enabled')).lower() in ['true', '1', 'yes']

        if 'apply_on' in request.data:
            app_on = request.data.get('apply_on')
            if app_on in ['all', 'categories', 'products']:
                event.apply_on = app_on

        if 'banner_image' in request.FILES:
            event.banner_image = request.FILES['banner_image']

        with transaction.atomic():
            event.save()

            # Optional update items if passed
            def _clean_ids(ids_raw):
                if isinstance(ids_raw, str):
                    import json
                    try:
                        parsed = json.loads(ids_raw)
                        if isinstance(parsed, list):
                            return [int(x) for x in parsed if str(x).isdigit()]
                    except Exception:
                        return [int(x.strip()) for x in ids_raw.split(',') if x.strip().isdigit()]
                elif isinstance(ids_raw, list):
                    return [int(x) for x in ids_raw if str(x).isdigit()]
                return None

            cat_ids = _clean_ids(request.data.get('category_ids'))
            prod_ids = _clean_ids(request.data.get('product_ids'))
            ex_ids = _clean_ids(request.data.get('excluded_product_ids'))

            if cat_ids is not None or prod_ids is not None or ex_ids is not None:
                event.items.all().delete()
                items_to_create = []
                if event.apply_on == 'categories' and cat_ids:
                    for cid in set(cat_ids):
                        items_to_create.append(SaleEventItem(sale_event=event, target_type='category', target_id=cid, is_excluded=False))
                elif event.apply_on == 'products' and prod_ids:
                    for pid in set(prod_ids):
                        items_to_create.append(SaleEventItem(sale_event=event, target_type='product', target_id=pid, is_excluded=False))
                if ex_ids:
                    for pid in set(ex_ids):
                        items_to_create.append(SaleEventItem(sale_event=event, target_type='product', target_id=pid, is_excluded=True))
                if items_to_create:
                    SaleEventItem.objects.bulk_create(items_to_create)

        PricingService.invalidate_cache()
        log_admin_action(request, 'update_sale_event', 'SaleEvent', event.id, f"Updated sale event: {event.name}")
        return Response(event.to_dict(request))

    def delete(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        from promotions.services import PricingService
        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        title = event.name
        event.delete(soft=True)
        PricingService.invalidate_cache()
        log_admin_action(request, 'delete_sale_event', 'SaleEvent', pk, f"Deleted sale event: {title}")
        return Response({'message': f'Sale event "{title}" deleted successfully.'}, status=status.HTTP_200_OK)


class AdminSaleEventToggleView(views.APIView):
    """Quickly toggle is_enabled state of an event."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        from promotions.services import PricingService
        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        event.is_enabled = not event.is_enabled
        event.status = event.get_effective_status()
        event.save(update_fields=['is_enabled', 'status'])
        PricingService.invalidate_cache()
        log_admin_action(request, 'toggle_sale_event', 'SaleEvent', event.id, f"Toggled sale event: {event.name} enabled={event.is_enabled}")
        return Response(event.to_dict(request))


class AdminSaleEventDuplicateView(views.APIView):
    """Duplicate an existing Sale Event for convenient reuse."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent, SaleEventItem
        from promotions.services import PricingService
        from django.db import transaction

        try:
            event = SaleEvent.objects.prefetch_related('items').get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            clone = SaleEvent.objects.create(
                name=f"{event.name} (Copy)",
                description=event.description,
                discount_type=event.discount_type,
                discount_value=event.discount_value,
                max_discount_amount=event.max_discount_amount,
                apply_on=event.apply_on,
                start_at=timezone.now() + timedelta(days=1),
                end_at=timezone.now() + timedelta(days=8),
                priority=event.priority,
                allow_coupon_stacking=event.allow_coupon_stacking,
                show_countdown=event.show_countdown,
                badge_text=event.badge_text,
                status=SaleEvent.STATUS_DRAFT,
                is_enabled=False,
                created_by=request.user,
            )
            items_to_copy = [
                SaleEventItem(
                    sale_event=clone,
                    target_type=it.target_type,
                    target_id=it.target_id,
                    custom_discount_value=it.custom_discount_value,
                    is_excluded=it.is_excluded,
                )
                for it in event.items.all()
            ]
            if items_to_copy:
                SaleEventItem.objects.bulk_create(items_to_copy)

        PricingService.invalidate_cache()
        log_admin_action(request, 'duplicate_sale_event', 'SaleEvent', clone.id, f"Duplicated sale event #{pk} to #{clone.id}")
        return Response(clone.to_dict(request), status=status.HTTP_201_CREATED)


class AdminSaleEventExtendView(views.APIView):
    """Quickly extend an active or scheduled event by hours or to a new datetime."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        from promotions.services import PricingService
        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_end_at = _parse_admin_datetime(request.data.get('new_end_at'))
        if new_end_at:
            event.end_at = new_end_at
        else:
            hours = int(request.data.get('extend_hours', 24) or 24)
            event.end_at = event.end_at + timedelta(hours=hours)

        event.status = event.get_effective_status()
        event.save(update_fields=['end_at', 'status'])
        PricingService.invalidate_cache()
        log_admin_action(request, 'extend_sale_event', 'SaleEvent', event.id, f"Extended sale event #{pk} end_at to {event.end_at}")
        return Response(event.to_dict(request))


class AdminSaleEventEndNowView(views.APIView):
    """Immediately expire an active event."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        from promotions.services import PricingService
        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        event.end_at = timezone.now()
        event.status = SaleEvent.STATUS_EXPIRED
        event.save(update_fields=['end_at', 'status'])
        PricingService.invalidate_cache()
        log_admin_action(request, 'end_now_sale_event', 'SaleEvent', event.id, f"Manually ended sale event: {event.name}")
        return Response(event.to_dict(request))


class AdminSaleEventPreviewView(views.APIView):
    """Live preview up to 10 products affected by the given or saved sale discount settings."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err

        from decimal import Decimal, InvalidOperation
        from catalog.models import Product
        from promotions.services import PricingService

        discount_type = request.data.get('discount_type', 'percent')
        try:
            discount_value = Decimal(str(request.data.get('discount_value', '0')))
        except (InvalidOperation, TypeError, ValueError):
            discount_value = Decimal('0')

        max_disc = request.data.get('max_discount_amount')
        max_discount_amount = int(max_disc) if max_disc not in [None, '', 'null'] else None
        apply_on = request.data.get('apply_on', 'all')

        def _clean_ids(ids_raw):
            if isinstance(ids_raw, str):
                import json
                try:
                    parsed = json.loads(ids_raw)
                    if isinstance(parsed, list):
                        return [int(x) for x in parsed if str(x).isdigit()]
                except Exception:
                    return [int(x.strip()) for x in ids_raw.split(',') if x.strip().isdigit()]
            elif isinstance(ids_raw, list):
                return [int(x) for x in ids_raw if str(x).isdigit()]
            return []

        category_ids = _clean_ids(request.data.get('category_ids'))
        product_ids = _clean_ids(request.data.get('product_ids'))
        excluded_product_ids = _clean_ids(request.data.get('excluded_product_ids'))

        qs = Product.objects.filter(is_active=True).select_related('category').prefetch_related('images')
        if apply_on == 'products' and product_ids:
            qs = qs.filter(id__in=product_ids)
        elif apply_on == 'categories' and category_ids:
            qs = qs.filter(category_id__in=category_ids)

        if excluded_product_ids:
            qs = qs.exclude(id__in=excluded_product_ids)

        preview_products = []
        for p in qs[:25]:
            orig = int(p.price)
            if discount_value > 0:
                sale = PricingService.compute_event_discount(orig, discount_type, discount_value, max_discount_amount)
                disc_amt = orig - sale
                disc_pct = round((disc_amt / orig) * 100) if orig > 0 else 0
            else:
                sale = orig
                disc_amt = 0
                disc_pct = 0

            img_url = None
            prim = p.images.order_by('sort_order', 'id').first()
            if prim and prim.image:
                img_url = request.build_absolute_uri(prim.image.url) if request else prim.image.url

            preview_products.append({
                'id': p.id,
                'name': p.name,
                'category_name': p.category.name if p.category else '',
                'original_price': orig,
                'sale_price': sale,
                'discount_amount': disc_amt,
                'discount_percent': disc_pct,
                'image': img_url,
            })

        return Response({'preview_products': preview_products})


class AdminSaleEventReportView(views.APIView):
    """Sales report for a specific sale event aggregated from order item price snapshots."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        perm_err = check_staff_perm(request, 'promotions')
        if perm_err:
            return perm_err
        from promotions.models import SaleEvent
        from orders.models import OrderItem

        try:
            event = SaleEvent.objects.get(pk=pk, deleted_at__isnull=True)
        except SaleEvent.DoesNotExist:
            return Response({'code': 'not_found', 'message': 'Sale event not found.'}, status=status.HTTP_404_NOT_FOUND)

        items = OrderItem.objects.filter(
            Q(sale_event=event) | Q(sale_event_name=event.name)
        ).select_related('order')

        orders_count = items.values('order_id').distinct().count()
        units_sold = items.aggregate(u=Sum('quantity'))['u'] or 0
        revenue = sum((it.sale_price or it.unit_price) * it.quantity for it in items)
        total_discount_given = sum((it.discount_amount or 0) * it.quantity for it in items)

        top_products = list(
            items.values('product_name')
            .annotate(units=Sum('quantity'), line_revenue=Sum('line_total'))
            .order_by('-units')[:5]
        )

        return Response({
            'report': {
                'event_id': event.id,
                'event_name': event.name,
                'discount_badge': event.badge_text,
                'orders_count': orders_count,
                'units_sold': units_sold,
                'revenue': revenue,
                'total_discount_given': total_discount_given,
                'top_products': top_products,
            }
        })


