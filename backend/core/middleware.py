"""
Security and bot protection middleware for Supplivix platform (Phase 7).
Enforces IP blocklist, injects strict security headers (CSP, HSTS, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy), and protects against automation scanners.
"""

from django.http import JsonResponse
from django.utils import timezone

from .models import BlockedIP
from .security import get_client_ip


class BotProtectionMiddleware:
    """Check for blocked IPs and inject strict security headers."""

    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "frame-src https://challenges.cloudflare.com; "
        "connect-src 'self' https://challenges.cloudflare.com;"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = get_client_ip(request)

        # 1. Check IP Blocklist
        blocked = BlockedIP.objects.filter(ip=ip).first()
        if blocked:
            if blocked.expires_at and blocked.expires_at < timezone.now():
                blocked.delete()
            else:
                response = JsonResponse(
                    {
                        'code': 'ip_blocked',
                        'message': 'Your IP address has been temporarily blocked for security reasons.',
                        'fields': {}
                    },
                    status=403
                )
                return self._inject_security_headers(response)

        response = self.get_response(request)
        return self._inject_security_headers(response)

    def _inject_security_headers(self, response):
        response['X-Frame-Options'] = 'DENY'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if not response.has_header('Strict-Transport-Security'):
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = self.CSP_POLICY
        return response

    @staticmethod
    def get_client_ip(request):
        return get_client_ip(request)
