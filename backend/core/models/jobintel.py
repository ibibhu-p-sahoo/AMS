from django.db import models

from .directory import Alumni, TimeStamped


class JobIntelResponse(TimeStamped):
    """Monthly hiring pulse response (PRD §7 job_intel_responses)."""

    class Timeline(models.TextChoices):
        NOW = "now", "Hiring now"
        ONE_THREE = "1-3m", "1–3 months"
        THREE_SIX = "3-6m", "3–6 months"
        NONE = "none", "Not hiring"

    alumni = models.ForeignKey(
        Alumni, on_delete=models.CASCADE, related_name="job_intel_responses"
    )
    hiring = models.BooleanField(default=False)
    roles = models.TextField(blank=True, help_text="Open roles / positions")
    timeline = models.CharField(
        max_length=10, choices=Timeline.choices, default=Timeline.NONE
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Job-intel: {self.alumni} ({self.timeline})"
