from django.test import TestCase
from apps.superadmin.models import Tenant, Plan, Campus
from apps.authentication.models import User, Role
from apps.authentication.services.auth_service import get_tokens_for_user, _get_user_campus_id


class CampusIsolationTestCase(TestCase):
    def setUp(self):
        # Setup plan
        self.plan = Plan.objects.create(
            name="STARTER",
            max_students=100,
            max_staff=10,
            modules_activated=["pedagogy"],
            storage_max_gb=5
        )
        # Setup tenant (school)
        self.tenant = Tenant.objects.create(
            name="Ecole Test",
            plan=self.plan,
            status="ACTIVE"
        )
        # Setup role
        self.role = Role.objects.create(
            name="ADMIN_SCHOOL",
            description="Administrateur Ecole"
        )
        # Setup user
        self.user = User.objects.create_user(
            email="admin@test.com",
            password="testpassword123",
            tenant=self.tenant,
            role=self.role,
            first_name="Admin",
            last_name="User"
        )

    def test_campus_creation_and_isolation(self):
        # 1. Verify initially no campuses
        self.assertEqual(Campus.objects.filter(tenant=self.tenant).count(), 0)

        # 2. Create campus 1 (principal)
        campus1 = Campus.objects.create(
            tenant=self.tenant,
            name="Campus Centre",
            is_main=True,
            is_active=True
        )

        # 3. Create campus 2 (secondaire)
        campus2 = Campus.objects.create(
            tenant=self.tenant,
            name="Campus Nord",
            is_main=False,
            is_active=True
        )

        # Verify campuses are under tenant
        campuses = Campus.objects.filter(tenant=self.tenant)
        self.assertEqual(campuses.count(), 2)
        self.assertTrue(campuses.filter(is_main=True).exists())

        # Verify campus_id helper picks principal campus
        self.assertEqual(_get_user_campus_id(self.user), str(campus1.id))

        # Verify JWT claims
        tokens = get_tokens_for_user(self.user)
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh_token = RefreshToken(tokens["refresh"])
        self.assertEqual(refresh_token.payload.get("campus_id"), str(campus1.id))
        self.assertEqual(refresh_token.payload.get("tenant_id"), str(self.tenant.id))


from rest_framework.test import APIClient
from apps.superadmin.models import TenantNetwork
from apps.pedagogy.models import SchoolYear, Level, Class, Student, YearEndDecision
from apps.finance.models import FeeCategory, StudentFee, Payment


class NetworkConsolidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Plans & Tenants
        self.plan = Plan.objects.create(
            name="PRO",
            max_students=1000,
            max_staff=100,
            modules_activated=["pedagogy", "finance"],
            storage_max_gb=50
        )
        
        # Create Network Admin role
        self.net_admin_role = Role.objects.create(
            name="NETWORK_ADMIN",
            description="Administrateur Réseau"
        )
        
        # Create Network Admin User
        self.network_admin = User.objects.create_user(
            email="network@test.com",
            password="networkpassword123",
            role=self.net_admin_role,
            first_name="Network",
            last_name="Admin"
        )
        
        # Create Network
        self.network = TenantNetwork.objects.create(
            name="Réseau Excellence",
            description="Chaîne d'écoles privées d'excellence",
            admin_network=self.network_admin
        )
        
        # Create Tenants in the Network
        self.school_a = Tenant.objects.create(
            name="École A",
            plan=self.plan,
            status="ACTIVE",
            network=self.network
        )
        self.school_b = Tenant.objects.create(
            name="École B",
            plan=self.plan,
            status="ACTIVE",
            network=self.network
        )
        
        # Create an isolated school (not in the network)
        self.isolated_school = Tenant.objects.create(
            name="École Isolée",
            plan=self.plan,
            status="ACTIVE"
        )
        
        # Create School Year
        self.school_year = SchoolYear.objects.create(
            label="2025-2026",
            start_date="2025-09-01",
            end_date="2026-06-30",
            is_active=True
        )

    def test_network_dashboard_aggregation(self):
        # 1. Create students
        # School A: 2 active students
        student_a1 = Student.objects.create(
            tenant=self.school_a,
            matricule="MAT-A1",
            nom="Diallo",
            prenom="Mamadou",
            date_naissance="2015-05-10",
            sexe="M",
            tuteur_nom="Diallo Père",
            tuteur_telephone="+224622111111",
            annee_inscription=self.school_year,
            created_by=self.network_admin,
            statut="ACTIF"
        )
        student_a2 = Student.objects.create(
            tenant=self.school_a,
            matricule="MAT-A2",
            nom="Barry",
            prenom="Aissatou",
            date_naissance="2016-08-15",
            sexe="F",
            tuteur_nom="Barry Père",
            tuteur_telephone="+224622111112",
            annee_inscription=self.school_year,
            created_by=self.network_admin,
            statut="ACTIF"
        )
        
        # School B: 1 student (ACTIF), 1 suspended (SUSPENDU)
        student_b1 = Student.objects.create(
            tenant=self.school_b,
            matricule="MAT-B1",
            nom="Camara",
            prenom="Ousmane",
            date_naissance="2014-03-20",
            sexe="M",
            tuteur_nom="Camara Père",
            tuteur_telephone="+224622111113",
            annee_inscription=self.school_year,
            created_by=self.network_admin,
            statut="ACTIF"
        )
        student_b2 = Student.objects.create(
            tenant=self.school_b,
            matricule="MAT-B2",
            nom="Sow",
            prenom="Fatoumata",
            date_naissance="2015-11-12",
            sexe="F",
            tuteur_nom="Sow Père",
            tuteur_telephone="+224622111114",
            annee_inscription=self.school_year,
            created_by=self.network_admin,
            statut="SUSPENDU"
        )
        
        # Isolated school: 1 student
        isolated_student = Student.objects.create(
            tenant=self.isolated_school,
            matricule="MAT-IS",
            nom="Sylla",
            prenom="Aboubacar",
            date_naissance="2015-01-01",
            sexe="M",
            tuteur_nom="Sylla Père",
            tuteur_telephone="+224622111115",
            annee_inscription=self.school_year,
            created_by=self.network_admin,
            statut="ACTIF"
        )
        
        # 2. Create financial payments
        # School A: 2 payments of 500,000 GNF (Completed)
        fee_cat_a = FeeCategory.objects.create(tenant=self.school_a, name="Frais Scolarité", type="TUITION", amount=2000000)
        fee_stud_a = StudentFee.objects.create(tenant=self.school_a, student=student_a1, fee_category=fee_cat_a, total_amount=2000000, balance_due=1500000)
        Payment.objects.create(
            tenant=self.school_a, student=student_a1, student_fee=fee_stud_a,
            amount=500000, payment_date="2025-10-01", method="CASH",
            received_by=self.network_admin, status="COMPLETED", receipt_number="R-A1"
        )
        Payment.objects.create(
            tenant=self.school_a, student=student_a2, student_fee=fee_stud_a,
            amount=500000, payment_date="2025-10-01", method="ORANGE_MONEY",
            received_by=self.network_admin, status="COMPLETED", receipt_number="R-A2"
        )
        
        # School B: 1 completed payment of 800,000 GNF, 1 failed payment of 300,000 GNF
        fee_cat_b = FeeCategory.objects.create(tenant=self.school_b, name="Frais Scolarité", type="TUITION", amount=2000000)
        fee_stud_b = StudentFee.objects.create(tenant=self.school_b, student=student_b1, fee_category=fee_cat_b, total_amount=2000000, balance_due=1200000)
        Payment.objects.create(
            tenant=self.school_b, student=student_b1, student_fee=fee_stud_b,
            amount=800000, payment_date="2025-10-02", method="WAVE",
            received_by=self.network_admin, status="COMPLETED", receipt_number="R-B1"
        )
        Payment.objects.create(
            tenant=self.school_b, student=student_b2, student_fee=fee_stud_b,
            amount=300000, payment_date="2025-10-02", method="WAVE",
            received_by=self.network_admin, status="FAILED", receipt_number="R-B2"
        )
        
        # Isolated school: 1 completed payment of 1,000,000 GNF
        fee_cat_is = FeeCategory.objects.create(tenant=self.isolated_school, name="Frais Scolarité", type="TUITION", amount=2000000)
        fee_stud_is = StudentFee.objects.create(tenant=self.isolated_school, student=isolated_student, fee_category=fee_cat_is, total_amount=2000000, balance_due=1000000)
        Payment.objects.create(
            tenant=self.isolated_school, student=isolated_student, student_fee=fee_stud_is,
            amount=1000000, payment_date="2025-10-02", method="CASH",
            received_by=self.network_admin, status="COMPLETED", receipt_number="R-IS"
        )

        # 3. Create levels and classes for decisions
        level_a = Level.objects.create(tenant=self.school_a, name="7ème Année", cycle="COLLEGE")
        class_a = Class.objects.create(tenant=self.school_a, level=level_a, name="7ème A")
        level_b = Level.objects.create(tenant=self.school_b, name="8ème Année", cycle="COLLEGE")
        class_b = Class.objects.create(tenant=self.school_b, level=level_b, name="8ème B")
        
        # 4. Create Year End Decisions
        # School A: 1 admitted (ADMIS), 1 redoublant (REDOUBLE) -> 50%
        YearEndDecision.objects.create(
            eleve=student_a1, annee_scolaire=self.school_year,
            classe_origine=class_a, decision="ADMIS",
            prise_par=self.network_admin
        )
        YearEndDecision.objects.create(
            eleve=student_a2, annee_scolaire=self.school_year,
            classe_origine=class_a, decision="REDOUBLE",
            prise_par=self.network_admin
        )
        
        # School B: 1 admitted (ADMIS) -> 100%
        # Total network success rate: 2 ADMIS out of 3 decisions -> 66.67%
        YearEndDecision.objects.create(
            eleve=student_b1, annee_scolaire=self.school_year,
            classe_origine=class_b, decision="ADMIS",
            prise_par=self.network_admin
        )

        # 5. Query the API under Network Admin
        self.client.force_authenticate(user=self.network_admin)
        response = self.client.get("/api/v1/network/dashboard/")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        
        # Assertions
        # Total network students: 4 (2 in school A, 2 in school B)
        self.assertEqual(data["kpis"]["total_students"], 4)
        # Active network students: 3 (2 in school A, 1 in school B)
        self.assertEqual(data["kpis"]["active_students"], 3)
        # Consolidate revenue: 500k + 500k + 800k = 1,800,000 (failed and isolated are not counted)
        self.assertEqual(data["kpis"]["revenue_total_gnf"], 1800000.0)
        # Consolidate success rate: 2 admis / 3 decisions = 66.67%
        self.assertEqual(data["kpis"]["success_rate_percent"], 66.67)
        # Total network schools: 2
        self.assertEqual(data["schools_count"], 2)

        # Test list schools
        schools_response = self.client.get("/api/v1/network/schools/")
        self.assertEqual(schools_response.status_code, 200)
        schools_data = schools_response.json()["data"]
        self.assertEqual(len(schools_data), 2)
        school_names = [s["name"] for s in schools_data]
        self.assertIn("École A", school_names)
        self.assertIn("École B", school_names)
        self.assertNotIn("École Isolée", school_names)

