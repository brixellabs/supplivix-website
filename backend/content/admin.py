from django.contrib import admin

from .models import Certificate, ContactMessage, SiteSetting, WaitlistEntry


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('name', 'issuer', 'sort_order', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'issuer', 'description', 'badge_code')
    list_editable = ('sort_order', 'is_active')


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'description')
    search_fields = ('key', 'value', 'description')


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ('email', 'source', 'created_at')
    list_filter = ('source', 'created_at')
    search_fields = ('email',)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'is_handled', 'created_at')
    list_filter = ('is_handled', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    actions = ['mark_handled']

    @admin.action(description='Mark selected messages as handled')
    def mark_handled(self, request, queryset):
        queryset.update(is_handled=True)
