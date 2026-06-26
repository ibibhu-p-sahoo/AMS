from django.db import models

from .directory import Alumni, Company, Student, TimeStamped


class ReferralLead(TimeStamped):
    """Placement pipeline linking alumni ↔ student ↔ company (PRD §7 referral_leads).

    Carries a 48-hour SLA on follow-ups (PRD §3 Referral & Placement Pipeline).
    """

    class Stage(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        REFERRED = "referred", "Referred"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        CLOSED = "closed", "Closed"

    class Outcome(models.TextChoices):
        PENDING = "pending", "Pending"
        PLACED = "placed", "Placed"
        REJECTED = "rejected", "Rejected"
        DROPPED = "dropped", "Dropped"

    alumni = models.ForeignKey(
        Alumni, null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )
    student = models.ForeignKey(
        Student, null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )
    company = models.ForeignKey(
        Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.NEW)
    outcome = models.CharField(
        max_length=20, choices=Outcome.choices, default=Outcome.PENDING
    )
    notes = models.TextField(blank=True)
    last_followup_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Referral #{self.pk}: {self.student} → {self.company}"
