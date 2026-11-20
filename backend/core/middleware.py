"""
Security, bot protection, and Neon database reliability middleware for Supplivix platform.
Enforces IP blocklist, injects strict security headers, protects against automation scanners,
and handles Neon serverless auto-suspend wake-up retries (DB-01).
"""

import logging
import time

from django.db import OperationalError, connections
from django.http import JsonResponse
from django.utils import timezone

from .models import BlockedIP
from .security import get_client_ip

logger = logging.getLogger('supplivix.neon')


class NeonAutoSuspendRetryMiddleware:
    """
    DB-01: Intercepts database OperationalError caused by Neon serverless
    auto-suspend / cold-start wake-up latency, closes broken connection handles,
    and retries the request to ensure it succeeds under 5 seconds.
    """

    MAX_RETRIES = 2
    INITIAL_DELAY = 0.5

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        delay = self.INITIAL_DELAY
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                return self.get_response(request)
            except OperationalError as exc:
                if attempt < self.MAX_RETRIES and self.is_recoverable_neon_error(exc):
                    logger.warning(
                        "Neon auto-suspend wake-up detected (%s). Retrying in %.2fs (attempt %d/%d)...",
                        str(exc),
                        delay,
                        attempt + 1,
                        self.MAX_RETRIES,
                    )
                    for conn in connections.all():
                        try:
                            conn.close()
                        except Exception:
                            pass
                    time.sleep(delay)
                    delay *= 1.5
                else:
                    raise

    @classmethod
    def is_recoverable_neon_error(cls, exc):
        err_msg = str(exc).lower()
        recoverable_markers = [
            'auto-suspend',
            'server closed the connection unexpectedly',
            'connection to server was lost',
            'could not connect to server',
            'terminating connection due to administrator command',
            'consuming input failed',
            'ssl syscall error',
            'endpoint is disabled',
            'compute is waking up',
            'connection reset by peer',
            'neon',
        ]
        return any(marker in err_msg for marker in recoverable_markers)


class BotProtectionMiddleware:
    """Check for blocked IPs and inject strict security headers."""

    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "frame-src https://challenges.cloudflare.com; "
        "connect-src 'self' https://challenges.cloudflare.com https://*.onrender.com https://api.supplivix.com;"
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
