from django.db import models

from .directory import TimeStamped


class Event(TimeStamped):
    """Events & drives (PRD §7 events)."""

    class Type(models.TextChoices):
        DRIVE = "drive", "Placement Drive"
        WEBINAR = "webinar", "Webinar"
        MEETUP = "meetup", "Meetup"
        MENTORSHIP = "mentorship", "Mentorship"
        OTHER = "other", "Other"

    title = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.OTHER)
    date = models.DateTimeField()
    venue = models.CharField(max_length=200, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    target_audience = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return self.title


class EventParticipant(TimeStamped):
    """Who joins an event (PRD §7 event_participants).

    person is a generic reference to either an alumnus or a student.
    """

    class PersonType(models.TextChoices):
        ALUMNI = "alumni", "Alumni"
        STUDENT = "student", "Student"
        GUEST = "guest", "Guest"

    class ParticipantRole(models.TextChoices):
        SPEAKER = "speaker", "Speaker"
        MENTOR = "mentor", "Mentor"
        ATTENDEE = "attendee", "Attendee"

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="participants"
    )
    person_type = models.CharField(max_length=10, choices=PersonType.choices)
    person_id = models.PositiveIntegerField(null=True, blank=True)
    person_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=10, choices=ParticipantRole.choices, default=ParticipantRole.ATTENDEE
    )
    rsvp = models.BooleanField(default=False)
    attended = models.BooleanField(default=False)

    class Meta:
        ordering = ["person_name"]

    def __str__(self):
        return f"{self.person_name} @ {self.event}"
