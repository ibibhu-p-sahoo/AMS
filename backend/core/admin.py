from django.contrib import admin

from .models import (
    Alumni,
    AuditLog,
    Company,
    Event,
    EventParticipant,
    JobIntelResponse,
    MessageTemplate,
    Notification,
    OutreachCampaign,
    OutreachContact,
    ReferralLead,
    Student,
    Task,
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "sector", "is_in_placement_list")
    list_filter = ("is_in_placement_list", "sector")
    search_fields = ("name", "sector")


@admin.register(Alumni)
class AlumniAdmin(admin.ModelAdmin):
    list_display = ("name", "batch", "branch", "company", "city", "status", "is_super_alumni", "willingness")
    list_filter = ("branch", "status", "is_super_alumni", "role_level")
    search_fields = ("name", "email", "city", "domain")
    autocomplete_fields = ("company",)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("name", "batch", "branch", "gpa", "domain")
    list_filter = ("branch", "batch")
    search_fields = ("name", "domain")


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "channel")
    list_filter = ("channel",)


class OutreachContactInline(admin.TabularInline):
    model = OutreachContact
    extra = 0


@admin.register(OutreachCampaign)
class OutreachCampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "channel", "owner", "created_at")
    list_filter = ("channel",)
    inlines = [OutreachContactInline]


class EventParticipantInline(admin.TabularInline):
    model = EventParticipant
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "date", "venue", "capacity")
    list_filter = ("type",)
    inlines = [EventParticipantInline]


@admin.register(ReferralLead)
class ReferralLeadAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "company", "stage", "outcome", "last_followup_at")
    list_filter = ("stage", "outcome")


@admin.register(JobIntelResponse)
class JobIntelResponseAdmin(admin.ModelAdmin):
    list_display = ("alumni", "hiring", "timeline", "submitted_at")
    list_filter = ("hiring", "timeline")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "team", "assignee", "due_date", "status")
    list_filter = ("team", "status")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
    search_fields = ("title", "message", "recipient__email")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "action", "entity", "entity_id", "summary")
    list_filter = ("action", "entity")
    search_fields = ("summary",)
    readonly_fields = ("timestamp",)
