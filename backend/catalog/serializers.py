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
    thumbnail = serializers.SerializerMethodField()
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    is_on_sale = serializers.SerializerMethodField()
    sale_badge = serializers.SerializerMethodField()
    sale_event_name = serializers.SerializerMethodField()
    sale_discount_amount = serializers.SerializerMethodField()
    show_countdown = serializers.SerializerMethodField()
    sale_end_at = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'category_slug',
            'brand', 'short_description', 'price', 'compare_at_price',
            'sku', 'stock', 'in_stock', 'savings', 'is_featured',
            'product_type', 'images', 'thumbnail', 'rating_average', 'reviews_count',
            'original_price', 'sale_price', 'is_on_sale', 'sale_badge',
            'sale_event_name', 'sale_discount_amount', 'show_countdown', 'sale_end_at',
        ]

    def _get_pricing(self, obj):
        if not hasattr(obj, '_pricing_info'):
            from promotions.services import PricingService
            obj._pricing_info = PricingService.calculate_sale_price(obj)
        return obj._pricing_info

    def get_original_price(self, obj):
        return self._get_pricing(obj)['original_price']

    def get_sale_price(self, obj):
        return self._get_pricing(obj)['sale_price']

    def get_is_on_sale(self, obj):
        return self._get_pricing(obj)['is_on_sale']

    def get_sale_badge(self, obj):
        return self._get_pricing(obj)['badge_text']

    def get_sale_event_name(self, obj):
        return self._get_pricing(obj)['event_name']

    def get_sale_discount_amount(self, obj):
        return self._get_pricing(obj)['discount_amount']

    def get_show_countdown(self, obj):
        return self._get_pricing(obj)['show_countdown']

    def get_sale_end_at(self, obj):
        return self._get_pricing(obj)['sale_end_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        pricing = self._get_pricing(instance)
        if pricing['is_on_sale']:
            data['price'] = pricing['sale_price']
            data['compare_at_price'] = pricing['original_price'] if not instance.compare_at_price else max(instance.compare_at_price, pricing['original_price'])
            data['savings'] = max(0, data['compare_at_price'] - data['price'])
        return data

    def get_thumbnail(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'images' in obj._prefetched_objects_cache:
            images = sorted(obj.images.all(), key=lambda img: (img.sort_order, img.id))
            if images and images[0].image:
                return images[0].image.url
            return ''
        img = obj.images.order_by('sort_order').first()
        if img and img.image:
            return img.image.url
        return ''

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
    thumbnail = serializers.SerializerMethodField()
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    faqs = ProductFAQSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    rating_average = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    inventory_count = serializers.IntegerField(source='stock', read_only=True)
    serving_size = serializers.SerializerMethodField()
    directions = serializers.SerializerMethodField()
    ingredients = serializers.SerializerMethodField()
    storage = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    is_on_sale = serializers.SerializerMethodField()
    sale_badge = serializers.SerializerMethodField()
    sale_event_name = serializers.SerializerMethodField()
    sale_discount_amount = serializers.SerializerMethodField()
    show_countdown = serializers.SerializerMethodField()
    sale_end_at = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name', 'category_slug',
            'brand', 'short_description', 'description', 'price',
            'compare_at_price', 'sku', 'stock', 'inventory_count', 'in_stock', 'savings',
            'is_featured', 'product_type', 'seo_title', 'seo_description',
            'images', 'thumbnail', 'attributes', 'faqs', 'reviews', 'rating', 'rating_average',
            'reviews_count', 'serving_size', 'directions', 'ingredients', 'storage',
            'description_ur', 'directions_ur', 'ingredients_ur',
            'original_price', 'sale_price', 'is_on_sale', 'sale_badge',
            'sale_event_name', 'sale_discount_amount', 'show_countdown', 'sale_end_at',
        ]

    def get_thumbnail(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'images' in obj._prefetched_objects_cache:
            images = sorted(obj.images.all(), key=lambda img: (img.sort_order, img.id))
            if images and images[0].image:
                return images[0].image.url
            return ''
        img = obj.images.order_by('sort_order').first()
        if img and img.image:
            return img.image.url
        return ''

    def _get_pricing(self, obj):
        if not hasattr(obj, '_pricing_info'):
            from promotions.services import PricingService
            obj._pricing_info = PricingService.calculate_sale_price(obj)
        return obj._pricing_info

    def get_original_price(self, obj):
        return self._get_pricing(obj)['original_price']

    def get_sale_price(self, obj):
        return self._get_pricing(obj)['sale_price']

    def get_is_on_sale(self, obj):
        return self._get_pricing(obj)['is_on_sale']

    def get_sale_badge(self, obj):
        return self._get_pricing(obj)['badge_text']

    def get_sale_event_name(self, obj):
        return self._get_pricing(obj)['event_name']

    def get_sale_discount_amount(self, obj):
        return self._get_pricing(obj)['discount_amount']

    def get_show_countdown(self, obj):
        return self._get_pricing(obj)['show_countdown']

    def get_sale_end_at(self, obj):
        return self._get_pricing(obj)['sale_end_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('description') or not str(data.get('description')).strip():
            data['description'] = 'Not specified'
        pricing = self._get_pricing(instance)
        if pricing['is_on_sale']:
            data['price'] = pricing['sale_price']
            data['compare_at_price'] = pricing['original_price'] if not instance.compare_at_price else max(instance.compare_at_price, pricing['original_price'])
            data['savings'] = max(0, data['compare_at_price'] - data['price'])
        return data

    def get_serving_size(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'attributes' in obj._prefetched_objects_cache:
            for a in obj.attributes.all():
                if a.key.lower() == 'serving size' and a.value and a.value.strip():
                    return a.value
            return 'Not specified'
        attr = obj.attributes.filter(key__iexact='Serving Size').first()
        return attr.value if (attr and attr.value and attr.value.strip()) else 'Not specified'

    def get_directions(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'attributes' in obj._prefetched_objects_cache:
            for a in obj.attributes.all():
                if a.key.lower() in ['directions', 'suggested daily use', 'suggested use'] and a.value and a.value.strip():
                    return a.value
            return 'Not specified'
        attr = obj.attributes.filter(key__in=['Directions', 'Suggested Daily Use', 'Suggested Use']).first()
        return attr.value if (attr and attr.value and attr.value.strip()) else 'Not specified'

    def get_ingredients(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'attributes' in obj._prefetched_objects_cache:
            for a in obj.attributes.all():
                if a.key.lower() in ['active nutritional matrix', 'ingredients', 'key actives'] and a.value and a.value.strip():
                    return a.value
            return 'Not specified'
        attr = obj.attributes.filter(key__in=['Active Nutritional Matrix', 'Ingredients', 'Key Actives']).first()
        return attr.value if (attr and attr.value and attr.value.strip()) else 'Not specified'

    def get_storage(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'attributes' in obj._prefetched_objects_cache:
            for a in obj.attributes.all():
                if a.key.lower() in ['storage', 'storage guidelines'] and a.value and a.value.strip():
                    return a.value
            return 'Not specified'
        attr = obj.attributes.filter(key__in=['Storage', 'Storage Guidelines']).first()
        return attr.value if (attr and attr.value and attr.value.strip()) else 'Not specified'

    def get_rating(self, obj):
        return self.get_rating_average(obj)

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
