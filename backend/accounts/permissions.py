from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


class RolePermission(BasePermission):
    """Generic RBAC enforced on every endpoint, not just hidden in the UI (PRD §10).

    A ViewSet declares which roles may write via `write_roles`. Read access is
    granted to any authenticated user unless `read_roles` is set. Admins always
    pass. Read-only and Alumnus roles can never write through the API.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_admin:
            return True

        if request.method in SAFE_METHODS:
            read_roles = getattr(view, "read_roles", None)
            return read_roles is None or user.role in read_roles

        write_roles = getattr(
            view, "write_roles", {Role.ADMIN, Role.COORDINATOR}
        )
        return user.role in write_roles


class OwnerOrStaffWritePermission(RolePermission):
    """Create is gated by `write_roles`; edit/delete limited to the record's
    owner, coordinators, or admins (so members can't touch each other's posts)."""

    owner_field = "posted_by_id"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if user.is_admin or user.role == Role.COORDINATOR:
            return True
        return getattr(obj, self.owner_field, None) == user.id


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)
