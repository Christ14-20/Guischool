"""
apps/finance/providers/base.py

Interface abstraite PaymentProvider.

Chaque opérateur (Orange Money, MTN Mobile Money, Wave) implémente
cette interface. Le ViewSet utilise le provider via get_provider().

ProviderNetworkError et retry_with_backoff ont été déplacés vers
core/retry.py (COMM-MVP-01) et sont réimportés ici pour compatibilité.
"""

import logging
from abc import ABC, abstractmethod

from core.retry import ProviderNetworkError, retry_with_backoff  # noqa: F401

logger = logging.getLogger(__name__)


class PaymentProvider(ABC):
    """
    Interface commune à tous les providers de paiement mobile.

    Les trois méthodes sont obligatoires pour chaque opérateur :
      initiate_payment  — appel API sortant pour initier un paiement
      check_status      — interroge l'opérateur sur le statut d'une transaction
      verify_webhook    — vérifie la signature HMAC d'un webhook entrant
    """

    @abstractmethod
    def initiate_payment(self, tenant, amount: int, phone: str, reference: str) -> dict:
        """
        Initie un paiement mobile.

        Retourne un dict avec au moins :
          - provider_transaction_id : str
          - status : "PENDING" | "FAILED"

        En cas d'échec réseau (timeout, 5xx), la méthode peut lever une
        ProviderNetworkError pour déclencher un retry dans l'appelant.
        """

    @abstractmethod
    def check_status(self, provider_transaction_id: str) -> dict:
        """
        Vérifie le statut d'une transaction auprès de l'opérateur.

        Retourne un dict avec au moins :
          - status : "PENDING" | "COMPLETED" | "FAILED"
          - failure_reason : str (optionnel)
        """

    @abstractmethod
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """
        Vérifie la signature HMAC d'un webhook entrant.

        - payload : corps brut de la requête (bytes)
        - signature : valeur du header X-Orange-Signature

        Retourne True si la signature est valide, False sinon.
        """
