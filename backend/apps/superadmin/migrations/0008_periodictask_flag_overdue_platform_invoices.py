"""
Migration 0008 — SUPERADMIN-V2-04

Crée la tâche Celery Beat périodique pour la détection des factures
d'abonnement SaaS en retard et l'escalade des tenants impayés.

Calque la pattern de generate_platform_invoices (apps/superadmin/migrations/0005).
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
        name="flag_overdue_platform_invoices",
        defaults={
            "task": "apps.superadmin.tasks.flag_overdue_platform_invoices",
            "interval": schedule,
            "enabled": True,
            "description": (
                "Détection quotidienne des factures d'abonnement SaaS en retard "
                "(PENDING -> OVERDUE) et escalade/relance des tenants impayés "
                "(paliers J+1/J+7/J+15/J+30)."
            ),
        },
    )


def remove_periodic_task(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="flag_overdue_platform_invoices",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0007_platforminvoice_reminder_stage"),
        ("django_celery_beat", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_periodic_task, remove_periodic_task),
    ]
