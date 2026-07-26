"""
apps/finance/providers/base.py

Interface abstraite PaymentProvider + utilitaire de retry avec backoff.

Chaque opérateur (Orange Money, MTN Mobile Money, Wave) implémente
cette interface. Le ViewSet utilise le provider via get_provider().
"""

import time
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class ProviderNetworkError(Exception):
    """
    Erreur réseau/appel API vers le provider.

    Levée par initiate_payment / check_status en cas d'échec
    réseau (timeout, connexion refusée, 5xx) pour déclencher
    un retry avec backoff exponentiel.
    """


def retry_with_backoff(fn, max_attempts=3, base_delay=2):
    """
    Appelle fn() jusqu'à max_attempts fois avec backoff exponentiel.

    Retry UNIQUEMENT sur ProviderNetworkError (erreur réseau/API).
    Les autres exceptions remontent immédiatement.

    Retourne le résultat de fn() si un appel réussit.
    Lève ProviderNetworkError si tous les appels échouent.

    Le délai entre chaque tentative est : base_delay * (2 ^ (attempt - 1))
    (ex. base_delay=2 → 2s, 4s, 8s pour 3 tentatives).

    Utile pour les appels sortants vers les API opérateurs (initiation,
    check_status) qui peuvent tomber en timeout ou 5xx temporaire.
    """
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except ProviderNetworkError as e:
            last_error = e
            if attempt < max_attempts:
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    "Retry %d/%d dans %.1fs : %s",
                    attempt, max_attempts, delay, e,
                )
                time.sleep(delay)
    raise last_error  # type: ignore[misc]


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
