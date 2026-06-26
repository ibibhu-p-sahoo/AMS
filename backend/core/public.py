"""Public, no-login endpoints for built-in forms (PRD §8 Forms).

Job-Intel pulse + Event RSVP land straight in the DB. Throttled as anonymous.
"""
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Alumni, Event, EventParticipant, JobIntelResponse


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
    email = serializers.EmailField(required=False, allow_blank=True)
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
