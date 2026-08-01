"""
apps/superadmin/tasks.py — TENANT-04

Tâches Celery asynchrones pour les notifications et les opérations en arrière-plan.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(name="apps.superadmin.tasks.send_tenant_status_notification")
def send_tenant_status_notification(
    tenant_id: str, old_status: str, new_status: str,
    reason: str | None = None, action: str | None = None,
):
    """
    Envoie une notification (email + SMS) au contact principal lors du
    changement de statut d'un Tenant.
    RÈGLE : l'envoi doit rester asynchrone et ne jamais bloquer la requête HTTP.

    SUPERADMIN-V2-01 : le SMS (apps.communication.services.notify_tenant_status)
    a été ajouté ici — jusqu'ici cette tâche n'envoyait qu'un email malgré son
    nom générique.

    SUPERADMIN-V2-04 : `reason`/`action` (transmis par transition_tenant_status)
    permettent de distinguer une suspension automatique pour impayé
    (`action == "tenant:auto-suspend-overdue"`) d'une suspension manuelle —
    le corps du message est alors explicitement différent (montant, numéro de
    facture, retard), PAS le message générique de changement de statut
    utilisé pour une suspension manuelle (décision PO explicite).
    """
    from apps.superadmin.models import Tenant
    from apps.communication.services import notify_tenant_status

    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        logger.error(f"Tenant {tenant_id} introuvable pour envoi de notification.")
        return

    is_overdue_escalation = action == "tenant:auto-suspend-overdue"

    if is_overdue_escalation:
        subject = "Eduguinée — Suspension automatique pour facture d'abonnement impayée"
        access_labels = {
            "SUSPENDED_SOFT": (
                "L'accès à votre espace a été restreint en lecture seule. La consultation "
                "et l'export de vos données restent disponibles, mais toute nouvelle saisie "
                "est bloquée jusqu'à régularisation."
            ),
            "SUSPENDED_HARD": (
                "L'accès à votre espace a été entièrement suspendu, y compris la "
                "consultation."
            ),
        }
        message = (
            f"Bonjour {tenant.contact_name},\n\n"
            f"L'accès de votre établissement '{tenant.name}' à la plateforme Eduguinée a été "
            f"restreint suite à un impayé sur votre abonnement.\n\n"
            f"Motif : {reason}\n\n"
            f"{access_labels.get(new_status, '')}\n\n"
            "Merci de régulariser votre situation dans les meilleurs délais pour rétablir "
            "l'accès complet. Contactez notre support si vous pensez qu'il s'agit d'une "
            "erreur.\n\n"
            "Cordialement,\nL'équipe d'administration Eduguinée"
        )
    else:
        subject = "Eduguinée — Statut de votre établissement mis à jour"

        status_labels = {
            "ACTIVE": "Activé / Réactivé",
            "SUSPENDED_SOFT": "Suspendu (lecture seule)",
            "SUSPENDED_HARD": "Suspendu (blocage total)",
            "CANCELLED": "Résilié",
            "TRIAL": "Période d'essai",
        }

        label = status_labels.get(new_status, new_status)
        message = (
            f"Bonjour {tenant.contact_name},\n\n"
            f"Le statut de votre établissement '{tenant.name}' sur la plateforme Eduguinée a été mis à jour.\n"
            f"Nouveau statut : {label}.\n\n"
        )

        if new_status == "SUSPENDED_SOFT":
            message += (
                "L'accès à votre espace a été restreint en lecture seule. La consultation et "
                "l'export de vos données restent disponibles, mais toute nouvelle saisie est "
                "bloquée jusqu'à régularisation. Contactez notre support pour rétablir l'accès complet.\n\n"
            )
        elif new_status == "SUSPENDED_HARD":
            message += (
                "L'accès à votre espace a été entièrement suspendu, y compris la consultation. "
                "Contactez notre support pour rétablir le service.\n\n"
            )
        elif new_status == "ACTIVE":
            message += "Votre espace est de nouveau pleinement opérationnel.\n\n"

        message += "Cordialement,\nL'équipe d'administration Eduguinée"

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@eduguinee.gn")

    try:
        send_mail(
            subject,
            message,
            from_email,
            [tenant.contact_email],
            fail_silently=False,
        )
        logger.info(
            f"Email de notification envoyé avec succès à {tenant.contact_email} (Tenant: {tenant.name})"
        )
    except Exception as e:
        # Enregistré dans les logs mais ne fait pas planter le worker ni le flux HTTP principal
        logger.error(
            f"Échec de l'envoi d'email de notification à {tenant.contact_email} : {str(e)}"
        )

    notify_tenant_status(tenant_id, new_status, reason=reason, action=action)


@shared_task(name="apps.superadmin.tasks.generate_platform_invoices")
def generate_platform_invoices():
    """
    Tâche quotidienne Celery Beat — SUPERADMIN-V2-05.

    Même pattern que apps.finance.tasks.flag_overdue_invoices : un niveau
    au-dessus (facture plateforme, pas facture élève). Toute la logique
    (tenants éligibles, ancre de facturation, numérotation) vit dans
    apps.superadmin.services.platform_invoice_service — un seul point
    d'entrée, pas dupliqué ici.
    """
    from apps.superadmin.services.platform_invoice_service import generate_due_invoices

    created = generate_due_invoices()
    if created:
        logger.info(
            "generate_platform_invoices — %s facture(s) plateforme générée(s)", len(created)
        )
    return len(created)


@shared_task(name="apps.superadmin.tasks.flag_overdue_platform_invoices")
def flag_overdue_platform_invoices():
    """
    Tâche quotidienne Celery Beat — SUPERADMIN-V2-04.

    Regroupe volontairement deux étapes séquentielles du même cycle impayé
    dans une seule tâche Beat (contrairement à generate_platform_invoices,
    qui est une responsabilité distincte) : d'abord marquer les factures en
    retard (mark_overdue_invoices), puis évaluer relance/escalade dessus
    (escalate_overdue_tenants) — l'ordre importe, l'escalade du jour doit
    voir les factures fraîchement passées OVERDUE. Toute la logique vit dans
    apps.superadmin.services.platform_invoice_service, pas dupliquée ici.
    """
    from apps.superadmin.services.platform_invoice_service import (
        mark_overdue_invoices,
        escalate_overdue_tenants,
    )

    flagged = mark_overdue_invoices()
    actions = escalate_overdue_tenants()

    if flagged:
        logger.info(
            "flag_overdue_platform_invoices — %s facture(s) plateforme marquée(s) OVERDUE",
            flagged,
        )
    if actions:
        logger.info(
            "flag_overdue_platform_invoices — %s action(s) de relance/escalade", len(actions)
        )
    return {"flagged": flagged, "escalation_actions": len(actions)}


@shared_task(name="apps.superadmin.tasks.send_overdue_invoice_reminder")
def send_overdue_invoice_reminder(tenant_id: str, invoice_id: str, stage: str):
    """
    Relance email + SMS pour une facture d'abonnement en retard — paliers
    OVERDUE (J+1) et D7 uniquement (SUPERADMIN-V2-04). Les paliers D15/D30
    sont déjà couverts par la notification de changement de statut
    (transition_tenant_status -> send_tenant_status_notification/
    notify_tenant_status) : pas de message distinct ici pour ces paliers,
    décision PO explicite pour éviter un double email/SMS le même jour pour
    le même événement.
    """
    from apps.superadmin.models import Tenant, PlatformInvoice
    from apps.communication.services import notify_overdue_invoice

    try:
        tenant = Tenant.objects.get(id=tenant_id)
        invoice = PlatformInvoice.objects.get(id=invoice_id)
    except Tenant.DoesNotExist:
        logger.error(f"Tenant {tenant_id} introuvable pour relance impayé.")
        return
    except PlatformInvoice.DoesNotExist:
        logger.error(f"PlatformInvoice {invoice_id} introuvable pour relance impayé.")
        return

    stage_labels = {
        "OVERDUE": "est en retard de paiement",
        "D7": "reste impayée après 7 jours de retard",
    }
    subject = "Eduguinée — Facture d'abonnement impayée"
    message = (
        f"Bonjour {tenant.contact_name},\n\n"
        f"La facture {invoice.invoice_number} de '{tenant.name}' "
        f"{stage_labels.get(stage, 'est impayée')} "
        f"(échéance dépassée le {invoice.due_date.strftime('%d/%m/%Y')}, montant : "
        f"{invoice.amount} GNF).\n\n"
        "Merci de régulariser votre situation dans les meilleurs délais pour éviter "
        "une suspension automatique de votre accès à la plateforme.\n\n"
        "Cordialement,\nL'équipe d'administration Eduguinée"
    )

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@eduguinee.gn")
    try:
        send_mail(subject, message, from_email, [tenant.contact_email], fail_silently=False)
        logger.info(
            f"Relance impayé envoyée par email à {tenant.contact_email} "
            f"(facture {invoice.invoice_number}, palier {stage})"
        )
    except Exception as e:
        logger.error(f"Échec de l'envoi de la relance impayé par email : {str(e)}")

    notify_overdue_invoice(tenant_id, invoice.invoice_number, stage)
