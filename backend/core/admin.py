from django.contrib import admin

from .models import BlockedIP, BotEvent


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
