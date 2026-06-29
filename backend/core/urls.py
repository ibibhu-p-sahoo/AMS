from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .public import PublicEventsView, PublicJobIntelView, PublicRsvpView
from .views import (
    AlumniViewSet,
    AuditLogViewSet,
    CompanyViewSet,
    DashboardView,
    EventParticipantViewSet,
    EventViewSet,
    JobIntelResponseViewSet,
    JobPostingViewSet,
    MessageTemplateViewSet,
    NotificationViewSet,
    OutreachCampaignViewSet,
    OutreachContactViewSet,
    ReferralLeadViewSet,
    StudentViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("alumni", AlumniViewSet)
router.register("students", StudentViewSet)
router.register("companies", CompanyViewSet)
router.register("templates", MessageTemplateViewSet)
router.register("campaigns", OutreachCampaignViewSet)
router.register("outreach-contacts", OutreachContactViewSet)
router.register("events", EventViewSet)
router.register("event-participants", EventParticipantViewSet)
router.register("referrals", ReferralLeadViewSet)
router.register("job-intel", JobIntelResponseViewSet)
router.register("jobs", JobPostingViewSet)
router.register("tasks", TaskViewSet)
router.register("notifications", NotificationViewSet, basename="notification")
router.register("audit-log", AuditLogViewSet)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    # Public, no-login forms (PRD §8)
    path("public/events/", PublicEventsView.as_view(), name="public-events"),
    path("public/rsvp/", PublicRsvpView.as_view(), name="public-rsvp"),
    path("public/job-intel/", PublicJobIntelView.as_view(), name="public-job-intel"),
    path("", include(router.urls)),
]
