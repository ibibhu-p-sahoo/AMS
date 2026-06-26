from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Action history for accountability (PRD §7 audit_log, §10)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="audit_entries"
    )
    action = models.CharField(max_length=20)  # created / updated / deleted
    entity = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=40, blank=True)
    summary = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.timestamp:%Y-%m-%d %H:%M} {self.action} {self.entity}#{self.entity_id}"
