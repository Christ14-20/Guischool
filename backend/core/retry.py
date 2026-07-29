"""
core/retry.py

Utilitaire de retry avec backoff exponentiel, partagé entre apps.

Déplacé depuis apps/finance/providers/base.py (COMM-MVP-01) pour éviter
la duplication entre Finance (OrangeMoney) et Communication (Africa's Talking).
"""

import time
import logging

logger = logging.getLogger(__name__)


class ProviderNetworkError(Exception):
    """
    Erreur réseau/appel API vers un provider externe.

    Levée par un provider (paiement, SMS, etc.) en cas d'échec
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
    raise last_error
