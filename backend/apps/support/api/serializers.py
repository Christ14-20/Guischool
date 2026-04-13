"""apps/support/api/serializers.py"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from apps.authentication.models import User
from apps.support.models import SupportTicket, TicketMessage, SchoolOnboardingRequest


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


class SchoolOnboardingRequestCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = SchoolOnboardingRequest
        fields = [
            "school_name",
            "school_type",
            "school_city",
            "school_phone",
            "school_email",
            "admin_first_name",
            "admin_last_name",
            "admin_email",
            "admin_phone",
            "password",
        ]

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        validated_data["admin_password_hash"] = make_password(raw_password)
        return SchoolOnboardingRequest.objects.create(**validated_data)

    def validate_admin_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet email admin existe déjà.")

        pending_exists = SchoolOnboardingRequest.objects.filter(
            admin_email__iexact=value,
            status="PENDING",
        ).exists()
        if pending_exists:
            raise serializers.ValidationError(
                "Une demande est déjà en attente pour cet email admin."
            )
        return value.lower()

    def validate_school_email(self, value):
        pending_exists = SchoolOnboardingRequest.objects.filter(
            school_email__iexact=value,
            status="PENDING",
        ).exists()
        if pending_exists:
            raise serializers.ValidationError(
                "Une demande est déjà en attente pour cet email école."
            )
        return value.lower()


class SchoolOnboardingRequestPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolOnboardingRequest
        fields = [
            "tracking_code",
            "status",
            "school_name",
            "school_type",
            "admin_first_name",
            "admin_last_name",
            "admin_email",
            "review_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SchoolOnboardingRequestAdminSerializer(serializers.ModelSerializer):
    processed_by_email = serializers.EmailField(source="processed_by.email", read_only=True)

    class Meta:
        model = SchoolOnboardingRequest
        fields = [
            "id",
            "tracking_code",
            "school_name",
            "school_type",
            "school_city",
            "school_phone",
            "school_email",
            "admin_first_name",
            "admin_last_name",
            "admin_email",
            "admin_phone",
            "status",
            "review_note",
            "processed_by",
            "processed_by_email",
            "processed_at",
            "created_tenant",
            "created_admin_user",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SchoolOnboardingReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["APPROVED", "REJECTED"])
    review_note = serializers.CharField(required=False, allow_blank=True)
