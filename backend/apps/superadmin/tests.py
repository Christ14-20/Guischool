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
