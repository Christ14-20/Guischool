from django.db import migrations, models


class Migration(migrations.Migration):
    """
    SUPERADMIN-V2-04 : ajoute INVOICE_REMINDER à SMSLog.TriggerType pour les
    relances SMS de factures d'abonnement plateforme impayées (paliers
    OVERDUE/D7 — cf. apps.communication.services.notify_overdue_invoice).

    Ne touche que ce champ — même précédent que la migration 0002
    (TENANT_STATUS) : d'autres écarts de migration pré-existants sur ce
    modèle (renommages d'index, etc., détectés par makemigrations --check
    dès avant SUPERADMIN-V2-01) restent hors périmètre et ne sont pas
    inclus ici.
    """

    dependencies = [
        ("communication", "0002_smslog_trigger_type_tenant_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="smslog",
            name="trigger_type",
            field=models.CharField(
                choices=[
                    ("ABSENCE", "Notification d'absence"),
                    ("PAIEMENT", "Confirmation de paiement"),
                    ("NOTE_VALIDEE", "Note validée"),
                    ("INSCRIPTION", "Confirmation d'inscription"),
                    ("TENANT_STATUS", "Changement de statut établissement"),
                    ("INVOICE_REMINDER", "Relance facture d'abonnement impayée"),
                ],
                help_text="Déclencheur métier à l'origine de l'envoi",
                max_length=20,
            ),
        ),
    ]
