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

    @classmethod
    def get_setting(cls, key, default=''):
        try:
            return cls.objects.get(key=key).value
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
