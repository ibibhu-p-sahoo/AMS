from rest_framework import serializers

from .email_utils import DeliverableEmailField
from .models import (
    Alumni,
    AlumniSubmission,
    AuditLog,
    Company,
    Event,
    EventParticipant,
    JobIntelResponse,
    JobPosting,
    MessageTemplate,
    Notification,
    OutreachCampaign,
    OutreachContact,
    ReferralLead,
    Student,
    Task,
)


class CompanySerializer(serializers.ModelSerializer):
    alumni_count = serializers.IntegerField(source="alumni.count", read_only=True)

    class Meta:
        model = Company
        fields = ["id", "name", "sector", "is_in_placement_list", "alumni_count", "created_at"]


class AlumniSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    # Write company by name — creates the Company if it doesn't exist yet, so the
    # employer directory stays driven by alumni (matches CompanyViewSet filter).
    company_input = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    updated_by_name = serializers.CharField(source="updated_by.name", read_only=True)
    # Free-text so the UI can add brand-new branches (MBA, MCA, …) on the fly,
    # instead of being limited to the fixed Branch choices.
    branch = serializers.CharField(max_length=20)
    # Format + real-domain (MX) check.
    email = DeliverableEmailField()
    # Free-text so the UI can add/delete custom values on the fly.
    status = serializers.CharField(required=False, allow_blank=True)
    role_level = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Alumni
        fields = [
            "id", "name", "batch", "dob", "photo", "branch", "company", "company_name", "company_input",
            "role_level", "domain", "city", "email", "phone", "linkedin",
            "github", "twitter", "website", "bio", "skills", "interests",
            "source", "referred_by",
            "status", "is_super_alumni", "willingness", "consent_given",
            "updated_by", "updated_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["updated_by", "company"]

    def _apply_company(self, validated_data):
        # Only touch company when the caller sent the field.
        if "company_input" in validated_data:
            name = (validated_data.pop("company_input") or "").strip()
            validated_data["company"] = (
                Company.objects.get_or_create(name=name)[0] if name else None
            )

    def create(self, validated_data):
        self._apply_company(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_company(validated_data)
        return super().update(instance, validated_data)


class AlumniSubmissionSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.name", read_only=True)

    class Meta:
        model = AlumniSubmission
        fields = [
            "id", "name", "email", "batch", "branch", "company", "role_level",
            "domain", "city", "phone", "linkedin", "source", "referred_by", "photo", "status",
            "reviewed_by", "reviewed_by_name", "created_at",
        ]
        read_only_fields = fields


class StudentSerializer(serializers.ModelSerializer):
    # Free-text so the UI can add brand-new branches on the fly (see Alumni).
    branch = serializers.CharField(max_length=20)
    # Format + real-domain (MX) check. Optional (student email may be blank).
    email = DeliverableEmailField(required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            "id", "name", "batch", "branch", "gpa", "skills", "domain",
            "project_highlights", "email", "created_at",
        ]


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ["id", "name", "type", "channel", "body", "created_at"]


class OutreachContactSerializer(serializers.ModelSerializer):
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)

    class Meta:
        model = OutreachContact
        fields = [
            "id", "campaign", "alumni", "alumni_name", "status",
            "sent_at", "replied_at",
        ]


class OutreachCampaignSerializer(serializers.ModelSerializer):
    channel = serializers.CharField(required=False, allow_blank=True)
    owner_name = serializers.CharField(source="owner.name", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    contact_count = serializers.IntegerField(source="contacts.count", read_only=True)
    # Convenience write-only fields → folded into segment_filter JSON.
    seg_branch = serializers.CharField(write_only=True, required=False, allow_blank=True)
    seg_city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    seg_domain = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = OutreachCampaign
        fields = [
            "id", "name", "channel", "segment_filter", "template", "template_name",
            "owner", "owner_name", "contact_count", "created_at",
            "seg_branch", "seg_city", "seg_domain",
        ]
        read_only_fields = ["owner", "segment_filter"]

    def _build_segment(self, validated_data):
        seg = {}
        for key, field in (("branch", "seg_branch"), ("city", "seg_city"), ("domain", "seg_domain")):
            value = validated_data.pop(field, "")
            if value:
                seg[key] = value
        return seg

    def create(self, validated_data):
        seg = self._build_segment(validated_data)
        validated_data["segment_filter"] = seg
        return super().create(validated_data)

    def update(self, instance, validated_data):
        seg = self._build_segment(validated_data)
        if seg:
            validated_data["segment_filter"] = seg
        return super().update(instance, validated_data)


class EventParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventParticipant
        fields = [
            "id", "event", "person_type", "person_id", "person_name",
            "role", "rsvp", "attended",
        ]


class EventSerializer(serializers.ModelSerializer):
    type = serializers.CharField(required=False, allow_blank=True)
    participant_count = serializers.IntegerField(
        source="participants.count", read_only=True
    )

    class Meta:
        model = Event
        fields = [
            "id", "title", "type", "date", "venue", "capacity",
            "target_audience", "participant_count", "created_at",
        ]


class ReferralLeadSerializer(serializers.ModelSerializer):
    stage = serializers.CharField(required=False, allow_blank=True)
    outcome = serializers.CharField(required=False, allow_blank=True)
    student_name = serializers.CharField(source="student.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)
    is_sla_breached = serializers.SerializerMethodField()

    class Meta:
        model = ReferralLead
        fields = [
            "id", "alumni", "alumni_name", "student", "student_name",
            "company", "company_name", "stage", "outcome", "notes",
            "last_followup_at", "is_sla_breached", "created_at",
        ]

    def get_is_sla_breached(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        if obj.stage in (ReferralLead.Stage.CLOSED,) or obj.outcome != ReferralLead.Outcome.PENDING:
            return False
        ref = obj.last_followup_at or obj.created_at
        return timezone.now() - ref > timedelta(hours=48)


class JobIntelResponseSerializer(serializers.ModelSerializer):
    timeline = serializers.CharField(required=False, allow_blank=True)
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)

    class Meta:
        model = JobIntelResponse
        fields = [
            "id", "alumni", "alumni_name", "hiring", "roles",
            "timeline", "submitted_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    team = serializers.CharField()
    status = serializers.CharField(required=False, allow_blank=True)
    assignee_name = serializers.CharField(source="assignee.name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "team", "title", "assignee", "assignee_name",
            "due_date", "status", "created_at",
        ]


class JobPostingSerializer(serializers.ModelSerializer):
    work_mode = serializers.CharField(required=False, allow_blank=True)
    employment_type = serializers.CharField(required=False, allow_blank=True)
    posted_by_name = serializers.CharField(source="posted_by.name", read_only=True)

    class Meta:
        model = JobPosting
        fields = [
            "id", "title", "company", "location", "work_mode", "employment_type",
            "description", "apply_url", "posted_by", "posted_by_name",
            "is_open", "created_at",
        ]
        read_only_fields = ["posted_by"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "kind", "title", "message", "link", "is_read", "created_at",
        ]
        # Content is set server-side; only is_read is client-writable (mark read).
        read_only_fields = ["kind", "title", "message", "link", "created_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_name", "action", "entity",
            "entity_id", "summary", "timestamp",
        ]
