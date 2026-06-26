from django.conf import settings
from django.db import models

from .directory import Alumni, TimeStamped


class Channel(models.TextChoices):
    EMAIL = "email", "Email"
    WHATSAPP = "whatsapp", "WhatsApp"
    LINKEDIN = "linkedin", "LinkedIn"


class MessageTemplate(TimeStamped):
    """Reusable 3-part-formula outreach template (PRD §7 message templates)."""

    name = models.CharField(max_length=150)
    type = models.CharField(max_length=80, blank=True)
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.EMAIL
    )
    body = models.TextField(help_text="3-part formula: context / ask / close")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OutreachCampaign(TimeStamped):
    """A campaign aimed at a saved segment (PRD §7 outreach campaigns)."""

    name = models.CharField(max_length=150)
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.EMAIL
    )
    segment_filter = models.JSONField(
        default=dict, blank=True, help_text="Saved segment filter, e.g. {branch:'IT', city:'Bengaluru'}"
    )
    template = models.ForeignKey(
        MessageTemplate, null=True, blank=True, on_delete=models.SET_NULL, related_name="campaigns"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="campaigns"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class OutreachContact(TimeStamped):
    """Per-alumnus touch within a campaign (PRD §7 outreach contacts)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        REPLIED = "replied", "Replied"
        BOUNCED = "bounced", "Bounced"

    campaign = models.ForeignKey(
        OutreachCampaign, on_delete=models.CASCADE, related_name="contacts"
    )
    alumni = models.ForeignKey(
        Alumni, on_delete=models.CASCADE, related_name="outreach_touches"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["campaign", "alumni"]

    def __str__(self):
        return f"{self.alumni} · {self.campaign} · {self.status}"
