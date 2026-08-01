"""
apps/authentication/tests/test_staff_profile.py — STAFF-V2-01

Tests pour la fiche personnel enrichie (StaffProfile) : création,
lecture/écriture via /auth/staff/, indépendance statut/is_active,
fallback sans profil (défensif, ne devrait plus arriver après le backfill).
"""

import pytest
from datetime import date
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User, Role, StaffProfile, Permission


# ─── Fixtures (mêmes conventions que test_staff.py) ───────────────────────────

@pytest.fixture
def plan(db):
    from apps.superadmin.models import Plan
    return Plan.objects.create(name="Test Plan")


@pytest.fixture
def tenant(plan):
    from apps.superadmin.models import Tenant
    return Tenant.objects.create(
        name="École Test SV1", slug="ecole-test-sv1", school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE, plan=plan, contact_name="Directeur Test",
        contact_phone="+224620000001", contact_email="directeur@ecole-test-sv1.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.create(name="DIRECTOR", label="Directeur")


@pytest.fixture
def teacher_role(db):
    return Role.objects.create(name="TEACHER", label="Enseignant")


@pytest.fixture
def director_user(tenant, director_role):
    return User.objects.create_user(
        username="directeur-sv1", email="directeur@ecole-test-sv1.gn", password="SecurePass123!",
        first_name="Mamadou", last_name="Diallo", role=director_role, tenant=tenant,
    )


@pytest.fixture
def api_client():
    return APIClient()


def _auth(api_client, user):
    url = reverse("auth-login")
    resp = api_client.post(url, {"email": user.email, "password": "SecurePass123!"}, format="json")
    assert resp.status_code == 200, resp.json()
    token = resp.json()["data"]["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def _ensure_director_permissions(director_role):
    for c in ("staff:create", "staff:read", "staff:update", "staff:disable"):
        perm, _ = Permission.objects.get_or_create(codename=c, defaults={"module": "staff"})
        director_role.permissions.add(perm)


# ─── Modèle ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStaffProfileModel:
    def test_default_statut_is_actif(self, tenant, teacher_role):
        user = User.objects.create_user(
            username="ens1", email="ens1@ecole-test-sv1.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant,
        )
        profile = StaffProfile.objects.create(user=user)
        assert profile.statut == StaffProfile.Status.ACTIF

    def test_one_to_one_constraint(self, tenant, teacher_role):
        user = User.objects.create_user(
            username="ens2", email="ens2@ecole-test-sv1.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant,
        )
        StaffProfile.objects.create(user=user)
        with pytest.raises(Exception):
            StaffProfile.objects.create(user=user)


# ─── Service create_staff_account ──────────────────────────────────────────

@pytest.mark.django_db
class TestCreateStaffAccountWithProfile:
    def test_creates_profile_with_rh_fields(self, tenant, director_user, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user,
            email="rh-complet@ecole-test-sv1.gn", first_name="Aissatou", last_name="Bah",
            role_name="TEACHER", date_naissance=date(1990, 5, 12), sexe="F",
            date_embauche=date(2024, 9, 1), type_contrat="CDI", numero_cnss="CNSS-001",
            type_compte_paie="ORANGE_MONEY", numero_compte_paie="+224620000099",
        )

        profile = StaffProfile.objects.get(user=user)
        assert profile.date_naissance == date(1990, 5, 12)
        assert profile.sexe == "F"
        assert profile.date_embauche == date(2024, 9, 1)
        assert profile.type_contrat == "CDI"
        assert profile.numero_cnss == "CNSS-001"
        assert profile.type_compte_paie == "ORANGE_MONEY"
        assert profile.numero_compte_paie == "+224620000099"
        assert profile.statut == StaffProfile.Status.ACTIF

    def test_creates_empty_profile_when_rh_fields_omitted(self, tenant, director_user, teacher_role):
        """L'invariant « tout compte staff a un profil » tient même sans données RH fournies."""
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user,
            email="rh-vide@ecole-test-sv1.gn", first_name="Fanta", last_name="Camara",
            role_name="TEACHER",
        )

        assert StaffProfile.objects.filter(user=user).exists()
        profile = StaffProfile.objects.get(user=user)
        assert profile.date_naissance is None
        assert profile.sexe == ""
        assert profile.statut == StaffProfile.Status.ACTIF


# ─── Endpoints ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStaffProfileEndpoints:
    def test_create_via_api_persists_rh_fields(self, api_client, tenant, director_user, director_role, teacher_role):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {
                "email": "api-rh@ecole-test-sv1.gn", "first_name": "Ibrahim", "last_name": "Sow",
                "role": "TEACHER", "date_naissance": "1988-03-20", "sexe": "M",
                "date_embauche": "2023-01-15", "type_contrat": "VACATAIRE",
                "numero_cnss": "CNSS-042", "type_compte_paie": "BANQUE",
                "numero_compte_paie": "BICIGUI-00998877",
            },
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        data = resp.json()["data"]
        assert data["date_naissance"] == "1988-03-20"
        assert data["sexe"] == "M"
        assert data["date_embauche"] == "2023-01-15"
        assert data["type_contrat"] == "VACATAIRE"
        assert data["numero_cnss"] == "CNSS-042"
        assert data["type_compte_paie"] == "BANQUE"
        assert data["numero_compte_paie"] == "BICIGUI-00998877"
        assert data["statut"] == "ACTIF"

    def test_create_without_rh_fields_still_succeeds(self, api_client, tenant, director_user, director_role, teacher_role):
        """Les champs RH sont optionnels à la création (décision PO)."""
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {"email": "minimal@ecole-test-sv1.gn", "first_name": "A", "last_name": "B", "role": "TEACHER"},
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        assert resp.json()["data"]["statut"] == "ACTIF"
        assert resp.json()["data"]["sexe"] == ""

    def test_invalid_sexe_returns_400(self, api_client, tenant, director_user, director_role, teacher_role):
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {"email": "invalide@ecole-test-sv1.gn", "first_name": "A", "last_name": "B",
             "role": "TEACHER", "sexe": "X"},
            format="json",
        )
        assert resp.status_code == 400

    def test_detail_includes_rh_fields(self, api_client, tenant, director_user, director_role, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="detail@ecole-test-sv1.gn",
            first_name="C", last_name="D", role_name="TEACHER", sexe="F",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-detail", args=[str(user.id)]))
        assert resp.status_code == 200
        assert resp.json()["data"]["sexe"] == "F"
        assert resp.json()["data"]["statut"] == "ACTIF"

    def test_list_includes_rh_fields(self, api_client, tenant, director_user, director_role, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        create_staff_account(
            tenant=tenant, created_by=director_user, email="liste@ecole-test-sv1.gn",
            first_name="E", last_name="F", role_name="TEACHER", type_contrat="CDD",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-list"))
        assert resp.status_code == 200
        results = resp.json()["data"]["results"]
        match = next(r for r in results if r["email"] == "liste@ecole-test-sv1.gn")
        assert match["type_contrat"] == "CDD"

    def test_patch_updates_only_profile_fields(self, api_client, tenant, director_user, director_role, teacher_role):
        """PATCH avec uniquement des champs RH ne doit jamais toucher User."""
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="patch-rh@ecole-test-sv1.gn",
            first_name="G", last_name="H", role_name="TEACHER",
        )
        original_first_name = user.first_name
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]),
            {"numero_cnss": "CNSS-999", "statut": "EN_CONGE"},
            format="json",
        )
        assert resp.status_code == 200, resp.json()
        assert resp.json()["data"]["numero_cnss"] == "CNSS-999"
        assert resp.json()["data"]["statut"] == "EN_CONGE"

        user.refresh_from_db()
        assert user.first_name == original_first_name  # inchangé

        profile = StaffProfile.objects.get(user=user)
        assert profile.numero_cnss == "CNSS-999"
        assert profile.statut == StaffProfile.Status.EN_CONGE

    def test_patch_updates_mixed_user_and_profile_fields(self, api_client, tenant, director_user, director_role, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="patch-mixte@ecole-test-sv1.gn",
            first_name="I", last_name="J", role_name="TEACHER",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]),
            {"first_name": "Nouveau Prénom", "type_contrat": "STAGE"},
            format="json",
        )
        assert resp.status_code == 200, resp.json()

        user.refresh_from_db()
        assert user.first_name == "Nouveau Prénom"
        assert StaffProfile.objects.get(user=user).type_contrat == "STAGE"

    def test_statut_change_does_not_affect_is_active(self, api_client, tenant, director_user, director_role, teacher_role):
        """Décision PO : statut (RH) et is_active (accès) sont indépendants."""
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="independance@ecole-test-sv1.gn",
            first_name="K", last_name="L", role_name="TEACHER",
        )
        assert user.is_active is True
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]),
            {"statut": "PARTI"},
            format="json",
        )
        assert resp.status_code == 200

        user.refresh_from_db()
        assert user.is_active is True  # jamais touché par le changement de statut
        assert StaffProfile.objects.get(user=user).statut == StaffProfile.Status.PARTI

    def test_disable_does_not_affect_statut(self, api_client, tenant, director_user, director_role, teacher_role):
        """Réciproque : désactiver l'accès ne change jamais le statut RH."""
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="disable-rh@ecole-test-sv1.gn",
            first_name="M", last_name="N", role_name="TEACHER",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(reverse("staff-disable", args=[str(user.id)]))
        assert resp.status_code == 200

        profile = StaffProfile.objects.get(user=user)
        assert profile.statut == StaffProfile.Status.ACTIF  # inchangé

    def test_detail_without_profile_falls_back_gracefully(self, api_client, tenant, director_user, director_role, teacher_role):
        """
        Défensif : un User créé directement (hors create_staff_account, donc
        sans StaffProfile) ne doit jamais faire planter la sérialisation —
        ne devrait plus arriver en pratique après le backfill, mais
        StaffProfileMixin doit rester tolérant.
        """
        user = User.objects.create_user(
            username="sans-profil", email="sans-profil@ecole-test-sv1.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="O", last_name="P",
        )
        assert not StaffProfile.objects.filter(user=user).exists()

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-detail", args=[str(user.id)]))
        assert resp.status_code == 200
        assert resp.json()["data"]["statut"] == "ACTIF"
        assert resp.json()["data"]["date_naissance"] is None

    def test_patch_creates_profile_if_missing(self, api_client, tenant, director_user, director_role, teacher_role):
        """PATCH sur un compte sans profil (cas défensif) crée le profil à la volée."""
        user = User.objects.create_user(
            username="sans-profil2", email="sans-profil2@ecole-test-sv1.gn", password="P@ss123!",
            role=teacher_role, tenant=tenant, first_name="Q", last_name="R",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]),
            {"numero_cnss": "CNSS-777"},
            format="json",
        )
        assert resp.status_code == 200
        assert StaffProfile.objects.get(user=user).numero_cnss == "CNSS-777"

    def test_filter_by_statut(self, api_client, tenant, director_user, director_role, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        u1, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="filtre1@ecole-test-sv1.gn",
            first_name="S", last_name="T", role_name="TEACHER",
        )
        u2, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="filtre2@ecole-test-sv1.gn",
            first_name="U", last_name="V", role_name="TEACHER",
        )
        StaffProfile.objects.filter(user=u2).update(statut=StaffProfile.Status.PARTI)

        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.get(reverse("staff-list"), {"staff_profile__statut": "PARTI"})
        assert resp.status_code == 200
        emails = [r["email"] for r in resp.json()["data"]["results"]]
        assert "filtre2@ecole-test-sv1.gn" in emails
        assert "filtre1@ecole-test-sv1.gn" not in emails


# ─── Régression : phone vide (bug trouvé en marge, pas STAFF-V2-01) ──────────

@pytest.mark.django_db
class TestPhoneBlankRegression:
    """
    CreateStaffForm.tsx envoie toujours `phone: ""` (jamais omis) quand le
    champ est laissé vide côté formulaire — pré-existant, découvert en
    vérifiant STAFF-V2-01 en navigateur. `CharField(required=False)` sans
    `allow_blank=True` rejette quand même une chaîne vide explicitement
    fournie (`required=False` ne dispense que de la clé absente, pas d'une
    valeur vide fournie) : toute création de staff sans numéro de téléphone
    échouait en 400 depuis STAFF-MVP-02, silencieusement (jamais couvert par
    un test — tous les tests existants fournissent un `phone`).
    """

    def test_create_with_explicit_blank_phone_succeeds(self, api_client, tenant, director_user, director_role, teacher_role):
        """
        Reproduit exactement ce qu'envoie CreateStaffForm.tsx : `phone: ""`
        explicite (jamais omis) — `required=False` seul ne suffit pas, il
        faut aussi `allow_blank=True` pour accepter une chaîne vide fournie.
        """
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.post(
            reverse("staff-list"),
            {"email": "sans-tel@ecole-test-sv1.gn", "first_name": "W", "last_name": "X",
             "role": "TEACHER", "phone": ""},
            format="json",
        )
        assert resp.status_code == 201, resp.json()
        assert resp.json()["data"]["phone"] == ""

    def test_patch_clears_phone_to_blank(self, api_client, tenant, director_user, director_role, teacher_role):
        from apps.authentication.services.staff_service import create_staff_account

        user, _ = create_staff_account(
            tenant=tenant, created_by=director_user, email="clear-tel@ecole-test-sv1.gn",
            first_name="Y", last_name="Z", role_name="TEACHER", phone="+224620000077",
        )
        _ensure_director_permissions(director_role)
        _auth(api_client, director_user)

        resp = api_client.patch(
            reverse("staff-detail", args=[str(user.id)]), {"phone": ""}, format="json",
        )
        assert resp.status_code == 200, resp.json()
        user.refresh_from_db()
        assert user.phone == ""
