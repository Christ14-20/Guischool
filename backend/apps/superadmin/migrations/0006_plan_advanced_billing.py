# Generated manually for ARCH-04 advanced plans and billing

import decimal
from django.db import migrations, models


def copy_modules_to_modules_included(apps, schema_editor):
    Plan = apps.get_model("superadmin", "Plan")
    for plan in Plan.objects.all():
        if not plan.modules_included:
            plan.modules_included = plan.modules_activated or []
            plan.save(update_fields=["modules_included"])


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0005_tenant_advanced_settings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="plan",
            name="name",
            field=models.CharField(
                choices=[
                    ("TRIAL", "Trial"),
                    ("STARTER", "Starter"),
                    ("PRO", "Pro"),
                    ("PREMIUM", "Premium"),
                    ("ENTERPRISE", "Enterprise"),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="plan_type",
            field=models.CharField(
                choices=[
                    ("individual", "Individuel"),
                    ("standard", "Standard"),
                    ("network", "Réseau"),
                    ("ministry", "Ministère"),
                    ("international", "International"),
                ],
                default="standard",
                max_length=20,
                verbose_name="Type de plan",
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="max_campuses",
            field=models.PositiveIntegerField(
                default=1,
                help_text="0 = illimité.",
                verbose_name="Nombre maximal de campus",
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="modules_included",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Modules inclus dans le plan CDC ex: ['pedagogy','finance']",
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="price_per_student",
            field=models.DecimalField(
                decimal_places=2,
                default=decimal.Decimal("0"),
                max_digits=10,
                verbose_name="Prix par élève",
            ),
        ),
        migrations.RunPython(copy_modules_to_modules_included, migrations.RunPython.noop),
    ]
