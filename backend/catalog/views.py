from django.db.models import Avg, Count, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order, OrderItem

from .models import Category, Product, Review
from .serializers import (
    CategorySerializer,
    CreateReviewSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ReviewSerializer,
)


class CategoryListView(generics.ListAPIView):
    """List active root categories and nested children."""

    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True, parent__isnull=True).order_by('sort_order', 'name')


class ProductListView(generics.ListAPIView):
    """List active products with filtering, search, and sorting."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ProductListSerializer

    def get_queryset(self):
        queryset = (
            Product.objects.filter(is_active=True)
            .select_related('category')
            .prefetch_related('images')
            .annotate(
                annotated_reviews_count=Count('reviews', filter=Q(reviews__is_approved=True)),
                annotated_rating_average=Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
            )
        )

        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(
                Q(category__slug=category_param) | Q(category__parent__slug=category_param)
            )

        product_type = self.request.query_params.get('type') or self.request.query_params.get('product_type')
        if product_type in [Product.TYPE_MULTIVITAMIN, Product.TYPE_SKINCARE]:
            queryset = queryset.filter(product_type=product_type)

        min_price = self.request.query_params.get('min_price')
        if min_price and min_price.isdigit():
            queryset = queryset.filter(price__gte=int(min_price))

        max_price = self.request.query_params.get('max_price')
        if max_price and max_price.isdigit():
            queryset = queryset.filter(price__lte=int(max_price))

        in_stock = self.request.query_params.get('in_stock')
        if in_stock in ('true', '1'):
            queryset = queryset.filter(stock__gt=0)

        is_featured = self.request.query_params.get('featured')
        if is_featured in ('true', '1'):
            queryset = queryset.filter(is_featured=True)

        query = self.request.query_params.get('q') or self.request.query_params.get('search')
        if query:
            q_clean = query.strip()
            search_filter = (
                Q(name__icontains=q_clean) |
                Q(short_description__icontains=q_clean) |
                Q(description__icontains=q_clean) |
                Q(sku__icontains=q_clean) |
                Q(brand__icontains=q_clean)
            )
            words = [w for w in q_clean.split() if len(w) >= 3]
            for word in words:
                search_filter |= Q(name__icontains=word) | Q(short_description__icontains=word)
                if len(word) >= 5:
                    stem = word[:len(word) - 1]
                    search_filter |= Q(name__icontains=stem)
            queryset = queryset.filter(search_filter)

        sort = self.request.query_params.get('sort') or self.request.query_params.get('ordering', 'popular')
        if sort in ('price_asc', 'price'):
            queryset = queryset.order_by('price', 'id')
        elif sort in ('price_desc', '-price'):
            queryset = queryset.order_by('-price', 'id')
        elif sort in ('newest', '-created_at'):
            queryset = queryset.order_by('-created_at', 'id')
        elif sort in ('rating', '-rating'):
            queryset = queryset.order_by('-annotated_rating_average', '-stock', 'id')
        else:  # popular / default
            queryset = queryset.order_by('-is_featured', '-stock', 'id')

        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    """Retrieve product detail by slug."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related('category')
            .prefetch_related('images', 'attributes', 'faqs', 'reviews')
        )


class ProductReviewsListView(generics.ListAPIView):
    """List approved reviews for a specific product or create a review."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return Review.objects.filter(product__slug=slug, is_approved=True).order_by('-created_at')

    def post(self, request, slug=None):
        return CreateReviewView().post(request, slug=slug)


class CreateReviewView(APIView):
    """Submit a review for a product, restricted to verified buyers only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug=None):
        target_slug = slug or request.data.get('slug') or request.data.get('product_slug')
        product_id = request.data.get('product') or request.data.get('product_id')

        if target_slug:
            product = generics.get_object_or_404(Product, slug=target_slug, is_active=True)
        elif product_id:
            product = generics.get_object_or_404(Product, id=product_id, is_active=True)
        else:
            return Response(
                {'code': 'validation_error', 'message': 'Product identifier is required.', 'fields': {'slug': ['Required.']}},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verified buyer check: has user bought this product in an uncancelled order?
        has_purchased = OrderItem.objects.filter(
            order__user=user,
            product=product
        ).exclude(order__status=Order.STATUS_CANCELLED).exists()

        if not has_purchased:
            return Response(
                {
                    'code': 'verified_buyer_required',
                    'message': 'Only verified buyers can review this product.',
                    'fields': {}
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(product=product, user=user, is_approved=True)

        return Response(
            {
                'message': 'Review submitted successfully.',
                'review': ReviewSerializer(review).data
            },
            status=status.HTTP_201_CREATED
        )
