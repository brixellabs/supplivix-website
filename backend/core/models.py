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
