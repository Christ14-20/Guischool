"""
apps/communication/providers/africastalking.py — COMM-MVP-01

Provider Africa's Talking pour l'envoi de SMS.

Mode mock (AFRICASTALKING_MOCK=true, valeur par défaut) :
  - Pas d'appel HTTP réel
  - Génère un provider_message_id factice au format AT-{UUID}
  - Simule un succès immédiat (SENT)

Mode réel (AFRICASTALKING_MOCK=false) :
  - Appelle l'API Africa's Talking (programming API)
  - HMAC-SHA256 signature pour le webhook de livraison

Architecture parallèle à OrangeMoneyProvider même si le pattern est
plus simple (un seul appel send(), pas d'initiate/check/verify).
"""

import hashlib
import hmac
import json
import logging
import uuid

from django.conf import settings

from core.retry import ProviderNetworkError

logger = logging.getLogger(__name__)


class AfricaSMSProvider:
    """
    Provider SMS Africa's Talking.

    Mode mock (AFRICASTALKING_MOCK=true, défaut) :
      - send() retourne immédiatement un provider_message_id factice
      - verify_webhook() vérifie la signature HMAC (identique mock/prod)
    """

    def __init__(self):
        self.mock = getattr(settings, "AFRICASTALKING_MOCK", True)
        raw_key = getattr(settings, "AFRICASTALKING_API_KEY", "")
        self.api_key = raw_key or "mock-api-key"
        self.username = getattr(settings, "AFRICASTALKING_USERNAME", "sandbox")
        raw_secret = getattr(settings, "AFRICASTALKING_WEBHOOK_SECRET", "")
        self.webhook_secret = raw_secret or "mock-webhook-secret"
        self.api_url = getattr(
            settings,
            "AFRICASTALKING_API_URL",
            "https://api.africastalking.com/version1/messaging",
        )

    def send(self, to: str, message: str) -> dict:
        """
        Envoie un SMS via Africa's Talking.

        Retourne un dict avec :
          - provider_message_id : str
          - status : "SENT" | "FAILED"

        En mode réel, lève ProviderNetworkError si l'appel API échoue
        (timeout, 5xx) pour permettre un retry_with_backoff.
        """
        provider_msg_id = f"AT-{uuid.uuid4().hex[:12].upper()}"

        if self.mock:
            logger.info(
                "MOCK AT send — to=%s, msg=%s, id=%s",
                to, message[:50], provider_msg_id,
            )
            return {
                "provider_message_id": provider_msg_id,
                "status": "SENT",
            }

        # ── Appel API réel ──────────────────────────────────────────────
        try:
            import requests
            payload = {
                "username": self.username,
                "to": to,
                "message": message,
                "from": "EDUGUINEE",
            }
            resp = requests.post(
                self.api_url,
                data=payload,
                headers={
                    "apiKey": self.api_key,
                    "Accept": "application/json",
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            responses = data.get("SMSMessageData", {}).get("Recipients", [])
            if responses:
                recipient = responses[0]
                return {
                    "provider_message_id": recipient.get("messageId", provider_msg_id),
                    "status": "SENT" if recipient.get("status") == "Success" else "FAILED",
                }
            return {"provider_message_id": provider_msg_id, "status": "SENT"}
        except requests.RequestException as e:
            logger.error("AT API send failed: %s", e)
            raise ProviderNetworkError(str(e)) from e

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Vérifie la signature HMAC du webhook de livraison entrant.

        Africa's Talking signe les callbacks de livraison avec HMAC-SHA256
        en utilisant le webhook token configuré dans le dashboard AT.
        """
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
