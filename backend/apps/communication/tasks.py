"""
apps/communication/tasks.py — COMM-MVP-01

Tâche Celery asynchrone d'envoi SMS.

Utilise retry_with_backoff depuis core/retry.py pour les tentatives
internes (3 max). En cas d'échec définitif, une seule entrée SMSLog
FAILED est créée — pas de relance de la tâche Celery entière (cela
se cumulerait avec le retry interne et multiplierait les tentatives).
"""

import logging

from celery import shared_task

from core.retry import retry_with_backoff, ProviderNetworkError

logger = logging.getLogger(__name__)


@shared_task(name="apps.communication.tasks.send_sms")
def send_sms(recipient_phone: str, message: str, trigger_type: str,
             guardian_id: str | None = None, tenant_id: str | None = None):
    """
    Envoie un SMS de façon asynchrone avec retry_with_backoff.

    retry_with_backoff tente jusqu'à 3 appels au provider (backoff 2s, 4s).
    Si tous échouent, une seule entrée SMSLog FAILED est créée.
    Si le throttling quotidien (3 SMS/jour par phone) est dépassé,
    la tâche log un avertissement et s'arrête sans envoyer.
    """
    from django.utils import timezone
    from .models import SMSLog

    # ── Throttling : max 3 SMS/jour par recipient_phone ────────────────
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_count = SMSLog.objects.filter(
        recipient_phone=recipient_phone,
        sent_at__gte=today_start,
        status=SMSLog.Status.SENT,
    ).count()

    if daily_count >= 3:
        logger.warning(
            "Throttling SMS — %s a déjà reçu 3 SMS aujourd'hui, envoi annulé.",
            recipient_phone,
        )
        return {"status": "SKIPPED", "reason": "daily_limit_reached"}

    # ── Envoi via provider ─────────────────────────────────────────────
    from .providers.africastalking import AfricaSMSProvider

    provider = AfricaSMSProvider()

    def _do_send():
        return provider.send(recipient_phone, message)

    try:
        result = retry_with_backoff(_do_send, max_attempts=3, base_delay=2)
    except ProviderNetworkError as e:
        logger.error("Envoi SMS définitivement échoué vers %s: %s", recipient_phone, e)
        SMSLog.objects.create(
            tenant_id=tenant_id,
            recipient_phone=recipient_phone,
            content=message,
            trigger_type=trigger_type,
            status=SMSLog.Status.FAILED,
            failure_reason=str(e),
        )
        return {"status": "FAILED", "failure_reason": str(e)}

    # ── Enregistrement du log ──────────────────────────────────────────
    provider_id = result.get("provider_message_id", "")
    sms_status = SMSLog.Status.SENT if result.get("status") == "SENT" else SMSLog.Status.FAILED

    SMSLog.objects.create(
        tenant_id=tenant_id,
        recipient_phone=recipient_phone,
        content=message,
        trigger_type=trigger_type,
        status=sms_status,
        provider_message_id=provider_id,
        guardian_id=guardian_id,
        failure_reason="" if sms_status == SMSLog.Status.SENT else result.get("status", ""),
    )

    logger.info("SMS %s — %s → %s (%s)", sms_status, recipient_phone, message[:50], provider_id)
    return {"status": sms_status, "provider_message_id": provider_id}
