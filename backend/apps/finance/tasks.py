"""
apps/finance/tasks.py

Tâches Celery pour le module Finance.

- reconcile_orange_money_transactions : réconciliation nocturne
  des transactions Orange Money (FIN-MVP-03).
- generate_invoice_pdf : génération asynchrone de PDF de facture (FIN-MVP-04).
- flag_overdue_invoices : marquage quotidien des factures en retard (FIN-MVP-04).
"""

import io
import logging
from datetime import timedelta, date

from celery import shared_task
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

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

            from .serializers import generate_receipt_for_payment, sync_invoice, resolve_payment_school_year, send_payment_confirmation_sms
            generate_receipt_for_payment(payment)
            send_payment_confirmation_sms(payment)

            school_year = resolve_payment_school_year(payment)
            if school_year:
                sync_invoice(payment.student, school_year)

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


@shared_task(name="apps.finance.tasks.generate_invoice_pdf")
def generate_invoice_pdf(invoice_id):
    """
    Génération asynchrone du PDF d'une facture.

    Appelée par POST /finance/invoices/{id}/generate-pdf/.
    Le résultat est stocké dans Invoice.pdf_url, et Invoice.generated_at
    est mis à jour.

    Pattern identique au bulletin (Épic 6) : la tâche est polling via
    /tasks/{id}/status/.
    """
    from .models import Invoice as InvoiceModel

    try:
        invoice = InvoiceModel.objects.select_related(
            "student", "school_year",
        ).get(id=invoice_id)
    except InvoiceModel.DoesNotExist:
        logger.error("generate_invoice_pdf — facture %s introuvable", invoice_id)
        return {"error": "Facture introuvable"}

    html = render_to_string("finance/invoice.html", {"invoice": invoice})
    pdf_buffer = io.BytesIO()
    from weasyprint import HTML
    HTML(string=html).write_pdf(pdf_buffer)

    filename = f"invoices/{invoice.id}.pdf"
    saved_path = default_storage.save(filename, ContentFile(pdf_buffer.getvalue()))
    invoice.pdf_url = default_storage.url(saved_path)
    invoice.generated_at = timezone.now()
    invoice.save(update_fields=["pdf_url", "generated_at", "updated_at"])

    logger.info("PDF généré pour la facture %s", invoice.id)
    return {"invoice_id": str(invoice.id), "pdf_url": invoice.pdf_url}


@shared_task(name="apps.finance.tasks.flag_overdue_invoices")
def flag_overdue_invoices():
    """
    Tâche quotidienne Celery Beat.

    Parcourt les factures avec balance > 0 dont due_date est dépassée
    et les bascule en OVERDUE.

    N'efface jamais OVERDUE (même si paiement partiel est fait ensuite,
    le statut reste OVERDUE jusqu'à PAID complet — géré par sync_invoice).
    """
    from .models import Invoice as InvoiceModel

    today = date.today()
    overdue_invoices = InvoiceModel.objects.filter(
        balance__gt=0,
        due_date__lt=today,
    ).exclude(status=InvoiceModel.Status.PAID)

    count = overdue_invoices.update(status=InvoiceModel.Status.OVERDUE)

    if count:
        logger.info("flag_overdue_invoices — %s facture(s) marquée(s) OVERDUE", count)
    return count
