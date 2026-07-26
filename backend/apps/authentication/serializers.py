"""
apps/authentication/serializers.py — AUTH-02

Serializers pour l'authentification JWT et les endpoints User.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .services.staff_service import ALLOWED_CREATE_ROLES


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

        # Vérification compte désactivé — STAFF-MVP-01
        if not user.is_active:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Compte désactivé")

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


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer pour POST /auth/change-password/ — AUTH-06.

    Valide :
    - old_password correspond au mot de passe actuel
    - new_password n'est pas identique à old_password
    - new_password_confirm correspond à new_password
    - new_password respecte les validateurs Django (min 12 car, pas commun, pas que numérique)
    """

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("L'ancien mot de passe est incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Les nouveaux mots de passe ne correspondent pas."}
            )
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "Le nouveau mot de passe doit être différent de l'ancien."}
            )
        return attrs

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value


class RoleNestedSerializer(serializers.Serializer):
    """Sérialisation minimale du rôle pour les réponses staff."""
    name = serializers.CharField()
    label = serializers.CharField()


class StaffListSerializer(serializers.ModelSerializer):
    """Serializer pour GET /auth/staff/ — vue liste."""
    role = RoleNestedSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_active",
            "subjects_taught",
            "date_joined",
        ]


class StaffDetailSerializer(serializers.ModelSerializer):
    """Serializer pour GET /auth/staff/{id}/ — vue détail."""
    role = RoleNestedSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_active",
            "must_change_password",
            "subjects_taught",
            "is_email_verified",
            "is_phone_verified",
            "date_joined",
        ]


class StaffCreateSerializer(serializers.Serializer):
    """
    Serializer pour POST /auth/staff/ — création d'un compte personnel.

    Champs acceptés :
    - email, first_name, last_name, role, phone, subjects_taught
    """
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=ALLOWED_CREATE_ROLES)
    phone = serializers.CharField(max_length=20, required=False, default="")
    subjects_taught = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        default=list,
    )

    def validate_phone(self, value):
        from core.utils import is_valid_guinea_phone
        if value and not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Format attendu : +224XXXXXXXXX")
        return value


class StaffUpdateSerializer(serializers.Serializer):
    """
    Serializer pour PATCH /auth/staff/{id}/ — modification.

    Champs modifiables en V1 : first_name, last_name, phone, subjects_taught.
    Pas l'email, pas le rôle (dette V2 explicite).
    """
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    subjects_taught = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
    )

    def validate_phone(self, value):
        from core.utils import is_valid_guinea_phone
        if value and not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Format attendu : +224XXXXXXXXX")
        return value
