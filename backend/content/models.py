from django.core.cache import cache
from django.db import models


class SiteSetting(models.Model):
    """Dynamic site configuration parameters editable in admin."""

    key = models.CharField(max_length=80, unique=True, db_index=True)
    value = models.TextField()
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = 'Site Setting'
        verbose_name_plural = 'Site Settings'
        ordering = ['key']

    def __str__(self):
        return f"{self.key}: {self.value}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete(f"sitesetting_{self.key}")
        cache.delete("public_settings_cache")

    def delete(self, *args, **kwargs):
        cache.delete(f"sitesetting_{self.key}")
        cache.delete("public_settings_cache")
        super().delete(*args, **kwargs)

    @classmethod
    def get_setting(cls, key, default=''):
        cache_key = f"sitesetting_{key}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            val = cls.objects.get(key=key).value
            cache.set(cache_key, val, timeout=300)
            return val
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_int(cls, key, default=0):
        val = cls.get_setting(key, '')
        try:
            return int(val)
        except (ValueError, TypeError):
            return default


class WaitlistEntry(models.Model):
    """Coming soon waitlist subscriber model."""

    email = models.EmailField(unique=True, db_index=True)
    source = models.CharField(max_length=80, default='coming_soon')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Waitlist Entry'
        verbose_name_plural = 'Waitlist Entries'
        ordering = ['-created_at']

    def __str__(self):
        return self.email


class ContactMessage(models.Model):
    """Inquiries and customer messages sent via the contact form."""

    name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    is_handled = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_handled', 'created_at']),
        ]

    def __str__(self):
        return f"Message from {self.name} ({self.email})"


class Certificate(models.Model):
    """Accreditation and compliance certificates (GMP, ISO, DRAP, Halal, FDA, etc.)."""

    name = models.CharField(max_length=150)
    badge_code = models.CharField(max_length=50, blank=True, help_text="Short key e.g. gmp, iso, drap, halal")
    subtitle = models.CharField(max_length=200, blank=True)
    issuer = models.CharField(max_length=150, blank=True)
    image = models.ImageField(upload_to='certificates/', blank=True, null=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Certificate'
        verbose_name_plural = 'Certificates'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['is_active', 'sort_order']),
        ]

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        if self.badge_code:
            return f"/media/certificates/{self.badge_code}.png"
        return ""


class HeroSlide(models.Model):
    """Promotional banner slides shown in the homepage hero slider."""

    title = models.CharField(max_length=200, help_text="Headline or alt text for the banner slide")
    subtitle = models.CharField(max_length=255, blank=True, default='', help_text="Optional subtitle or tag line")
    image = models.ImageField(upload_to='banners/', blank=True, null=True, help_text="Uploaded banner image file")
    image_url_path = models.CharField(max_length=500, blank=True, default='', help_text="Fallback static path if no file uploaded")
    link = models.CharField(max_length=255, default='/shop', help_text="Target URL when banner is clicked")
    button_text = models.CharField(max_length=80, blank=True, default='Shop Now', help_text="CTA label")
    sort_order = models.PositiveIntegerField(default=0, help_text="Slide display order")
    is_active = models.BooleanField(default=True, db_index=True, help_text="Visibility toggle")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hero Banner Slide'
        verbose_name_plural = 'Hero Banner Slides'
        ordering = ['sort_order', 'id']
        indexes = [
            models.Index(fields=['is_active', 'sort_order']),
        ]

    def __str__(self):
        return f"{self.sort_order}: {self.title}"

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        if self.image_url_path:
            return self.image_url_path
        return ""

    def to_dict(self, request=None):
        img = ''
        if self.image:
            img = request.build_absolute_uri(self.image.url) if request else self.image.url
        elif self.image_url_path:
            img = self.image_url_path

        return {
            'id': self.id,
            'title': self.title,
            'subtitle': self.subtitle,
            'image': img,
            'image_url_path': self.image_url_path,
            'image_url': self.image_url,
            'link': self.link,
            'button_text': self.button_text,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

