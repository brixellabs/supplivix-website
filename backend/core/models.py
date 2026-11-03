from django.conf import settings
from django.db import models


class BotEvent(models.Model):
    """Audit record for suspicious requests and bot telemetry."""

    ip = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField(blank=True)
    path = models.CharField(max_length=255)
    reason = models.CharField(max_length=100, db_index=True)
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Bot Event'
        verbose_name_plural = 'Bot Events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ip', 'created_at']),
            models.Index(fields=['reason']),
        ]

    def __str__(self):
        return f"BotEvent({self.ip}, {self.reason}, score={self.score})"


class BlockedIP(models.Model):
    """Blocked IP address registry managed by automated security or admin."""

    ip = models.GenericIPAddressField(unique=True, db_index=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Blocked IP'
        verbose_name_plural = 'Blocked IPs'
        ordering = ['-created_at']

    def __str__(self):
        return f"BlockedIP({self.ip})"


class AdminAuditLog(models.Model):
    """Immutable audit trail of all staff administrative actions (who, what, when, IP)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_audit_logs'
    )
    action = models.CharField(max_length=120, db_index=True)
    target_model = models.CharField(max_length=100, db_index=True)
    target_id = models.CharField(max_length=100, blank=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Admin Audit Log'
        verbose_name_plural = 'Admin Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} on {self.target_model}:{self.target_id} at {self.created_at}"


class FailedLoginLog(models.Model):
    """Log of failed authentication attempts for security auditing."""

    email = models.CharField(max_length=255, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Failed Login Log'
        verbose_name_plural = 'Failed Login Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]

    def __str__(self):
        return f"Failed login for {self.email} from {self.ip_address}"
