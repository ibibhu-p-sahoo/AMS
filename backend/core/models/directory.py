from django.conf import settings
from django.db import models


class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Branch(models.TextChoices):
    CSE = "CSE", "Computer Science"
    IT = "IT", "Information Technology"
    ECE = "ECE", "Electronics & Comm."
    EEE = "EEE", "Electrical & Electronics"
    MECH = "Mech", "Mechanical"
    CIVIL = "Civil", "Civil"
    MBA = "MBA", "MBA"
    OTHER = "Other", "Other"


class Company(TimeStamped):
    """Employer directory (PRD §7 companies)."""

    name = models.CharField(max_length=200, unique=True)
    sector = models.CharField(max_length=120, blank=True)
    is_in_placement_list = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Alumni(TimeStamped):
    """Alumni master record (PRD §7 alumni)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PASSIVE = "passive", "Passive"

    class RoleLevel(models.TextChoices):
        JUNIOR = "junior", "Junior"
        MID = "mid", "Mid"
        SENIOR = "senior", "Senior"
        LEAD = "lead", "Lead / Manager"
        EXEC = "exec", "Executive"

    name = models.CharField(max_length=150)
    batch = models.PositiveIntegerField(help_text="Graduation year")
    dob = models.DateField(null=True, blank=True, help_text="Date of birth")
    # Small avatar stored inline as a data URL (resized client-side) — avoids a
    # separate media pipeline while persisting in the DB.
    photo = models.TextField(blank=True, help_text="Profile photo (data URL)")
    branch = models.CharField(max_length=20, choices=Branch.choices)
    company = models.ForeignKey(
        Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="alumni"
    )
    role_level = models.CharField(
        max_length=20, choices=RoleLevel.choices, blank=True
    )
    domain = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    linkedin = models.CharField(max_length=200, blank=True)
    github = models.CharField(max_length=200, blank=True)
    twitter = models.CharField(max_length=200, blank=True)
    website = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    skills = models.CharField(
        max_length=400, blank=True, help_text="Comma-separated skills"
    )
    interests = models.CharField(
        max_length=400, blank=True, help_text="Comma-separated interests"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    is_super_alumni = models.BooleanField(default=False)
    willingness = models.PositiveSmallIntegerField(
        default=3, help_text="1 (low) – 5 (high) willingness to help"
    )
    consent_given = models.BooleanField(
        default=False, help_text="DPDP Act consent to store/contact"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_alumni",
    )

    class Meta:
        verbose_name_plural = "alumni"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["branch", "city"]),
            models.Index(fields=["domain"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.batch}/{self.branch})"


class AlumniSubmission(TimeStamped):
    """A self-service alumni profile submission (public form) awaiting review.
    On approval it creates/updates the matching Alumni record."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    name = models.CharField(max_length=150)
    email = models.EmailField()
    batch = models.PositiveIntegerField()
    branch = models.CharField(max_length=20)
    company = models.CharField(max_length=200, blank=True)
    role_level = models.CharField(max_length=20, blank=True)
    domain = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    linkedin = models.CharField(max_length=200, blank=True)
    photo = models.TextField(blank=True, help_text="Profile photo (data URL)")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_submissions",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}> ({self.status})"


class Student(TimeStamped):
    """Student / talent profile (PRD §7 students)."""

    name = models.CharField(max_length=150)
    batch = models.PositiveIntegerField(help_text="Expected graduation year")
    branch = models.CharField(max_length=20, choices=Branch.choices)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True)
    domain = models.CharField(max_length=120, blank=True)
    project_highlights = models.TextField(blank=True)
    email = models.EmailField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.batch}/{self.branch})"
