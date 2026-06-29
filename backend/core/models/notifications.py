from django.conf import settings
from django.db import models

from .directory import TimeStamped


class Notification(TimeStamped):
    """In-app notification delivered to a single user (PRD §3 Notifications).

    Broadcasts (e.g. a new event) fan out to one row per recipient so each user
    can mark their own copy read independently.
    """

    class Kind(models.TextChoices):
        GENERAL = "general", "General"
        EVENT = "event", "Event"
        TASK = "task", "Task"
        JOB = "job", "Job"
        SYSTEM = "system", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.GENERAL)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(
        max_length=300, blank=True, help_text="In-app route, e.g. /events"
    )
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]

    def __str__(self):
        return f"{self.title} → {self.recipient_id}"
