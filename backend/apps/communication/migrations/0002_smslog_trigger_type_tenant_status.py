from django.db import migrations, models


class Migration(migrations.Migration):
    """
    SUPERADMIN-V2-01 : ajoute TENANT_STATUS à SMSLog.TriggerType pour les
    notifications SMS de changement de statut d'établissement (suspension
    soft/hard, réactivation).

    Ne touche que ce champ — d'autres écarts de migration pré-existants sur
    ce modèle (renommages d'index, etc., détectés par makemigrations --check
    dès avant ce ticket) sont hors périmètre et ne sont pas inclus ici.
    """

    dependencies = [
        ("communication", "0001_initial"),
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
                ],
                help_text="Déclencheur métier à l'origine de l'envoi",
                max_length=20,
            ),
        ),
    ]
