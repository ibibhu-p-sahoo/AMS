from django.conf import settings
from django.db import models

from .directory import TimeStamped


class JobPosting(TimeStamped):
    """A job opening posted by an alumnus (or staff), visible to all members.

    Alumni share openings at their companies; everyone logged in can browse them.
    """

    class WorkMode(models.TextChoices):
        ONSITE = "onsite", "On-site"
        HYBRID = "hybrid", "Hybrid"
        REMOTE = "remote", "Remote"

    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    location = models.CharField(max_length=150, blank=True)
    work_mode = models.CharField(
        max_length=10, choices=WorkMode.choices, default=WorkMode.ONSITE
    )
    description = models.TextField()
    apply_url = models.CharField(
        max_length=300, blank=True, help_text="Application link or contact email"
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="job_postings",
    )
    is_open = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} @ {self.company}"
