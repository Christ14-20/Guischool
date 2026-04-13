"""apps/support/api/views.py"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from django.utils import timezone

from apps.support.models import SupportTicket, TicketMessage, SchoolOnboardingRequest
from apps.authentication.models import Role, User
from apps.authentication.permissions import CanCreateSchool
from apps.superadmin.models import Tenant
from apps.support.api.serializers import (
    SupportTicketSerializer,
    TicketMessageSerializer,
    TicketAssignSerializer,
    TicketStatusSerializer,
    SchoolOnboardingRequestCreateSerializer,
    SchoolOnboardingRequestPublicSerializer,
    SchoolOnboardingRequestAdminSerializer,
    SchoolOnboardingReviewSerializer,
)


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    CRUD sur les tickets de support.
    Les utilisateurs voient leurs propres tickets.
    Les admins voient tous les tickets de leur tenant.
    """
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "priority", "status", "assigned_to"]
    search_fields = ["description"]
    ordering_fields = ["created_at", "updated_at", "priority"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = SupportTicket.objects.filter(tenant=user.tenant).prefetch_related("messages")
        
        # Un utilisateur non-admin ne voit que ses propres tickets
        if user.get_role_name() not in ["ADMIN_SCHOOL", "SUPER_ADMIN"]:
            qs = qs.filter(user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            tenant=self.request.user.tenant
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"status": "success", "data": serializer.data})

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=True, methods=["post"], url_path="messages")
    def add_message(self, request, pk=None):
        """POST /support/tickets/{id}/messages/"""
        ticket = self.get_object()
        serializer = TicketMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ticket=ticket, sender=request.user)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="assign")
    def assign(self, request, pk=None):
        """PATCH /support/tickets/{id}/assign/"""
        ticket = self.get_object()
        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.assigned_to_id = serializer.validated_data["assigned_to"]
        ticket.status = "IN_PROGRESS"
        ticket.save(update_fields=["assigned_to_id", "status", "updated_at"])
        return Response({"status": "success", "message": f"Ticket assigné à l'agent #{ticket.assigned_to_id}"})

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """PATCH /support/tickets/{id}/status/"""
        ticket = self.get_object()
        serializer = TicketStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.status = serializer.validated_data["status"]
        ticket.save(update_fields=["status", "updated_at"])
        return Response({"status": "success", "message": f"Statut mis à jour : {ticket.get_status_display()}"})


class PublicSchoolOnboardingRequestCreateView(APIView):
    """POST public pour demande d'ouverture d'école + admin école."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = SchoolOnboardingRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            {
                "status": "success",
                "message": "Demande envoyée. En attente de validation par Eduguinee.",
                "data": {
                    "tracking_code": instance.tracking_code,
                    "request_status": instance.status,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PublicSchoolOnboardingRequestStatusView(APIView):
    """GET public pour consulter l'état d'une demande via code + email admin."""
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        tracking_code = (request.query_params.get("tracking_code") or "").strip().upper()
        admin_email = (request.query_params.get("admin_email") or "").strip().lower()

        if not tracking_code or not admin_email:
            return Response(
                {
                    "status": "error",
                    "message": "Paramètres requis: tracking_code et admin_email.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance = SchoolOnboardingRequest.objects.filter(
            tracking_code=tracking_code,
            admin_email__iexact=admin_email,
        ).first()

        if not instance:
            return Response(
                {"status": "error", "message": "Demande introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = SchoolOnboardingRequestPublicSerializer(instance).data
        return Response({"status": "success", "data": payload})


class AdminSchoolOnboardingRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Gestion admin des demandes d'onboarding école."""
    serializer_class = SchoolOnboardingRequestAdminSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "school_type"]
    search_fields = ["school_name", "tracking_code", "admin_email", "school_email"]
    ordering_fields = ["created_at", "updated_at", "processed_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "review":
            return [CanCreateSchool()]
        return [CanCreateSchool()]

    def get_queryset(self):
        return SchoolOnboardingRequest.objects.select_related(
            "processed_by", "created_tenant", "created_admin_user"
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        return Response({"status": "success", "data": self.get_serializer(self.get_object()).data})

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        onboarding = self.get_object()
        if onboarding.status != "PENDING":
            raise ValidationError("Cette demande a déjà été traitée.")

        serializer = SchoolOnboardingReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["status"]
        review_note = serializer.validated_data.get("review_note", "")

        if decision == "REJECTED":
            onboarding.status = "REJECTED"
            onboarding.review_note = review_note
            onboarding.processed_by = request.user
            onboarding.processed_at = timezone.now()
            onboarding.save(update_fields=["status", "review_note", "processed_by", "processed_at", "updated_at"])
            return Response(
                {
                    "status": "success",
                    "message": "Demande rejetée.",
                    "data": SchoolOnboardingRequestAdminSerializer(onboarding).data,
                }
            )

        # APPROVED
        if User.objects.filter(email__iexact=onboarding.admin_email).exists():
            raise ValidationError("Impossible d'approuver: l'email admin existe déjà.")

        admin_role, _ = Role.objects.get_or_create(
            name="ADMIN_SCHOOL",
            defaults={"description": "Administrateur école"},
        )

        # Slug unique dérivé du nom d'école
        base_slug = onboarding.school_name.lower().replace("'", "").replace(" ", "-")
        slug = "-".join(filter(None, base_slug.split("-")))[:110] or "ecole"
        unique_slug = slug
        i = 1
        while Tenant.objects.filter(slug=unique_slug).exists():
            i += 1
            unique_slug = f"{slug[:100]}-{i}"

        tenant = Tenant.objects.create(
            name=onboarding.school_name,
            slug=unique_slug,
            type=onboarding.school_type,
            status="TRIAL",
            address=onboarding.school_city,
            phone=onboarding.school_phone,
            email=onboarding.school_email,
        )

        admin_user = User.objects.create_user(
            email=onboarding.admin_email,
            password=None,
            first_name=onboarding.admin_first_name,
            last_name=onboarding.admin_last_name,
            phone=onboarding.admin_phone,
            tenant=tenant,
            role=admin_role,
            is_active=True,
        )
        admin_user.password = onboarding.admin_password_hash
        admin_user.save(update_fields=["password"])

        onboarding.status = "APPROVED"
        onboarding.review_note = review_note
        onboarding.processed_by = request.user
        onboarding.processed_at = timezone.now()
        onboarding.created_tenant = tenant
        onboarding.created_admin_user = admin_user
        onboarding.save(
            update_fields=[
                "status",
                "review_note",
                "processed_by",
                "processed_at",
                "created_tenant",
                "created_admin_user",
                "updated_at",
            ]
        )

        return Response(
            {
                "status": "success",
                "message": "Demande approuvée. École et compte admin créés.",
                "data": SchoolOnboardingRequestAdminSerializer(onboarding).data,
            }
        )
