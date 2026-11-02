from django.conf import settings
from django.db import models


class Category(models.Model):
    """Product category hierarchy."""

    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, db_index=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active', 'sort_order']),
            models.Index(fields=['parent']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class Product(models.Model):
    """Product model for multivitamins and skincare."""

    TYPE_MULTIVITAMIN = 'multivitamin'
    TYPE_SKINCARE = 'skincare'
    PRODUCT_TYPE_CHOICES = [
        (TYPE_MULTIVITAMIN, 'Multivitamin'),
        (TYPE_SKINCARE, 'Skincare'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=260, unique=True, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    brand = models.CharField(max_length=100, default='Supplivix')
    short_description = models.TextField(blank=True)
    description = models.TextField()
    price = models.PositiveIntegerField(help_text='Price in PKR (whole rupees)')
    compare_at_price = models.PositiveIntegerField(null=True, blank=True, help_text='Original price in PKR (optional)')
    sku = models.CharField(max_length=60, unique=True, db_index=True)
    stock = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    product_type = models.CharField(
        max_length=50,
        choices=PRODUCT_TYPE_CHOICES,
        default=TYPE_MULTIVITAMIN,
        db_index=True
    )
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=170, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['product_type', 'is_active']),
            models.Index(fields=['price']),
            models.Index(fields=['stock']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

    @property
    def in_stock(self):
        return self.stock > 0

    @property
    def savings(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            return self.compare_at_price - self.price
        return 0


class ProductImage(models.Model):
    """Product images with sort order and alt text."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=255)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['product', 'sort_order']),
        ]

    def __str__(self):
        return f"{self.product.name} Image ({self.sort_order})"


class ProductAttribute(models.Model):
    """Key-value attributes such as serving size, count, skin type, or ingredients."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attributes')
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=255)

    class Meta:
        verbose_name = 'Product Attribute'
        verbose_name_plural = 'Product Attributes'
        indexes = [
            models.Index(fields=['product', 'key']),
        ]

    def __str__(self):
        return f"{self.key}: {self.value}"


class ProductFAQ(models.Model):
    """Frequently Asked Questions specific to a product, feeding AEO."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='faqs')
    question = models.CharField(max_length=255)
    answer = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Product FAQ'
        verbose_name_plural = 'Product FAQs'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['product', 'sort_order']),
        ]

    def __str__(self):
        return f"FAQ: {self.question}"


class Review(models.Model):
    """Verified customer product review."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        default=5
    )
    title = models.CharField(max_length=150)
    body = models.TextField()
    is_approved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'is_approved']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.product.name} ({self.rating}/5) by {self.user}"
