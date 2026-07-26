"""
apps/finance/tasks.py

Tâches Celley pour le module Finance.

- reconcile_orange_money_transactions : réconciliation nocturne
  des transactions Orange Money (FIN-MVP-03).
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import OrangeMoneyTransaction, Payment
from .providers.base import ProviderNetworkError, retry_with_backoff
from .views import get_provider

logger = logging.getLogger(__name__)


@shared_task(name="apps.finance.tasks.reconcile_orange_money_transactions")
def reconcile_orange_money_transactions():
    """
    Réconciliation nocturne des transactions Orange Money.

    Parcourt les OrangeMoneyTransaction en statut INITIATED depuis plus
    de 24h et interroge le provider via check_status().
      - provider_status = COMPLETED : met à jour Payment + solde
      - provider_status = FAILED : marque Payment comme FAILED
      - Si le provider lève une ProviderNetworkError (timeout, API
        injoignable) : la transaction reste INITIATED pour la prochaine
        réconciliation (log + pas de modification).

    Structure : la logique métier (que faire du statut) est dans la tâche,
    l'appel API est délégué au provider. Le jour où check_status() fait
    un vrai appel API, on change le provider, pas la tâche.
    """
    cutoff = timezone.now() - timedelta(hours=24)
    pending_txns = OrangeMoneyTransaction.objects.filter(
        provider_status=OrangeMoneyTransaction.Status.INITIATED,
        payment__status=Payment.Status.PENDING,
    )

    updated_count = 0
    for om_txn in pending_txns:
        try:
            status_data = retry_with_backoff(
                lambda: get_provider().check_status(om_txn.provider_transaction_id),
                max_attempts=2,
                base_delay=1,
            )
        except ProviderNetworkError:
            logger.warning(
                "Réconciliation OM — provider injoignable pour %s, reporté",
                om_txn.provider_transaction_id,
            )
            continue

        remote_status = status_data.get("status", "PENDING")

        if remote_status == "COMPLETED":
            om_txn.provider_status = OrangeMoneyTransaction.Status.CONFIRMED
            om_txn.save(update_fields=["provider_status", "updated_at"])

            payment = om_txn.payment
            payment.status = Payment.Status.COMPLETED
            payment.save(update_fields=["status", "updated_at"])

            from .serializers import generate_receipt_for_payment
            generate_receipt_for_payment(payment)

            if payment.student_fee:
                from decimal import Decimal
                payment.student_fee.balance_due -= Decimal(str(payment.amount))
                payment.student_fee.save(update_fields=["balance_due", "updated_at"])

            updated_count += 1
            logger.info(
                "Réconciliation OM — %s marqué COMPLETED",
                om_txn.provider_transaction_id,
            )
        elif remote_status == "FAILED":
            om_txn.provider_status = OrangeMoneyTransaction.Status.FAILED
            om_txn.save(update_fields=["provider_status", "updated_at"])

            payment = om_txn.payment
            payment.status = Payment.Status.FAILED
            payment.failure_reason = status_data.get(
                "failure_reason", "Échoué via réconciliation",
            )
            payment.save(update_fields=["status", "failure_reason", "updated_at"])

            updated_count += 1
            logger.info(
                "Réconciliation OM — %s marqué FAILED",
                om_txn.provider_transaction_id,
            )

    if updated_count:
        logger.info("Réconciliation OM — %s transaction(s) mise(s) à jour", updated_count)
    return updated_count
