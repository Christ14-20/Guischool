"""
apps/communication/views.py — COMM-MVP-01

Webhook de livraison Africa's Talking.

Reçoit les callbacks de statut de livraison (DELIVERED/FAILED) et met
à jour le SMSLog correspondant via provider_message_id.
"""

import json
import logging

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse

from .providers.africastalking import AfricaSMSProvider

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def africastalking_delivery_webhook(request):
    """
    POST /webhooks/africastalking/delivery/

    Callback de livraison Africa's Talking (DELIVERED/FAILED).

    Vérifie la signature HMAC (header X-AfricasTalking-Signature).
    Met à jour le SMSLog correspondant via provider_message_id.

    Retourne toujours 200 pour éviter les renvois de AT.
    """
    # Vérification signature
    signature = request.META.get("HTTP_X_AFRICASTALKING_SIGNATURE", "")
    body = request.body

    provider = AfricaSMSProvider()
    if not provider.verify_webhook(body, signature):
        logger.warning("Signature invalide sur webhook AT delivery")
        return JsonResponse({"status": "invalid_signature"}, status=401)

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        logger.error("Payload invalide sur webhook AT delivery")
        return JsonResponse({"status": "invalid_payload"}, status=400)

    # Le payload AT delivery a la forme :
    # {"id": "...", "status": "Success"/"Failed", "phoneNumber": "...", "messageId": "..."}
    from .models import SMSLog

    provider_message_id = data.get("messageId", "")
    delivery_status = data.get("status", "")

    if not provider_message_id:
        logger.warning("Webhook AT delivery sans messageId")
        return JsonResponse({"status": "missing_message_id"}, status=200)

    new_status = SMSLog.Status.DELIVERED if delivery_status == "Success" else SMSLog.Status.FAILED

    updated = SMSLog.objects.filter(
        provider_message_id=provider_message_id,
    ).update(
        status=new_status,
        failure_reason="" if new_status == SMSLog.Status.DELIVERED else f"AT delivery: {delivery_status}",
    )

    if updated:
        logger.info("SMSLog %s mis à jour → %s", provider_message_id, new_status)
    else:
        logger.warning("SMSLog %s introuvable pour mise à jour livraison", provider_message_id)

    return JsonResponse({"status": "ok"})
