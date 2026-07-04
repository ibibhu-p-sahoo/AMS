from django.core.mail import send_mail
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from accounts.permissions import OwnerOrStaffWritePermission, RolePermission

from .csv_utils import CsvMixin, parse_bool, parse_int
from .filters import AlumniFilter, ReferralLeadFilter
from .pdf import render_student_brochure
from .models import (
    Alumni,
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
from .notifications import notify_all_users, notify_users
from .serializers import (
    AlumniSerializer,
    AuditLogSerializer,
    CompanySerializer,
    EventParticipantSerializer,
    EventSerializer,
    JobIntelResponseSerializer,
    JobPostingSerializer,
    MessageTemplateSerializer,
    NotificationSerializer,
    OutreachCampaignSerializer,
    OutreachContactSerializer,
    ReferralLeadSerializer,
    StudentSerializer,
    TaskSerializer,
)


class AuditedModelViewSet(viewsets.ModelViewSet):
    """Base ViewSet: RBAC on every endpoint + writes go to the audit log."""

    permission_classes = [RolePermission]
    audit_entity = None  # override

    def _log(self, action_name, instance):
        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action=action_name,
            entity=self.audit_entity or self.queryset.model.__name__,
            entity_id=str(getattr(instance, "pk", "")),
            summary=str(instance)[:255],
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log("created", instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log("updated", instance)

    def perform_destroy(self, instance):
        self._log("deleted", instance)
        instance.delete()


class CompanyViewSet(AuditedModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    audit_entity = "Company"
    search_fields = ["name", "sector"]
    filterset_fields = ["is_in_placement_list", "sector"]
    ordering_fields = ["name", "created_at"]


class AlumniViewSet(CsvMixin, AuditedModelViewSet):
    queryset = Alumni.objects.select_related("company", "updated_by").all()
    serializer_class = AlumniSerializer
    audit_entity = "Alumni"
    filterset_class = AlumniFilter
    search_fields = ["name", "email", "domain", "city", "company__name"]
    ordering_fields = ["name", "batch", "willingness", "updated_at"]

    csv_filename = "alumni"
    csv_columns = [
        "name", "batch", "branch", "company", "role_level", "domain",
        "city", "email", "phone", "linkedin", "status",
        "is_super_alumni", "willingness",
    ]

    def perform_create(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        self._log("created", instance)

    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        self._log("updated", instance)

    def row_to_dict(self, obj):
        return {
            "name": obj.name, "batch": obj.batch, "branch": obj.branch,
            "company": obj.company.name if obj.company else "",
            "role_level": obj.role_level, "domain": obj.domain, "city": obj.city,
            "email": obj.email, "phone": obj.phone, "linkedin": obj.linkedin,
            "status": obj.status, "is_super_alumni": obj.is_super_alumni,
            "willingness": obj.willingness,
        }

    def import_row(self, row):
        email = (row.get("email") or "").strip()
        if not email:
            raise ValueError("email is required")
        # Only update columns actually present in the CSV — a partial file must
        # not blank out fields it doesn't include.
        defaults = {"updated_by": self.request.user}
        if "name" in row:
            defaults["name"] = (row["name"] or "").strip()
        if "batch" in row:
            defaults["batch"] = parse_int(row["batch"], 0)
        if "branch" in row:
            defaults["branch"] = (row["branch"] or "Other").strip()
        if "company" in row:
            cname = (row["company"] or "").strip()
            defaults["company"] = (
                Company.objects.get_or_create(name=cname)[0] if cname else None
            )
        if "role_level" in row:
            defaults["role_level"] = (row["role_level"] or "").strip()
        if "domain" in row:
            defaults["domain"] = (row["domain"] or "").strip()
        if "city" in row:
            defaults["city"] = (row["city"] or "").strip()
        if "phone" in row:
            defaults["phone"] = (row["phone"] or "").strip()
        if "linkedin" in row:
            defaults["linkedin"] = (row["linkedin"] or "").strip()
        if "status" in row:
            defaults["status"] = (row["status"] or "active").strip()
        if "is_super_alumni" in row:
            defaults["is_super_alumni"] = parse_bool(row["is_super_alumni"])
        if "willingness" in row:
            defaults["willingness"] = parse_int(row["willingness"], 3)
        return Alumni.objects.update_or_create(email=email, defaults=defaults)

    @action(detail=False, methods=["get"])
    def segments(self, request):
        """Quick segmentation summary — counts by branch and by city."""
        by_branch = list(
            Alumni.objects.values("branch").annotate(count=Count("id")).order_by("-count")
        )
        by_city = list(
            Alumni.objects.exclude(city="")
            .values("city")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        return Response({"by_branch": by_branch, "by_city": by_city})


class StudentViewSet(CsvMixin, AuditedModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    audit_entity = "Student"
    search_fields = ["name", "domain", "email"]
    filterset_fields = ["branch", "batch"]
    ordering_fields = ["name", "batch", "gpa"]

    csv_filename = "students"
    csv_columns = ["name", "batch", "branch", "gpa", "domain", "skills", "email"]

    def row_to_dict(self, obj):
        skills = "; ".join(obj.skills) if isinstance(obj.skills, list) else ""
        return {
            "name": obj.name, "batch": obj.batch, "branch": obj.branch,
            "gpa": obj.gpa or "", "domain": obj.domain, "skills": skills,
            "email": obj.email,
        }

    def import_row(self, row):
        name = (row.get("name") or "").strip()
        if not name:
            raise ValueError("name is required")
        batch = parse_int(row.get("batch"), 0)
        # Only update columns present in the CSV (partial files don't blank fields).
        defaults = {}
        if "branch" in row:
            defaults["branch"] = (row["branch"] or "Other").strip()
        if "gpa" in row:
            defaults["gpa"] = row["gpa"] or None
        if "domain" in row:
            defaults["domain"] = (row["domain"] or "").strip()
        if "skills" in row:
            raw_skills = (row["skills"] or "").replace(",", ";")
            defaults["skills"] = [s.strip() for s in raw_skills.split(";") if s.strip()]
        if "email" in row:
            defaults["email"] = (row["email"] or "").strip()
        return Student.objects.update_or_create(
            name=name, batch=batch, defaults=defaults
        )

    @action(detail=True, methods=["get"])
    def brochure(self, request, pk=None):
        """Auto-generate the two-page talent brochure as a PDF (PRD §3)."""
        return render_student_brochure(self.get_object())


class MessageTemplateViewSet(AuditedModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    audit_entity = "MessageTemplate"
    search_fields = ["name", "type"]
    filterset_fields = ["channel"]


class OutreachCampaignViewSet(AuditedModelViewSet):
    queryset = OutreachCampaign.objects.select_related("owner", "template").all()
    serializer_class = OutreachCampaignSerializer
    audit_entity = "OutreachCampaign"
    search_fields = ["name"]
    filterset_fields = ["channel", "owner"]

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user)
        self._log("created", instance)

    def get_throttles(self):
        # Rate-limit the outreach-send endpoint per PRD §10.
        if self.action == "send":
            self.throttle_scope = "outreach_send"
        return super().get_throttles()

    @action(detail=True, methods=["post"])
    def populate(self, request, pk=None):
        """Add alumni matching the campaign's saved segment as pending contacts."""
        campaign = self.get_object()
        seg = campaign.segment_filter or {}
        qs = Alumni.objects.filter(status=Alumni.Status.ACTIVE)
        if seg.get("branch"):
            qs = qs.filter(branch=seg["branch"])
        if seg.get("city"):
            qs = qs.filter(city__icontains=seg["city"])
        if seg.get("domain"):
            qs = qs.filter(domain__icontains=seg["domain"])
        if seg.get("min_willingness"):
            qs = qs.filter(willingness__gte=int(seg["min_willingness"]))
        added = 0
        for alum in qs:
            _, created = OutreachContact.objects.get_or_create(
                campaign=campaign, alumni=alum,
                defaults={"status": OutreachContact.Status.PENDING},
            )
            added += int(created)
        self._log("updated", campaign)
        return Response({"matched": qs.count(), "added": added})

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Send the campaign to all pending contacts.

        Email channel sends real email (via the configured backend — console in
        dev, SendGrid/SES SMTP in prod). WhatsApp/LinkedIn touches are only
        logged, not auto-sent (PRD §8). Rate limited per PRD §10.
        """
        campaign = self.get_object()
        body_tmpl = campaign.template.body if campaign.template else "Hello {name},"
        contacts = campaign.contacts.filter(
            status=OutreachContact.Status.PENDING
        ).select_related("alumni")
        sent = 0
        for contact in contacts:
            alum = contact.alumni
            if campaign.channel == "email" and alum.email:
                message = (
                    body_tmpl.replace("{name}", alum.name)
                    .replace("{company}", alum.company.name if alum.company else "")
                    .replace("{domain}", alum.domain or "")
                )
                send_mail(
                    subject=campaign.name,
                    message=message,
                    from_email=None,
                    recipient_list=[alum.email],
                    fail_silently=True,
                )
            contact.status = OutreachContact.Status.SENT
            contact.sent_at = timezone.now()
            contact.save(update_fields=["status", "sent_at", "updated_at"])
            sent += 1
        self._log("updated", campaign)
        return Response({"sent": sent, "channel": campaign.channel})


class OutreachContactViewSet(AuditedModelViewSet):
    queryset = OutreachContact.objects.select_related("alumni", "campaign").all()
    serializer_class = OutreachContactSerializer
    audit_entity = "OutreachContact"
    filterset_fields = ["campaign", "status", "alumni"]


class EventViewSet(AuditedModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    audit_entity = "Event"
    search_fields = ["title", "venue"]
    filterset_fields = ["type"]
    ordering_fields = ["date", "title"]

    def _announce_event(self, instance, verb="New event"):
        if instance.date and instance.date >= timezone.now():
            from .tasks import send_event_announcement
            try:
                send_event_announcement.delay(instance.id)
            except Exception:
                send_event_announcement(instance.id)
            when = timezone.localtime(instance.date).strftime("%d %b %Y, %I:%M %p")
            notify_all_users(
                title=f"{verb}: {instance.title}",
                message=f"{when} · {instance.venue or 'TBA'}",
                link="/events",
                kind=Notification.Kind.EVENT,
            )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log("created", instance)
        self._announce_event(instance, verb="New event")

    def perform_update(self, serializer):
        old_date = serializer.instance.date
        instance = serializer.save()
        self._log("updated", instance)
        # Notify if date changed to a future time
        if instance.date != old_date:
            self._announce_event(instance, verb="Event updated")


class EventParticipantViewSet(AuditedModelViewSet):
    queryset = EventParticipant.objects.select_related("event").all()
    serializer_class = EventParticipantSerializer
    audit_entity = "EventParticipant"
    filterset_fields = ["event", "person_type", "role", "rsvp", "attended"]
    # Volunteers may RSVP people in / mark attendance.
    write_roles = {Role.ADMIN, Role.COORDINATOR, Role.VOLUNTEER}


class ReferralLeadViewSet(AuditedModelViewSet):
    queryset = ReferralLead.objects.select_related("alumni", "student", "company").all()
    serializer_class = ReferralLeadSerializer
    audit_entity = "ReferralLead"
    filterset_class = ReferralLeadFilter
    ordering_fields = ["created_at", "last_followup_at", "stage"]
    write_roles = {Role.ADMIN, Role.COORDINATOR, Role.VOLUNTEER}

    @action(detail=True, methods=["post"])
    def followup(self, request, pk=None):
        """Record a follow-up — resets the 48h SLA clock."""
        lead = self.get_object()
        lead.last_followup_at = timezone.now()
        lead.save(update_fields=["last_followup_at", "updated_at"])
        self._log("updated", lead)
        return Response(ReferralLeadSerializer(lead).data)


class JobIntelResponseViewSet(AuditedModelViewSet):
    queryset = JobIntelResponse.objects.select_related("alumni").all()
    serializer_class = JobIntelResponseSerializer
    audit_entity = "JobIntelResponse"
    filterset_fields = ["hiring", "timeline", "alumni"]
    # Built-in form: alumni can submit their own pulse.
    write_roles = {Role.ADMIN, Role.COORDINATOR, Role.VOLUNTEER, Role.ALUMNUS}


class TaskViewSet(AuditedModelViewSet):
    queryset = Task.objects.select_related("assignee").all()
    serializer_class = TaskSerializer
    audit_entity = "Task"
    filterset_fields = ["team", "status", "assignee"]
    ordering_fields = ["due_date", "created_at"]
    write_roles = {Role.ADMIN, Role.COORDINATOR, Role.VOLUNTEER}

    def _notify_assignee(self, task, title):
        # Ping the assignee — but never notify someone about their own action.
        if task.assignee_id and task.assignee_id != self.request.user.id:
            notify_users(
                [task.assignee],
                title=title,
                message=task.title,
                link="/tasks",
                kind=Notification.Kind.TASK,
            )

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log("created", instance)
        self._notify_assignee(instance, "You have a new task")

    def perform_update(self, serializer):
        prev_assignee = serializer.instance.assignee_id
        instance = serializer.save()
        self._log("updated", instance)
        if instance.assignee_id != prev_assignee:
            self._notify_assignee(instance, "A task was assigned to you")


class JobPostingViewSet(AuditedModelViewSet):
    queryset = JobPosting.objects.select_related("posted_by").all()
    serializer_class = JobPostingSerializer
    audit_entity = "JobPosting"
    permission_classes = [OwnerOrStaffWritePermission]
    search_fields = ["title", "company", "location"]
    filterset_fields = ["work_mode", "is_open"]
    ordering_fields = ["created_at", "title"]
    # Alumni can post jobs too; any logged-in member can read them.
    write_roles = {Role.ADMIN, Role.COORDINATOR, Role.VOLUNTEER, Role.ALUMNUS}

    def perform_create(self, serializer):
        instance = serializer.save(posted_by=self.request.user)
        self._log("created", instance)
        # The job board is visible to everyone → broadcast new openings.
        notify_all_users(
            title=f"New job: {instance.title}",
            message=f"{instance.company} · {instance.location or 'Remote'}",
            link="/jobs",
            kind=Notification.Kind.JOB,
            exclude=self.request.user,
        )


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Each user's own notification inbox — list, mark read, dismiss."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_read", "kind"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        return Response({"unread": self.get_queryset().filter(is_read=False).count()})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked": updated})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=["is_read", "updated_at"])
        return Response(self.get_serializer(notif).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit trail — admins and coordinators only."""

    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [RolePermission]
    read_roles = {Role.ADMIN, Role.COORDINATOR}
    filterset_fields = ["action", "entity", "user"]
    search_fields = ["entity", "summary"]


class DashboardView(APIView):
    """KPI analytics (PRD §3 Dashboards) — aggregate counts across modules."""

    permission_classes = [RolePermission]

    def get(self, request):
        from datetime import timedelta

        from django.contrib.auth import get_user_model
        from django.db.models.functions import TruncMonth

        from .models import JobPosting

        sla_cutoff = timezone.now() - timedelta(hours=48)
        breached = ReferralLead.objects.filter(
            outcome=ReferralLead.Outcome.PENDING
        ).exclude(stage=ReferralLead.Stage.CLOSED).filter(
            Q(last_followup_at__lt=sla_cutoff)
            | Q(last_followup_at__isnull=True, created_at__lt=sla_cutoff)
        ).count()

        my_tasks_open = Task.objects.filter(
            assignee=request.user
        ).exclude(status="done").count() if request.user.is_authenticated else 0

        # Alumni growth: cumulative month-by-month for current year
        now = timezone.now()
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_new = (
            Alumni.objects
            .filter(created_at__gte=year_start)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        base_count = Alumni.objects.filter(created_at__lt=year_start).count()
        months_short = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        growth_map = {r["month"].month: r["count"] for r in monthly_new}
        alumni_growth = []
        running = base_count
        for m in range(1, now.month + 1):
            running += growth_map.get(m, 0)
            alumni_growth.append({"month": months_short[m - 1], "alumni": running})

        # Recent activities from audit log
        recent_logs = AuditLog.objects.select_related("user").order_by("-timestamp")[:8]
        recent_activities = [
            {
                "id": log.pk,
                "action": log.action,
                "entity": log.entity,
                "summary": log.summary,
                "user": log.user.name if log.user and hasattr(log.user, "name") else (log.user.email if log.user else "System"),
                "timestamp": log.timestamp.isoformat(),
            }
            for log in recent_logs
        ]

        data = {
            "jobs_open": JobPosting.objects.filter(is_open=True).count(),
            "users_total": get_user_model().objects.count(),
            "my_tasks_open": my_tasks_open,
            "alumni_total": Alumni.objects.count(),
            "alumni_active": Alumni.objects.filter(status="active").count(),
            "super_alumni": Alumni.objects.filter(is_super_alumni=True).count(),
            "students_total": Student.objects.count(),
            "companies_total": Company.objects.count(),
            "companies_in_placement": Company.objects.filter(is_in_placement_list=True).count(),
            "campaigns_total": OutreachCampaign.objects.count(),
            "outreach_sent": OutreachContact.objects.filter(status="sent").count(),
            "outreach_replied": OutreachContact.objects.filter(status="replied").count(),
            "events_total": Event.objects.count(),
            "events_upcoming": Event.objects.filter(date__gte=timezone.now()).count(),
            "referrals_open": ReferralLead.objects.exclude(stage="closed").count(),
            "referrals_placed": ReferralLead.objects.filter(outcome="placed").count(),
            "referrals_sla_breached": breached,
            "tasks_open": Task.objects.exclude(status="done").count(),
            "hiring_now": JobIntelResponse.objects.filter(hiring=True).count(),
            "referrals_by_stage": list(
                ReferralLead.objects.values("stage").annotate(count=Count("id")).order_by("stage")
            ),
            "alumni_by_branch": list(
                Alumni.objects.values("branch").annotate(count=Count("id")).order_by("-count")
            ),
            "alumni_growth": alumni_growth,
            "recent_activities": recent_activities,
        }
        return Response(data)
