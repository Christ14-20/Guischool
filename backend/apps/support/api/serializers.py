"""apps/support/api/serializers.py"""
from rest_framework import serializers
from apps.support.models import SupportTicket, TicketMessage


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)

    class Meta:
        model = TicketMessage
        fields = ["id", "ticket", "sender", "sender_email", "message", "timestamp"]
        read_only_fields = ["id", "timestamp", "sender", "sender_email"]


class SupportTicketSerializer(serializers.ModelSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id", "tenant", "user", "user_email", "category", "priority",
            "description", "screenshot_url", "status", "assigned_to",
            "messages", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user", "user_email", "created_at", "updated_at"]


class TicketAssignSerializer(serializers.Serializer):
    assigned_to = serializers.IntegerField(help_text="ID de l'agent de support")


class TicketStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SupportTicket.STATUS_CHOICES)
