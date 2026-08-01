"""
apps/authentication/serializers.py — AUTH-02

Serializers pour l'authentification JWT et les endpoints User.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, StaffProfile
from .services.staff_service import ALLOWED_CREATE_ROLES

#: Réutilisé par StaffViewSet.partial_update pour router les champs validés
#: vers StaffProfile plutôt que User.
STAFF_PROFILE_FIELDS = (
    "date_naissance",
    "sexe",
    "date_embauche",
    "type_contrat",
    "numero_cnss",
    "type_compte_paie",
    "numero_compte_paie",
    "statut",
)


def _staff_profile_data(profile) -> dict:
    """
    Représentation plate des champs RH (StaffProfile) — None-safe : un
    profil manquant (ne devrait plus arriver après le backfill STAFF-V2-01,
    mais reste défensif) retombe sur des valeurs vides plutôt qu'une
    exception.
    """
    if profile is None:
        return {
            "date_naissance": None,
            "sexe": "",
            "date_embauche": None,
            "type_contrat": "",
            "numero_cnss": "",
            "type_compte_paie": "",
            "numero_compte_paie": "",
            "statut": StaffProfile.Status.ACTIF,
        }
    return {field: getattr(profile, field) for field in STAFF_PROFILE_FIELDS}


class StaffProfileMixin:
    """
    Fusionne les champs RH (StaffProfile, modèle séparé — cf. sa docstring)
    dans la représentation plate des serializers staff existants, pour que
    le contrat d'API reste inchangé (pas de sous-objet imbriqué côté
    frontend).
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.update(_staff_profile_data(getattr(instance, "staff_profile", None)))
        return data


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

        # Vérification tenant suspendu — SUPERADMIN-V2-01 : seul SUSPENDED_HARD
        # bloque la connexion (message exact du contrat d'API §9, inchangé).
        # SUSPENDED_SOFT laisse la connexion passer : la consultation/export
        # doit rester accessible, ce qui exige un token — l'écriture est
        # bloquée séparément par TenantMiddleware (core/middleware.py).
        from apps.superadmin.models import Tenant
        if user.tenant and user.tenant.status == Tenant.Status.SUSPENDED_HARD:
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


class StaffListSerializer(StaffProfileMixin, serializers.ModelSerializer):
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
        # STAFF-V2-01 : date_naissance/sexe/date_embauche/type_contrat/
        # numero_cnss/type_compte_paie/numero_compte_paie/statut ajoutés par
        # StaffProfileMixin.to_representation, pas listés ici (ModelSerializer
        # les rejetterait, ce ne sont pas des champs de User).


class StaffDetailSerializer(StaffProfileMixin, serializers.ModelSerializer):
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
        # Cf. note StaffListSerializer — champs RH ajoutés par le mixin.


class StaffCreateSerializer(serializers.Serializer):
    """
    Serializer pour POST /auth/staff/ — création d'un compte personnel.

    Champs acceptés :
    - email, first_name, last_name, role, phone, subjects_taught
    - STAFF-V2-01 : champs RH, tous optionnels à la création (un directeur
      peut créer un compte sans avoir toute la paperasse RH sous la main,
      et les compléter ensuite via édition) — date_naissance, sexe,
      date_embauche, type_contrat, numero_cnss, type_compte_paie,
      numero_compte_paie.
    """
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=ALLOWED_CREATE_ROLES)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    subjects_taught = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        default=list,
    )
    date_naissance = serializers.DateField(required=False, allow_null=True, default=None)
    sexe = serializers.ChoiceField(
        choices=StaffProfile.Sexe.choices, required=False, allow_blank=True, default=""
    )
    date_embauche = serializers.DateField(required=False, allow_null=True, default=None)
    type_contrat = serializers.ChoiceField(
        choices=StaffProfile.ContractType.choices, required=False, allow_blank=True, default=""
    )
    numero_cnss = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    type_compte_paie = serializers.ChoiceField(
        choices=StaffProfile.PayrollAccountType.choices, required=False, allow_blank=True, default=""
    )
    numero_compte_paie = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
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

    STAFF-V2-01 : champs RH également modifiables (date_naissance, sexe,
    date_embauche, type_contrat, numero_cnss, type_compte_paie,
    numero_compte_paie, statut) — routés vers StaffProfile plutôt que User
    par StaffViewSet.partial_update (cf. STAFF_PROFILE_FIELDS ci-dessus).
    `statut` est une métadonnée RH pure, indépendante de `is_active`
    (décision PO, cf. docstring StaffProfile) : la modifier ici n'a aucun
    effet sur l'accès, qui reste piloté exclusivement par disable/enable.
    """
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    subjects_taught = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
    )
    date_naissance = serializers.DateField(required=False, allow_null=True)
    sexe = serializers.ChoiceField(
        choices=StaffProfile.Sexe.choices, required=False, allow_blank=True
    )
    date_embauche = serializers.DateField(required=False, allow_null=True)
    type_contrat = serializers.ChoiceField(
        choices=StaffProfile.ContractType.choices, required=False, allow_blank=True
    )
    numero_cnss = serializers.CharField(max_length=50, required=False, allow_blank=True)
    type_compte_paie = serializers.ChoiceField(
        choices=StaffProfile.PayrollAccountType.choices, required=False, allow_blank=True
    )
    numero_compte_paie = serializers.CharField(max_length=50, required=False, allow_blank=True)
    statut = serializers.ChoiceField(choices=StaffProfile.Status.choices, required=False)

    def validate_phone(self, value):
        from core.utils import is_valid_guinea_phone
        if value and not is_valid_guinea_phone(value):
            raise serializers.ValidationError("Format attendu : +224XXXXXXXXX")
        return value
