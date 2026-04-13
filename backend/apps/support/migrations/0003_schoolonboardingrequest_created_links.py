# Generated manually to align DB schema with SchoolOnboardingRequest model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0002_update_tenant_type_choices"),
        ("support", "0002_schoolonboardingrequest"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="schoolonboardingrequest",
            name="created_admin_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="onboarding_created_accounts",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="schoolonboardingrequest",
            name="created_tenant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="onboarding_requests",
                to="superadmin.tenant",
            ),
        ),
    ]
