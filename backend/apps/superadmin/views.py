"""
apps/superadmin/views.py — TENANT-02 / TENANT-03 / TENANT-04

Vues DRF pour la gestion des Plans et des Tenants par le Super Administrateur.
"""

from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import IsSuperAdmin
from core.utils import success_response, created_response, error_response
from apps.superadmin.models import Plan, Tenant
from apps.superadmin.serializers import (
    PlanSerializer,
    TenantCreateSerializer,
    TenantListSerializer,
    TenantDetailSerializer,
)
from apps.superadmin.services.tenant_service import create_school
from apps.superadmin.services.dashboard_service import get_dashboard_data
from apps.superadmin.tasks import send_tenant_status_notification
from apps.monitoring.services import audit_log, get_client_ip


class PlanViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet pour la gestion des Plans par le Super Admin.
    Supporte :
    - GET  /superadmin/plans/ (liste paginée)
    - POST /superadmin/plans/ (création)
    """

    queryset = Plan.objects.all().order_by("name")
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)


class TenantViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des Établissements (Tenants) par le Super Admin (§2 du contrat d'API).
    Supporte :
    - POST  /superadmin/schools/ -> Création école + Directeur
    - GET   /superadmin/schools/ -> Liste paginée avec filtres
    - GET   /superadmin/schools/{id}/ -> Détail de l'école
    - PATCH /superadmin/schools/{id}/suspend/ -> Suspendre
    - PATCH /superadmin/schools/{id}/reactivate/ -> Réactiver
    """

    queryset = Tenant.objects.all().select_related("plan").order_by("-created_at")
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "plan_id"]
    search_fields = ["name", "contact_name", "contact_email"]
    ordering_fields = ["created_at", "name"]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        elif self.action == "retrieve":
            return TenantDetailSerializer
        return TenantListSerializer

    def retrieve(self, request, *args, **kwargs):
        """GET /superadmin/schools/{id}/ — Envelopppe dans success_response."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        POST /superadmin/schools/
        Workflow de création via le service métier.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip_addr = get_client_ip(request)
        tenant, temp_pass = create_school(serializer.validated_data, ip_address=ip_addr)

        # Log l'audit pour le super admin connecté
        audit_log(
            user=request.user,
            tenant=tenant,
            action="tenant:create",
            ip_address=ip_addr,
        )

        response_data = {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "status": tenant.status,
            "trial_ends_at": tenant.trial_ends_at,
            "director_account": {
                "email": tenant.contact_email,
                "temporary_password": temp_pass,
            },
        }
        return created_response(response_data)

    @action(detail=True, methods=["patch"], url_path="suspend")
    def suspend(self, request, pk=None):
        """
        PATCH /superadmin/schools/{id}/suspend/
        Suspend un établissement avec une raison et un type (SUPERADMIN-V2-01) :
        - SOFT : lecture seule (consultation/export toujours accessibles).
        - HARD : blocage total, y compris lecture.
        """
        tenant = self.get_object()
        reason = request.data.get("reason", "")
        suspension_type = request.data.get("type", "")

        if not reason:
            return error_response(
                "La raison de la suspension est requise.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        type_map = {
            "SOFT": Tenant.Status.SUSPENDED_SOFT,
            "HARD": Tenant.Status.SUSPENDED_HARD,
        }
        if suspension_type not in type_map:
            return error_response(
                "Le type de suspension est requis et doit être 'SOFT' ou 'HARD'.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        new_status = type_map[suspension_type]

        old_status = tenant.status
        tenant.status = new_status
        if not tenant.settings:
            tenant.settings = {}
        tenant.settings["suspend_reason"] = reason
        tenant.save(update_fields=["status", "settings", "updated_at"])

        # Envoi de la notification asynchrone (non bloquante)
        send_tenant_status_notification.delay(str(tenant.id), old_status, new_status)

        # AuditLog
        audit_log(
            user=request.user,
            tenant=tenant,
            action="tenant:suspend",
            ip_address=get_client_ip(request),
        )

        return success_response({"id": tenant.id, "status": tenant.status})

    @action(detail=True, methods=["patch"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        """
        PATCH /superadmin/schools/{id}/reactivate/
        Réactive un établissement suspendu.
        """
        tenant = self.get_object()

        old_status = tenant.status
        tenant.status = Tenant.Status.ACTIVE
        if tenant.settings and "suspend_reason" in tenant.settings:
            tenant.settings.pop("suspend_reason")
        tenant.save(update_fields=["status", "settings", "updated_at"])

        # Envoi de la notification asynchrone (non bloquante)
        send_tenant_status_notification.delay(str(tenant.id), old_status, Tenant.Status.ACTIVE)

        # AuditLog
        audit_log(
            user=request.user,
            tenant=tenant,
            action="tenant:reactivate",
            ip_address=get_client_ip(request),
        )

        return success_response({"id": tenant.id, "status": tenant.status})


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def dashboard(request):
    """
    GET /superadmin/dashboard/ — SUPERADMIN-V2-02
    Tableau de bord plateforme : décompte des écoles par statut, MRR estimé
    (ACTIVE uniquement), évolution des créations sur 12 mois glissants
    (zero-paddée), 5 dernières écoles créées. Vue globale plateforme, aucune
    notion de tenant ici — IsSuperAdmin uniquement.
    """
    data = get_dashboard_data()
    data["recent_schools"] = TenantListSerializer(
        data["recent_schools"], many=True, context={"request": request}
    ).data
    return success_response(data)

