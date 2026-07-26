"""
Migration 0005 — FIN-MVP-03

Crée la tâche Celery Beat périodique pour la réconciliation nocturne
des transactions Orange Money (toutes les 24h).

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
        name="reconcile_orange_money_transactions",
        defaults={
            "task": "apps.finance.tasks.reconcile_orange_money_transactions",
            "interval": schedule,
            "enabled": True,
            "description": (
                "Réconciliation nocturne des transactions Orange Money "
                "(INITIATED > 24h → check_status via provider)."
            ),
        },
    )


def remove_periodic_task(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="reconcile_orange_money_transactions",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0004_add_orange_money_transaction"),
        ("django_celery_beat", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_periodic_task, remove_periodic_task),
    ]
