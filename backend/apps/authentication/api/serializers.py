"""
apps/authentication/api/serializers.py
Serializers pour : Register, Login, TokenRefresh, Logout, UserMe.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import User, Role


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "password", "password_confirm"]
        extra_kwargs = {
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"],
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError({"detail": "Identifiants invalides."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "Compte désactivé."})
        attrs["user"] = user
        return attrs


class TokenPairSerializer(serializers.Serializer):
    """Retourne la paire access/refresh tokens."""
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class UserMeSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    tenant_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "phone",
            "role_name", "tenant_id", "email_verified", "phone_verified",
            "is_active", "date_joined", "last_login",
        ]
        read_only_fields = [
            "id", "email", "role_name", "tenant_id",
            "email_verified", "phone_verified", "date_joined", "last_login",
        ]

    def get_role_name(self, obj):
        return obj.get_role_name()

    def get_tenant_id(self, obj):
        return str(obj.tenant_id) if obj.tenant_id else None


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("new_password_confirm"):
            raise serializers.ValidationError({"new_password_confirm": "Les mots de passe ne correspondent pas."})
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text="Token de rafraîchissement à blacklister")
