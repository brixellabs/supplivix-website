from django.contrib import admin

from .models import AdminAuditLog, BlockedIP, BotEvent, FailedLoginLog


@admin.register(BotEvent)
class BotEventAdmin(admin.ModelAdmin):
    list_display = ('ip', 'reason', 'score', 'path', 'created_at')
    list_filter = ('reason', 'created_at')
    search_fields = ('ip', 'user_agent', 'path', 'reason')
    readonly_fields = ('ip', 'user_agent', 'path', 'reason', 'score', 'created_at')


@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    list_display = ('ip', 'reason', 'created_at', 'expires_at')
    search_fields = ('ip', 'reason')


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'target_model', 'target_id', 'ip_address', 'created_at')
    list_filter = ('action', 'target_model', 'created_at')
    search_fields = ('action', 'target_model', 'target_id', 'details', 'ip_address', 'user__email')
    readonly_fields = ('user', 'action', 'target_model', 'target_id', 'details', 'ip_address', 'created_at')


@admin.register(FailedLoginLog)
class FailedLoginLogAdmin(admin.ModelAdmin):
    list_display = ('email', 'ip_address', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('email', 'ip_address', 'user_agent')
    readonly_fields = ('email', 'ip_address', 'user_agent', 'created_at')
