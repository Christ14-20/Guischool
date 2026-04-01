"""
apps/authentication/permissions.py
Classes et helpers DRF pour le contrôle d'accès RBAC.
"""
from rest_framework.permissions import BasePermission


class HasPermission(BasePermission):
    """
    Permission DRF paramétrée par un codename.

    Usage :
        permission_classes = [HasPermission("can_create_student")]
    """
    def __init__(self, codename: str):
        self.codename = codename

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.can(self.codename))


def make_permission(codename: str):
    """Fabrique de classes de permission (compatible permission_classes DRF)."""
    class _Perm(HasPermission):
        def __init__(self):
            super().__init__(codename)
    _Perm.__name__ = f"Can_{codename}"
    return _Perm


# ── Permissions prédéfinies ────────────────────────────────────────
CanViewUsers = make_permission("can_view_users")
CanCreateUser = make_permission("can_create_user")
CanEditUser = make_permission("can_edit_user")
CanDeleteUser = make_permission("can_delete_user")

CanCreateSchool = make_permission("can_create_school")
CanViewSchools = make_permission("can_view_schools")
CanSuspendSchool = make_permission("can_suspend_school")
CanReactivateSchool = make_permission("can_reactivate_school")
CanCreatePlan = make_permission("can_create_plan")
CanViewPlans = make_permission("can_view_plans")
CanEditPlan = make_permission("can_edit_plan")

CanViewStudents = make_permission("can_view_students")
CanCreateStudent = make_permission("can_create_student")
CanEditStudent = make_permission("can_edit_student")
CanArchiveStudent = make_permission("can_archive_student")

CanViewGrades = make_permission("can_view_grades")
CanCreateGrade = make_permission("can_create_grade")
CanValidateGrade = make_permission("can_validate_grade")

CanViewAuditLogs = make_permission("can_view_auditlogs")
CanViewSystemAlerts = make_permission("can_view_systemalerts")

CanViewTickets = make_permission("can_view_tickets")
CanAssignTicket = make_permission("can_assign_ticket")
CanUpdateTicketStatus = make_permission("can_update_ticket_status")
