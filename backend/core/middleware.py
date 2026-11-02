"""
Security and bot protection middleware for Supplivix platform.
"""

from django.http import JsonResponse
from django.utils import timezone

from .models import BlockedIP


class BotProtectionMiddleware:
    """Check for blocked IPs and suspicious automation markers."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = self.get_client_ip(request)

        # Check IP blocklist
        blocked = BlockedIP.objects.filter(ip=ip).first()
        if blocked:
            if blocked.expires_at and blocked.expires_at < timezone.now():
                blocked.delete()
            else:
                return JsonResponse(
                    {
                        'code': 'ip_blocked',
                        'message': 'Your IP address has been temporarily blocked for security reasons.',
                        'fields': {}
                    },
                    status=403
                )

        response = self.get_response(request)
        return response

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip
