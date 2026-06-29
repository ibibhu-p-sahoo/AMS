"""Helpers for creating in-app notifications (PRD §3 Notifications).

`notify_all_users` fans a single message out to every active user — used for
org-wide announcements like a new event or job posting.
"""
from django.contrib.auth import get_user_model

from .models import Notification


def notify_users(users, *, title, message="", link="", kind=Notification.Kind.GENERAL):
    """Bulk-create one notification per user. Returns the number created."""
    objs = [
        Notification(recipient=u, title=title, message=message, link=link, kind=kind)
        for u in users
    ]
    Notification.objects.bulk_create(objs)
    return len(objs)


def notify_all_users(*, title, message="", link="", kind=Notification.Kind.GENERAL, exclude=None):
    """Send a notification to every active user.

    `exclude` (a user or pk) skips one recipient — typically the actor who
    triggered the broadcast, so they don't get pinged about their own action.
    """
    User = get_user_model()
    qs = User.objects.filter(is_active=True)
    if exclude is not None:
        qs = qs.exclude(pk=getattr(exclude, "pk", exclude))
    return notify_users(qs, title=title, message=message, link=link, kind=kind)
