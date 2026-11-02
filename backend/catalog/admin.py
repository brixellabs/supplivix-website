from django.contrib import admin

from .models import Category, Product, ProductAttribute, ProductFAQ, ProductImage, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductAttributeInline(admin.TabularInline):
    model = ProductAttribute
    extra = 1


class ProductFAQInline(admin.StackedInline):
    model = ProductFAQ
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'sort_order', 'is_active', 'created_at')
    list_filter = ('is_active', 'parent')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'category', 'product_type', 'price', 'compare_at_price', 'stock', 'is_featured', 'is_active')
    list_filter = ('product_type', 'is_active', 'is_featured', 'category')
    search_fields = ('name', 'sku', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductAttributeInline, ProductFAQInline]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'alt_text', 'sort_order')
    list_filter = ('product',)
    search_fields = ('product__name', 'alt_text')


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'key', 'value')
    list_filter = ('key', 'product')
    search_fields = ('product__name', 'key', 'value')


@admin.register(ProductFAQ)
class ProductFAQAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'question', 'sort_order')
    list_filter = ('product',)
    search_fields = ('product__name', 'question', 'answer')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'title', 'is_approved', 'created_at')
    list_filter = ('rating', 'is_approved', 'created_at')
    search_fields = ('title', 'body', 'product__name', 'user__email')
    actions = ['approve_reviews']

    @admin.action(description='Approve selected reviews')
    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True)
