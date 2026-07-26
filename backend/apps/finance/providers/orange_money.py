"""
apps/finance/providers/orange_money.py

Implémentation OrangeMoneyProvider.

⚠  HYPOTHÈSE MVP — ALGORITHME HMAC NON CONFIRMÉ
   En l'absence de documentation officielle de l'API Orange Money Guinée,
   l'algorithme, la clé et la méthode de sérialisation ci-dessous sont
   des hypothèses de travail à revalider dès l'obtention de l'accès à
   la documentation officielle.

   Hypothèses retenues pour le MVP :
     - Algorithme : HMAC-SHA256
     - Clé : variable d'environnement ORANGE_MONEY_SECRET
     - Sérialisation : corps JSON canonique (clés triées par ordre
       alphabétique, pas d'espacement superflu)
     - Endpoint d'initiation : configurable via ORANGE_MONEY_API_URL
     - En mode mock (ORANGE_MONEY_MOCK=true) : pas d'appel HTTP réel,
       génération d'un provider_transaction_id factice
"""

import hashlib
import hmac
import json
import logging
import time
import uuid

from django.conf import settings

from .base import PaymentProvider, ProviderNetworkError

logger = logging.getLogger(__name__)


def _canonical_json(payload: dict) -> bytes:
    """Sérialise un dict en JSON canonique (clés triées, pas d'espacement superflu)."""
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _compute_signature(payload: dict, secret: str) -> str:
    """Calcule HMAC-SHA256 du payload JSON canonique."""
    body = _canonical_json(payload)
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


class OrangeMoneyProvider(PaymentProvider):
    """
    Provider Orange Money Guinée.

    Mode mock (ORANGE_MONEY_MOCK=true) :
      - initiate_payment retourne immédiatement un ID factice sans appel HTTP
      - check_status retourne "PENDING" pour les transactions < 30s, "COMPLETED" après
      - verify_webhook vérifie la signature HMAC (identique en mock et prod)
    """

    def __init__(self):
        self.mock = settings.ORANGE_MONEY_MOCK if hasattr(settings, "ORANGE_MONEY_MOCK") else True
        self.api_url = getattr(settings, "ORANGE_MONEY_API_URL", "")
        self.secret = getattr(settings, "ORANGE_MONEY_SECRET", "mock-secret-not-for-prod")
        self._mock_initiations: dict[str, float] = {}

    def initiate_payment(self, tenant, amount: int, phone: str, reference: str) -> dict:
        """
        Initie un paiement Orange Money.

        En mode mock, génère un provider_transaction_id et simule un délai
        de traitement sans appel HTTP réel.
        """
        provider_txn_id = f"OM-{uuid.uuid4().hex[:12].upper()}"

        if self.mock:
            logger.info(
                "MOCK OM initiate — ref=%s, phone=%s, amount=%d, txn=%s",
                reference, phone, amount, provider_txn_id,
            )
            self._mock_initiations[provider_txn_id] = time.time()
            return {
                "provider_transaction_id": provider_txn_id,
                "status": "PENDING",
            }

        # ── Appel API réel (non testé en dev) ──────────────────────────────
        try:
            import requests
            payload = {
                "amount": str(amount),
                "phone": phone,
                "reference": reference,
                "description": f"Paiement scolaire {reference}",
            }
            signature = _compute_signature(payload, self.secret)
            resp = requests.post(
                f"{self.api_url}/initiate",
                json=payload,
                headers={
                    "X-Merchant-Signature": signature,
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "provider_transaction_id": data.get("transaction_id", provider_txn_id),
                "status": "PENDING",
            }
        except requests.RequestException as e:
            logger.error("OM API initiate failed: %s", e)
            raise ProviderNetworkError(str(e)) from e

    def check_status(self, provider_transaction_id: str) -> dict:
        """
        Vérifie le statut d'une transaction OM.

        En mode mock :
          - Transactions < 30s : PENDING
          - Transactions >= 30s : COMPLETED
        """
        if self.mock:
            t0 = self._mock_initiations.get(provider_transaction_id)
            if t0 is None:
                return {"status": "FAILED", "failure_reason": "Transaction introuvable"}
            elapsed = time.time() - t0
            if elapsed < 30:
                return {"status": "PENDING"}
            return {"status": "COMPLETED"}

        # ── Appel API réel (non testé en dev) ──────────────────────────
        try:
            import requests
            resp = requests.get(
                f"{self.api_url}/status/{provider_transaction_id}",
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "status": data.get("status", "PENDING"),
                "failure_reason": data.get("failure_reason", ""),
            }
        except requests.RequestException as e:
            logger.error("OM API check_status failed: %s", e)
            raise ProviderNetworkError(str(e)) from e

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Vérifie la signature HMAC du webhook entrant.

        Calcule HMAC-SHA256 du payload JSON canonique et compare
        avec le header X-Orange-Signature (constant-time).
        """
        try:
            payload_dict = json.loads(payload)
        except json.JSONDecodeError:
            return False

        expected = _compute_signature(payload_dict, self.secret)
        return hmac.compare_digest(expected, signature)
