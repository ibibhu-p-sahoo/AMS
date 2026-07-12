"""Public, no-login endpoints for built-in forms (PRD §8 Forms).

Job-Intel pulse + Event RSVP land straight in the DB. Throttled as anonymous.
"""
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .email_utils import DeliverableEmailField
from .models import Alumni, AlumniSubmission, Company, Event, EventParticipant, JobIntelResponse


class PublicEventsView(APIView):
    """Upcoming events for the public RSVP form."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        events = Event.objects.filter(date__gte=timezone.now()).order_by("date")[:50]
        return Response(
            [
                {"id": e.id, "title": e.title, "date": e.date, "venue": e.venue}
                for e in events
            ]
        )


class RsvpSerializer(serializers.Serializer):
    event = serializers.IntegerField()
    name = serializers.CharField(max_length=150)
    email = DeliverableEmailField(required=False, allow_blank=True)
    person_type = serializers.ChoiceField(
        choices=["alumni", "student", "guest"], default="guest"
    )


class PublicRsvpView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        s = RsvpSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        try:
            event = Event.objects.get(pk=data["event"])
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=404)
        EventParticipant.objects.create(
            event=event,
            person_type=data["person_type"],
            person_name=data["name"],
            role=EventParticipant.ParticipantRole.ATTENDEE,
            rsvp=True,
        )
        return Response(
            {"detail": f"RSVP recorded for “{event.title}”. Thank you!"}, status=201
        )


class JobIntelPublicSerializer(serializers.Serializer):
    email = serializers.EmailField()
    hiring = serializers.BooleanField(default=False)
    roles = serializers.CharField(required=False, allow_blank=True)
    timeline = serializers.ChoiceField(
        choices=["now", "1-3m", "3-6m", "none"], default="none"
    )


class PublicJobIntelView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        s = JobIntelPublicSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        alumni = Alumni.objects.filter(email__iexact=data["email"]).first()
        if not alumni:
            return Response(
                {"detail": "We couldn't find an alumnus with that email. Please contact the team."},
                status=404,
            )
        JobIntelResponse.objects.create(
            alumni=alumni,
            hiring=data["hiring"],
            roles=data.get("roles", ""),
            timeline=data["timeline"],
        )
        return Response(
            {"detail": "Thanks! Your hiring pulse has been recorded."}, status=201
        )


class PublicAlumniSerializer(serializers.Serializer):
    """Alumni self-registration / profile-update via a shareable public link."""

    name = serializers.CharField(max_length=150)
    email = DeliverableEmailField()
    batch = serializers.IntegerField(min_value=1900, max_value=2100)
    branch = serializers.CharField(max_length=20)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    role_level = serializers.CharField(max_length=20, required=False, allow_blank=True)
    domain = serializers.CharField(max_length=120, required=False, allow_blank=True)
    city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    linkedin = serializers.CharField(max_length=200, required=False, allow_blank=True)
    photo = serializers.CharField(required=False, allow_blank=True)


class PublicAlumniView(APIView):
    """Self-service form: alumni submit their profile. Submissions land in a
    review queue and only reach the directory once an admin approves them."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        s = PublicAlumniSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        AlumniSubmission.objects.create(
            name=d["name"].strip(),
            email=d["email"].strip(),
            batch=d["batch"],
            branch=d["branch"].strip(),
            company=(d.get("company") or "").strip(),
            role_level=(d.get("role_level") or "").strip(),
            domain=(d.get("domain") or "").strip(),
            city=(d.get("city") or "").strip(),
            phone=(d.get("phone") or "").strip(),
            linkedin=(d.get("linkedin") or "").strip(),
            photo=(d.get("photo") or "").strip(),
        )
        return Response(
            {"detail": "Thanks! Your details were submitted and will appear once our team reviews them."},
            status=201,
        )
