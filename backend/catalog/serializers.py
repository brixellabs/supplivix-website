from rest_framework import serializers

from .models import Category, Product, ProductAttribute, ProductFAQ, ProductImage, Review


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'description', 'image', 'sort_order', 'children']

    def get_children(self, obj):
        children = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        return CategorySerializer(children, many=True).data


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'sort_order']


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ['id', 'key', 'value']


class ProductFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductFAQ
        fields = ['id', 'question', 'answer', 'sort_order']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'rating', 'title', 'body', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name or obj.user.email.split('@')[0]
        return 'Verified Customer'


class CreateReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['rating', 'title', 'body']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'category_slug',
            'brand', 'short_description', 'price', 'compare_at_price',
            'sku', 'stock', 'in_stock', 'savings', 'is_featured',
            'product_type', 'images', 'rating_average', 'reviews_count'
        ]

    def get_rating_average(self, obj):
        if hasattr(obj, 'annotated_rating_average'):
            if obj.annotated_rating_average is not None:
                return round(float(obj.annotated_rating_average), 1)
            return 5.0
        if hasattr(obj, '_prefetched_objects_cache') and 'reviews' in obj._prefetched_objects_cache:
            approved = [r for r in obj.reviews.all() if r.is_approved]
            if not approved:
                return 5.0
            return round(sum(r.rating for r in approved) / len(approved), 1)
        approved = obj.reviews.filter(is_approved=True)
        if not approved.exists():
            return 5.0
        return round(sum(r.rating for r in approved) / approved.count(), 1)

    def get_reviews_count(self, obj):
        if hasattr(obj, 'annotated_reviews_count'):
            return obj.annotated_reviews_count or 0
        if hasattr(obj, '_prefetched_objects_cache') and 'reviews' in obj._prefetched_objects_cache:
            return len([r for r in obj.reviews.all() if r.is_approved])
        return obj.reviews.filter(is_approved=True).count()


class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    faqs = ProductFAQSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'category_slug',
            'brand', 'short_description', 'description', 'price',
            'compare_at_price', 'sku', 'stock', 'in_stock', 'savings',
            'is_featured', 'product_type', 'seo_title', 'seo_description',
            'images', 'attributes', 'faqs', 'reviews', 'rating_average',
            'reviews_count'
        ]

    def get_reviews(self, obj):
        approved = obj.reviews.filter(is_approved=True).order_by('-created_at')[:10]
        return ReviewSerializer(approved, many=True).data

    def get_rating_average(self, obj):
        if hasattr(obj, 'annotated_rating_average'):
            if obj.annotated_rating_average is not None:
                return round(float(obj.annotated_rating_average), 1)
            return 5.0
        if hasattr(obj, '_prefetched_objects_cache') and 'reviews' in obj._prefetched_objects_cache:
            approved = [r for r in obj.reviews.all() if r.is_approved]
            if not approved:
                return 5.0
            return round(sum(r.rating for r in approved) / len(approved), 1)
        approved = obj.reviews.filter(is_approved=True)
        if not approved.exists():
            return 5.0
        return round(sum(r.rating for r in approved) / approved.count(), 1)

    def get_reviews_count(self, obj):
        if hasattr(obj, 'annotated_reviews_count'):
            return obj.annotated_reviews_count or 0
        if hasattr(obj, '_prefetched_objects_cache') and 'reviews' in obj._prefetched_objects_cache:
            return len([r for r in obj.reviews.all() if r.is_approved])
        return obj.reviews.filter(is_approved=True).count()
