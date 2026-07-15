"""
apps/authentication/serializers.py — AUTH-02

Serializers pour l'authentification JWT et les endpoints User.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class TenantMiniSerializer(serializers.Serializer):
    """Représentation minimale du tenant dans la réponse de login."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Override du serializer simplejwt pour :
    1. Utiliser email comme champ de connexion (USERNAME_FIELD = "email")
    2. Injecter les claims personnalisés dans le JWT (tenant_id, role)
    3. Retourner l'objet user avec la réponse login
    """

    username_field = "email"

    @classmethod
    def get_token(cls, user: User):
        """Injecte les claims personnalisés dans l'access token."""
        token = super().get_token(user)
        token["role"] = user.role.name if user.role else None
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Vérification tenant suspendu — message exact du contrat d'API §9
        if user.tenant and user.tenant.status == "SUSPENDED":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Compte suspendu")

        # Construction de la réponse conforme au contrat §1
        tenant_data = None
        if user.tenant:
            tenant_data = {
                "id": str(user.tenant.id),
                "name": user.tenant.name,
                "slug": user.tenant.slug,
            }

        return {
            "access_token": data["access"],
            "refresh_token": data["refresh"],
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.name if user.role else None,
                "must_change_password": user.must_change_password,
                "tenant": tenant_data,
            },
        }


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer pour GET /users/me/ et PATCH /users/me/.
    Seuls les champs listés dans `read_only_fields` ne sont pas modifiables via PATCH.
    """
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "role",
            "is_email_verified",
            "is_phone_verified",
            "must_change_password",
        ]
        read_only_fields = [
            "id",
            "email",
            "role",
            "is_email_verified",
            "is_phone_verified",
            "must_change_password",
        ]

    def get_role(self, obj) -> str | None:
        return obj.role.name if obj.role else None

    def validate_phone(self, value):
        """Validation du téléphone guinéen — message exact du contrat d'API §9."""
        from core.utils import is_valid_guinea_phone
        if value and not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Format attendu : +224XXXXXXXXX")
        return value
