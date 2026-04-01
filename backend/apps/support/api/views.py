"""apps/support/api/views.py"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.support.models import SupportTicket, TicketMessage
from apps.support.api.serializers import (
    SupportTicketSerializer,
    TicketMessageSerializer,
    TicketAssignSerializer,
    TicketStatusSerializer,
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
