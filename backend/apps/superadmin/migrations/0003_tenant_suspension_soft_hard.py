from django.db import migrations, models


def forwards_remap_suspended(apps, schema_editor):
    """
    SUPERADMIN-V2-01 : les tenants déjà SUSPENDED (dev/staging) sont remappés
    vers SUSPENDED_HARD — le comportement le plus proche de ce qu'ils vivaient
    déjà (connexion entièrement bloquée), donc ce remap ne change rien à leur
    expérience réelle au moment du déploiement.
    """
    Tenant = apps.get_model("superadmin", "Tenant")
    Tenant.objects.filter(status="SUSPENDED").update(status="SUSPENDED_HARD")


def backwards_remap_suspended(apps, schema_editor):
    Tenant = apps.get_model("superadmin", "Tenant")
    Tenant.objects.filter(status__in=["SUSPENDED_SOFT", "SUSPENDED_HARD"]).update(
        status="SUSPENDED"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0002_tenant_complete"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tenant",
            name="status",
            field=models.CharField(
                choices=[
                    ("TRIAL", "Essai"),
                    ("ACTIVE", "Active"),
                    ("SUSPENDED_SOFT", "Suspendue (lecture seule)"),
                    ("SUSPENDED_HARD", "Suspendue (blocage total)"),
                    ("CANCELLED", "Résiliée"),
                ],
                db_index=True,
                default="TRIAL",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards_remap_suspended, backwards_remap_suspended),
    ]
