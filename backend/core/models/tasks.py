from django.conf import settings
from django.db import models

from .directory import TimeStamped


class Task(TimeStamped):
    """Team task tracker (PRD §7 tasks)."""

    class Team(models.TextChoices):
        OUTREACH = "outreach", "Outreach"
        EVENTS = "events", "Events"
        REFERRALS = "referrals", "Referrals"
        DATA = "data", "Data / Directory"

    class Status(models.TextChoices):
        TODO = "todo", "To Do"
        DOING = "doing", "In Progress"
        DONE = "done", "Done"
        BLOCKED = "blocked", "Blocked"

    team = models.CharField(max_length=20, choices=Team.choices)
    title = models.CharField(max_length=200)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="tasks",
    )
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.TODO
    )

    class Meta:
        ordering = ["due_date", "-created_at"]

    def __str__(self):
        return self.title
