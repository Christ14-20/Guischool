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
def send_tenant_status_notification(tenant_id: str, old_status: str, new_status: str):
    """
    Envoie un email de notification au contact principal lors du changement de statut d'un Tenant.
    RÈGLE : l'envoi de l'email doit rester asynchrone et ne jamais bloquer la requête HTTP.
    """
    from apps.superadmin.models import Tenant

    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        logger.error(f"Tenant {tenant_id} introuvable pour envoi de notification.")
        return

    subject = f"Eduguinée — Statut de votre établissement mis à jour"
    
    status_labels = {
        "ACTIVE": "Activé / Réactivé",
        "SUSPENDED": "Suspendu",
        "CANCELLED": "Résilié",
        "TRIAL": "Période d'essai",
    }
    
    label = status_labels.get(new_status, new_status)
    message = (
        f"Bonjour {tenant.contact_name},\n\n"
        f"Le statut de votre établissement '{tenant.name}' sur la plateforme Eduguinée a été mis à jour.\n"
        f"Nouveau statut : {label}.\n\n"
    )

    if new_status == "SUSPENDED":
        message += (
            "L'accès à votre espace a été temporairement suspendu. "
            "Veuillez contacter le support ou régler vos factures en attente pour rétablir le service.\n\n"
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
