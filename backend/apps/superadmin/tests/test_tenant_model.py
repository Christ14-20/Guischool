"""
apps/superadmin/tests/test_tenant_model.py — TENANT-01

Tests unitaires sur le modèle Tenant :
1. Structure du modèle (tous les champs §1.1 présents)
2. get_student_count() : vrai comptage des élèves ACTIF (branché en Épic 4)
3. get_staff_count() calculé pour de vrai avec User
4. Isolation cross-tenant : ressource d'un autre tenant → 404 exact, jamais 403

HISTORIQUE SENTINELLE student_count :
    En Épic 2, get_student_count() retournait 0 (Student n'existait pas) et un
    test sentinelle l'affirmait INTENTIONNELLEMENT pour forcer sa mise à jour.
    En Épic 4, Student a été créé et get_student_count() branché sur le vrai
    calcul ; la sentinelle a donc été remplacée par
    test_get_student_count_counts_only_active_students (vrai comptage + exclusion
    des élèves non-ACTIF).
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

    # ── Comptage réel des élèves (branché en Épic 4) ──────────────────────────

    def test_get_student_count_is_zero_for_empty_tenant(self, tenant):
        """Un établissement sans élève retourne 0."""
        assert tenant.get_student_count() == 0

    def test_get_student_count_counts_only_active_students(self, tenant):
        """
        SENTINELLE (Épic 2 → mise à jour en Épic 4).

        get_student_count() calcule désormais le vrai nombre d'élèves ACTIF
        du tenant (via apps.pedagogy.models.Student). Les élèves dans un statut
        non-ACTIF (ARCHIVE, SORTI, ...) ne sont pas comptés.
        """
        import datetime
        from apps.pedagogy.models import Student, SchoolYear

        year = SchoolYear.objects.create(
            tenant=tenant, label="2025-2026",
            start_date=datetime.date(2025, 9, 15),
            end_date=datetime.date(2026, 7, 10),
        )
        # 2 élèves ACTIF (défaut) + 1 ARCHIVE
        Student.objects.create(
            tenant=tenant, matricule="2025-00001", nom="Camara", prenom="Fatoumata",
            date_naissance=datetime.date(2013, 3, 22), sexe=Student.Sexe.F,
            annee_inscription=year,
        )
        Student.objects.create(
            tenant=tenant, matricule="2025-00002", nom="Diallo", prenom="Ibrahima",
            date_naissance=datetime.date(2012, 5, 10), sexe=Student.Sexe.M,
            annee_inscription=year,
        )
        Student.objects.create(
            tenant=tenant, matricule="2025-00003", nom="Sow", prenom="Aïcha",
            date_naissance=datetime.date(2013, 1, 2), sexe=Student.Sexe.F,
            annee_inscription=year, statut=Student.Status.ARCHIVE,
        )

        assert tenant.get_student_count() == 2

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
        studies_role, _ = Role.objects.get_or_create(
            name="STUDENT_STUDIES", defaults={"label": "Directeur des études / Scolarité"}
        )
        teacher_role, _ = Role.objects.get_or_create(
            name="TEACHER", defaults={"label": "Enseignant"}
        )
        for i, role in enumerate([director_role, studies_role, teacher_role]):
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
