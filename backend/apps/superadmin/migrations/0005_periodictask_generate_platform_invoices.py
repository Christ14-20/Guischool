"""
Migration 0005 — SUPERADMIN-V2-05

Crée la tâche Celery Beat périodique pour la génération des factures
d'abonnement SaaS (école → Eduguinée).

Calque la pattern de flag_overdue_invoices (apps/finance/migrations/0007).
"""

from django.db import migrations


def add_periodic_task(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=24,
        period="hours",
    )
    PeriodicTask.objects.get_or_create(
        name="generate_platform_invoices",
        defaults={
            "task": "apps.superadmin.tasks.generate_platform_invoices",
            "interval": schedule,
            "enabled": True,
            "description": (
                "Génération quotidienne des factures d'abonnement SaaS "
                "(école → Eduguinée) pour les tenants ACTIVE/SUSPENDED_SOFT/"
                "SUSPENDED_HARD dont la prochaine période est entamée."
            ),
        },
    )


def remove_periodic_task(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="generate_platform_invoices",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0004_platform_invoice"),
        ("django_celery_beat", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_periodic_task, remove_periodic_task),
    ]
