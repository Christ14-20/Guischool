"""
Migration 0007 — FIN-MVP-04

Crée la tâche Celery Beat périodique pour marquer les factures en retard
(quotidiennement à minuit).

Calque la pattern de lock_stale_attendances (pedagogy/migrations/0013).
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
        name="flag_overdue_invoices",
        defaults={
            "task": "apps.finance.tasks.flag_overdue_invoices",
            "interval": schedule,
            "enabled": True,
            "description": (
                "Marquage quotidien des factures en retard "
                "(due_date < aujourd'hui et balance > 0 → OVERDUE)."
            ),
        },
    )


def remove_periodic_task(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="flag_overdue_invoices",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0006_add_invoice_and_due_date"),
        ("django_celery_beat", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_periodic_task, remove_periodic_task),
    ]
