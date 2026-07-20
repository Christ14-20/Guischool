"""
apps/pedagogy/tasks.py

Tâches Celery asynchrones pour le module pédagogie.
"""

from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="apps.pedagogy.tasks.send_enrollment_confirmation_sms")
def send_enrollment_confirmation_sms(student_id: str, guardian_phone: str):
    """
    STUB Épic 8 — Confirmation d'inscription par SMS au responsable.

    L'intégration SMS réelle (Africa's Talking) est livrée à l'Épic 8 (COMM-MVP-01).
    Ici on se contente de journaliser l'intention d'envoi, de façon asynchrone et
    non bloquante pour la réponse 201, sur le même modèle que
    send_tenant_status_notification (TENANT-04).
    """
    logger.info(
        "STUB SMS inscription — élève %s, destinataire %s "
        "(intégration réelle à l'Épic 8)",
        student_id,
        guardian_phone,
    )


@shared_task(name="apps.pedagogy.tasks.send_absence_notification_sms")
def send_absence_notification_sms(student_id: str, guardian_phone: str):
    """
    STUB Épic 8 — Notification d'absence par SMS au responsable.

    Déclenchée depuis la saisie de présence (ATT-01) pour chaque élève marqué
    ABSENT ayant un responsable joignable. L'envoi réel (Africa's Talking) est
    livré à l'Épic 8 ; ici on journalise seulement l'intention.
    """
    logger.info(
        "STUB SMS absence — élève %s, destinataire %s "
        "(intégration réelle à l'Épic 8)",
        student_id,
        guardian_phone,
    )


@shared_task(name="apps.pedagogy.tasks.lock_stale_attendances")
def lock_stale_attendances():
    """
    Verrouille automatiquement les présences créées il y a plus de 24 heures.

    Tâche périodique (Celery Beat / DatabaseScheduler) : une fois verrouillée
    (is_locked=True), une présence ne peut plus être corrigée via l'API ; seul
    un administrateur peut la déverrouiller depuis le Django Admin (limite V1).
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.pedagogy.models import Attendance

    cutoff = timezone.now() - timedelta(hours=24)
    locked_count = Attendance.objects.filter(
        is_locked=False, created_at__lt=cutoff
    ).update(is_locked=True)

    logger.info("lock_stale_attendances — %s présence(s) verrouillée(s)", locked_count)
    return locked_count
