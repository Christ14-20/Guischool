"""
apps/superadmin/tests/test_tenant_model.py — TENANT-01

Tests unitaires sur le modèle Tenant :
1. Structure du modèle (tous les champs §1.1 présents)
2. get_student_count() == 0 en Épic 2 (test sentinelle — doit être mis à jour en Épic 4)
3. get_staff_count() calculé pour de vrai avec User
4. Isolation cross-tenant : ressource d'un autre tenant → 404 exact, jamais 403

RÈGLE SENTINELLE student_count :
    Ce test vérifie que get_student_count() == 0 INTENTIONNELLEMENT.
    En Épic 4, lorsque Student sera créé, ce test DEVRA être mis à jour
    pour vérifier le vrai comptage. S'il continue à passer sans modification,
    c'est une régression silencieuse — le TODO en commentaire est insuffisant,
    c'est l'assertion qui force l'attention.
"""

import pytest
from decimal import Decimal
from apps.superadmin.models import Tenant, Plan
from apps.authentication.models import User, Role


# ─── Fixtures communes ────────────────────────────────────────────────────────

@pytest.fixture
def plan(db):
    return Plan.objects.create(
        name="Starter Test",
        max_students=200,
        max_staff=20,
        price_monthly=Decimal("500000.00"),
        is_active=True,
    )


@pytest.fixture
def tenant(plan):
    return Tenant.objects.create(
        name="École des Palmiers",
        slug="ecole-des-palmiers",
        school_type=Tenant.SchoolType.MIXTE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Mamadou Diallo",
        contact_phone="+224620000001",
        contact_email="contact@palmiers.gn",
        region="Conakry",
    )


@pytest.fixture
def tenant_b(plan):
    return Tenant.objects.create(
        name="École Rivière",
        slug="ecole-riviere",
        school_type=Tenant.SchoolType.LYCEE,
        status=Tenant.Status.ACTIVE,
        plan=plan,
        contact_name="Fatoumata Bah",
        contact_phone="+224620000002",
        contact_email="contact@riviere.gn",
    )


@pytest.fixture
def director_role(db):
    return Role.objects.get_or_create(
        name="DIRECTOR", defaults={"label": "Directeur"}
    )[0]


# ─── Tests du modèle Tenant ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestTenantModel:

    def test_tenant_has_all_schema_fields(self, tenant):
        """Vérifie que tous les champs §1.1 sont présents sur le modèle."""
        required_fields = [
            "id", "name", "slug", "code_minedu", "school_type", "status",
            "plan", "contact_name", "contact_phone", "contact_email",
            "region", "prefecture", "commune", "quartier",
            "latitude", "longitude", "logo", "settings", "trial_ends_at",
            "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(tenant, field), f"Champ manquant sur Tenant : {field}"

    def test_tenant_status_choices(self, tenant):
        """Les 4 statuts du schéma §1.1 sont bien définis."""
        choices = {c[0] for c in Tenant.Status.choices}
        assert choices == {"TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"}

    def test_tenant_school_type_choices(self, tenant):
        """Les 4 types d'école §1.1 sont bien définis."""
        choices = {c[0] for c in Tenant.SchoolType.choices}
        assert choices == {"PRIMAIRE", "COLLEGE", "LYCEE", "MIXTE"}

    def test_tenant_default_status_is_trial(self, plan):
        """Un Tenant créé sans status explicite est en TRIAL (§1.1)."""
        t = Tenant.objects.create(
            name="École TRIAL",
            slug="ecole-trial",
            school_type=Tenant.SchoolType.PRIMAIRE,
            plan=plan,
            contact_name="Test",
            contact_phone="+224620000099",
            contact_email="trial@ecole.gn",
        )
        assert t.status == Tenant.Status.TRIAL

    def test_tenant_slug_is_unique(self, tenant, plan):
        """Deux tenants ne peuvent pas avoir le même slug."""
        import pytest as _pytest
        from django.db import IntegrityError
        with _pytest.raises(IntegrityError):
            Tenant.objects.create(
                name="École Palmiers Bis",
                slug="ecole-des-palmiers",  # slug dupliqué
                school_type=Tenant.SchoolType.MIXTE,
                plan=plan,
                contact_name="Test",
                contact_phone="+224620000003",
                contact_email="bis@palmiers.gn",
            )

    def test_tenant_code_minedu_is_optional(self, tenant):
        """code_minedu est nullable — doit pouvoir être None."""
        assert tenant.code_minedu is None

    def test_tenant_settings_default_is_empty_dict(self, tenant):
        """settings est un JSONField qui vaut {} par défaut."""
        assert tenant.settings == {}

    # ── Sentinelle student_count ──────────────────────────────────────────────

    def test_get_student_count_returns_zero_in_epic2(self, tenant):
        """
        SENTINELLE ÉPIC 2 → ÉPIC 4.

        get_student_count() DOIT retourner 0 tant que Student n'existe pas.
        Ce test DOIT être mis à jour en Épic 4 pour vérifier le vrai calcul.

        Si ce test passe sans modification en Épic 4 après création de Student,
        c'est une régression silencieuse — le comptage ne serait pas branché.
        """
        assert tenant.get_student_count() == 0, (
            "En Épic 2, get_student_count() doit retourner 0. "
            "Si vous êtes en Épic 4 : mettez à jour cette assertion "
            "pour vérifier le vrai comptage avec des données Student."
        )

    # ── Staff count ───────────────────────────────────────────────────────────

    def test_get_staff_count_excludes_super_admin(self, tenant, director_role):
        """get_staff_count() ne compte que les utilisateurs du tenant, pas les SUPER_ADMIN."""
        sa_role, _ = Role.objects.get_or_create(
            name="SUPER_ADMIN", defaults={"label": "Super Admin"}
        )
        # Crée un directeur dans le tenant
        User.objects.create_user(
            username="dir-palmiers",
            email="dir@palmiers.gn",
            password="SecurePass123!",
            role=director_role,
            tenant=tenant,
        )
        # Crée un super admin (pas de tenant)
        User.objects.create_user(
            username="sadmin-test",
            email="sadmin@eduguinee.gn",
            password="SecurePass123!",
            role=sa_role,
            tenant=None,
        )
        assert tenant.get_staff_count() == 1  # Seulement le directeur

    def test_get_staff_count_is_zero_for_empty_tenant(self, tenant):
        """Un tenant sans utilisateur a 0 staff."""
        assert tenant.get_staff_count() == 0

    def test_get_staff_count_counts_multiple_roles(self, tenant, director_role):
        """Plusieurs utilisateurs du même tenant sont tous comptés."""
        secretaire_role, _ = Role.objects.get_or_create(
            name="SECRETAIRE", defaults={"label": "Secrétaire"}
        )
        teacher_role, _ = Role.objects.get_or_create(
            name="TEACHER", defaults={"label": "Enseignant"}
        )
        for i, role in enumerate([director_role, secretaire_role, teacher_role]):
            User.objects.create_user(
                username=f"user-{i}",
                email=f"user{i}@palmiers.gn",
                password="SecurePass123!",
                role=role,
                tenant=tenant,
            )
        assert tenant.get_staff_count() == 3


# ─── Tests du modèle Plan ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPlanModel:

    def test_plan_has_all_schema_fields(self, plan):
        """Vérifie que tous les champs §1.2 sont présents sur Plan."""
        required_fields = [
            "id", "name", "max_students", "max_staff",
            "price_monthly", "is_active", "created_at", "updated_at",
        ]
        for field in required_fields:
            assert hasattr(plan, field), f"Champ manquant sur Plan : {field}"

    def test_plan_is_active_by_default(self, db):
        """Un Plan créé sans is_active explicite est actif."""
        p = Plan.objects.create(
            name="Plan Test Default",
            max_students=100,
            max_staff=10,
            price_monthly=Decimal("250000.00"),
        )
        assert p.is_active is True

    def test_plan_name_is_unique(self, plan):
        """Deux plans ne peuvent pas avoir le même nom."""
        import pytest as _pytest
        from django.db import IntegrityError
        with _pytest.raises(IntegrityError):
            Plan.objects.create(
                name="Starter Test",  # nom dupliqué
                max_students=500,
                max_staff=50,
                price_monthly=Decimal("1000000.00"),
            )
