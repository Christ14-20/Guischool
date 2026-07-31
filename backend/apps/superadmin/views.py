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
from apps.superadmin.models import Plan, PlatformInvoice, Tenant
from apps.superadmin.serializers import (
    PlanSerializer,
    PlatformInvoiceSerializer,
    TenantCreateSerializer,
    TenantListSerializer,
    TenantDetailSerializer,
)
from apps.superadmin.services.tenant_service import create_school
from apps.superadmin.services.dashboard_service import get_dashboard_data
from apps.superadmin.services.plan_service import exceeds_limits, find_tenants_exceeding_limits
from apps.superadmin.tasks import send_tenant_status_notification
from apps.monitoring.services import audit_log, get_client_ip
from django.utils import timezone


class PlanViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet pour la gestion des Plans par le Super Admin.
    Supporte :
    - GET        /superadmin/plans/      (liste paginée, filtrable par ?is_active=)
    - POST       /superadmin/plans/      (création)
    - PUT/PATCH  /superadmin/plans/{id}/ (édition — SUPERADMIN-V2-03)

    Pas de DELETE (décision PO 2026-07-31) : Tenant.plan est on_delete=PROTECT,
    donc un vrai DELETE échouerait dès qu'un tenant (actif ou non) référence
    encore ce plan — cas marginal. `is_active=False` (déjà existant, déjà
    appliqué à la création d'école dans tenant_service.py) est la
    désactivation logique ; cette vue d'édition la couvre gratuitement,
    `is_active` étant un champ normal de PlanSerializer.
    """

    queryset = Plan.objects.all().order_by("name")
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_active"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        PUT/PATCH /superadmin/plans/{id}/
        Édition rétroactive (Plan est une référence partagée, pas un
        instantané par école — décision PO confirmée) : bloque en 422 si la
        réduction de max_students/max_staff mettrait un ou plusieurs tenants
        déjà rattachés à ce plan en dépassement, en listant lesquels — même
        invariant que change-plan (plan_service.exceeds_limits), appliqué
        ici à tous les tenants du plan plutôt qu'à un seul.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        new_max_students = serializer.validated_data.get("max_students", instance.max_students)
        new_max_staff = serializer.validated_data.get("max_staff", instance.max_staff)

        affected = find_tenants_exceeding_limits(instance.id, new_max_students, new_max_staff)
        if affected:
            names = ", ".join(t["name"] for t in affected)
            return error_response(
                f"Cette modification dépasserait les nouvelles limites pour "
                f"{len(affected)} établissement(s) déjà rattaché(s) à ce plan : {names}.",
                errors={"affected_tenants": affected},
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        self.perform_update(serializer)
        return success_response(serializer.data)


class TenantViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    ViewSet pour la gestion des Établissements (Tenants) par le Super Admin (§2 du contrat d'API).
    Supporte :
    - POST  /superadmin/schools/ -> Création école + Directeur
    - GET   /superadmin/schools/ -> Liste paginée avec filtres
    - GET   /superadmin/schools/{id}/ -> Détail de l'école
    - PATCH /superadmin/schools/{id}/suspend/ -> Suspendre
    - PATCH /superadmin/schools/{id}/reactivate/ -> Réactiver
    - PATCH /superadmin/schools/{id}/change-plan/ -> Changer de plan
    - GET   /superadmin/schools/{id}/invoices/ -> Liste des factures d'abonnement SaaS
    - PATCH /superadmin/schools/{id}/invoices/{invoice_id}/mark-paid/ -> Marquer payée

    SUPERADMIN-V2-03 — CORRECTIF DE SÉCURITÉ découvert en marge du ticket :
    ce ViewSet héritait auparavant de `viewsets.ModelViewSet`, ce qui exposait
    silencieusement `PUT`/`PATCH`/`DELETE /superadmin/schools/{id}/` génériques
    (jamais documentés, jamais voulus). Le PATCH générique utilisait
    `TenantListSerializer` par défaut (aucun cas "update" dans
    `get_serializer_class`), dont le champ `status` est directement
    inscriptible : un simple `PATCH {"status": "SUSPENDED_HARD"}` contournait
    entièrement le workflow `suspend`/`reactivate` (pas de `reason`, pas
    d'AuditLog, pas de notification). Le DELETE générique, lui, supprimait
    purement et simplement le Tenant (cascade sur toutes ses données).
    Passage à des mixins explicites (List/Create/Retrieve uniquement) :
    toute mutation doit désormais passer par une action nommée, auditée —
    même principe déjà acté pour STAFF-V2-02 ("actions sensibles = endpoint
    nommé, pas un champ noyé dans un PATCH générique"). Test de régression :
    apps/superadmin/tests/test_tenant_generic_mutations_removed.py.
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

    @action(detail=True, methods=["patch"], url_path="change-plan")
    def change_plan(self, request, pk=None):
        """
        PATCH /superadmin/schools/{id}/change-plan/
        Change le plan d'un établissement, effet immédiat sur
        max_students/max_staff (Plan est une référence live, pas un
        instantané — rien à propager). Bloqué en 422 si l'effectif actuel
        de l'établissement dépasserait les limites du plan cible (décision
        PO 2026-07-31, même invariant que check_student_limit/
        check_staff_limit) ; pas de mode « forcer quand même ».
        """
        tenant = self.get_object()
        plan_id = request.data.get("plan_id")

        if not plan_id:
            return error_response(
                "plan_id est requis.", status_code=status.HTTP_400_BAD_REQUEST
            )

        new_plan = Plan.objects.filter(id=plan_id).first()
        if new_plan is None:
            return error_response(
                "Plan non trouvé.", status_code=status.HTTP_404_NOT_FOUND
            )

        if not new_plan.is_active:
            return error_response(
                "Le plan sélectionné n'est pas actif.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        student_count = tenant.get_student_count()
        staff_count = tenant.get_staff_count()
        if exceeds_limits(student_count, staff_count, new_plan.max_students, new_plan.max_staff):
            return error_response(
                f"Ce plan ne peut pas être appliqué : l'établissement compte "
                f"{student_count} élève(s) (limite {new_plan.max_students}) et "
                f"{staff_count} membre(s) du personnel (limite {new_plan.max_staff}).",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        old_plan = tenant.plan
        tenant.plan = new_plan
        tenant.save(update_fields=["plan", "updated_at"])

        audit_log(
            user=request.user,
            tenant=tenant,
            action="tenant:change-plan",
            target_model="Tenant",
            target_id=tenant.id,
            extra={"old_plan_id": str(old_plan.id), "new_plan_id": str(new_plan.id)},
            ip_address=get_client_ip(request),
        )

        return success_response(
            {"id": tenant.id, "plan": {"id": new_plan.id, "name": new_plan.name}}
        )

    @action(detail=True, methods=["get"], url_path="invoices")
    def invoices(self, request, pk=None):
        """
        GET /superadmin/schools/{id}/invoices/
        Liste paginée des factures d'abonnement SaaS (PlatformInvoice) de cet
        établissement — SUPERADMIN-V2-05. `self.get_object()` renvoie déjà
        404 si `id` ne correspond à aucun tenant.
        """
        tenant = self.get_object()
        queryset = PlatformInvoice.objects.filter(tenant=tenant).order_by("-period_start")

        page = self.paginate_queryset(queryset)
        serializer = PlatformInvoiceSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(
        detail=True,
        methods=["patch"],
        url_path=r"invoices/(?P<invoice_id>[0-9a-f-]+)/mark-paid",
    )
    def mark_invoice_paid(self, request, pk=None, invoice_id=None):
        """
        PATCH /superadmin/schools/{id}/invoices/{invoice_id}/mark-paid/
        Marque une facture d'abonnement comme payée (règlement hors
        plateforme : virement, mobile money) — SUPERADMIN-V2-05, action
        manuelle du Super Admin.

        Isolation stricte : `PlatformInvoice` n'est pas `TenantScopedModel`
        (entité globale), donc rien n'empêche par construction qu'un
        `invoice_id` valide mais rattaché à un AUTRE tenant que `{id}` dans
        l'URL soit accepté silencieusement — même famille de faille que le
        `level_id` non filtré par tenant (SCHOOLYEAR-V2-02F) ou l'ancien
        `TenantViewSet` sans restriction de méthode (SUPERADMIN-V2-03).
        Filtrage explicite `tenant_id=pk` ci-dessous, `404` sinon (pas de
        fuite d'existence cross-tenant). Test de régression dédié :
        apps/superadmin/tests/test_platform_invoice.py.
        """
        tenant = self.get_object()
        invoice = PlatformInvoice.objects.filter(id=invoice_id, tenant_id=tenant.id).first()
        if invoice is None:
            return error_response(
                "Facture non trouvée pour cet établissement.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if invoice.status == PlatformInvoice.Status.PAID:
            return error_response(
                "Cette facture est déjà marquée comme payée.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        invoice.status = PlatformInvoice.Status.PAID
        invoice.paid_date = timezone.now().date()
        invoice.save(update_fields=["status", "paid_date", "updated_at"])

        audit_log(
            user=request.user,
            tenant=tenant,
            action="platforminvoice:mark-paid",
            target_model="PlatformInvoice",
            target_id=invoice.id,
            ip_address=get_client_ip(request),
        )

        return success_response(PlatformInvoiceSerializer(invoice).data)


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

