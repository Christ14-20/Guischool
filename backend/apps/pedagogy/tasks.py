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
