"""Celery background jobs (PRD §3 Notifications & Reminders, §6.3)."""
from datetime import timedelta

from celery import shared_task
from django.utils import timezone


@shared_task
def check_referral_sla():
    """Surface referral leads that have breached the 48h follow-up SLA.

    In production this would email the lead owner; here it stamps the audit log
    so breaches are visible in the dashboard / audit trail.
    """
    from .models import AuditLog, ReferralLead

    cutoff = timezone.now() - timedelta(hours=48)
    breached = ReferralLead.objects.filter(
        outcome=ReferralLead.Outcome.PENDING
    ).exclude(stage=ReferralLead.Stage.CLOSED).filter(
        last_followup_at__lt=cutoff
    ) | ReferralLead.objects.filter(
        outcome=ReferralLead.Outcome.PENDING,
        last_followup_at__isnull=True,
        created_at__lt=cutoff,
    ).exclude(stage=ReferralLead.Stage.CLOSED)

    count = breached.distinct().count()
    if count:
        AuditLog.objects.create(
            action="sla_alert",
            entity="ReferralLead",
            summary=f"{count} referral lead(s) past the 48h SLA",
        )
    return count


@shared_task
def send_event_announcement(event_id):
    """Email an event announcement to active, consenting alumni.

    Triggered automatically when an upcoming event is created. Recipients go in
    BCC so emails aren't exposed to each other (PII / DPDP). Uses the configured
    email backend (console in dev, SendGrid/SES in prod).
    """
    from django.conf import settings
    from django.core.mail import EmailMessage

    from .models import Alumni, AuditLog, Event

    try:
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return 0
    if event.date < timezone.now():
        return 0  # don't announce past events

    recipients = list(
        Alumni.objects.filter(status=Alumni.Status.ACTIVE, consent_given=True)
        .exclude(email="")
        .values_list("email", flat=True)
    )
    if not recipients:
        return 0

    when = timezone.localtime(event.date).strftime("%d %b %Y, %I:%M %p")
    audience = f"\nAudience: {event.target_audience}" if event.target_audience else ""
    body = (
        f"Hi,\n\nYou're invited to an upcoming event:\n\n"
        f"  {event.title}\n"
        f"  When:  {when}\n"
        f"  Where: {event.venue or 'TBA'}{audience}\n\n"
        f"We'd love to see you there.\n\n— The Alumni Team"
    )
    EmailMessage(
        subject=f"[Event] {event.title}",
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.DEFAULT_FROM_EMAIL],
        bcc=recipients,
    ).send(fail_silently=True)

    AuditLog.objects.create(
        action="email_sent",
        entity="Event",
        entity_id=str(event.id),
        summary=f"Event announcement emailed to {len(recipients)} alumni",
    )
    return len(recipients)


@shared_task
def send_job_intel_pulse():
    """Monthly hiring-pulse trigger (fires on the 1st of the month).

    Logs the trigger; a real deployment would enqueue emails to active,
    consenting alumni via SendGrid/SES.
    """
    from .models import Alumni, AuditLog

    if timezone.now().day != 1:
        return 0
    recipients = Alumni.objects.filter(
        status=Alumni.Status.ACTIVE, consent_given=True
    ).count()
    AuditLog.objects.create(
        action="pulse_sent",
        entity="JobIntelResponse",
        summary=f"Monthly job-intel pulse queued for {recipients} alumni",
    )
    return recipients
