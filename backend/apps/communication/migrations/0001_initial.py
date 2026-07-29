"""
Migration 0001 — COMM-MVP-01

Crée le modèle SMSLog (journal d'envoi SMS).
Dépend de superadmin.0002 (Tenant) et pedagogy.0019 (Guardian).
"""

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("superadmin", "0002_tenant_complete"),
        ("pedagogy", "0019_yearenddecision_non_nullable"),
    ]

    operations = [
        migrations.CreateModel(
            name="SMSLog",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "recipient_phone",
                    models.CharField(db_index=True, max_length=20, help_text="Numéro de téléphone destinataire (ex: +224655112233)"),
                ),
                (
                    "guardian",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="sms_logs",
                        to="pedagogy.guardian",
                        help_text="Guardian associé (nullable)",
                    ),
                ),
                ("content", models.TextField(help_text="Corps du message envoyé")),
                (
                    "trigger_type",
                    models.CharField(
                        max_length=20,
                        choices=[
                            ("ABSENCE", "Notification d'absence"),
                            ("PAIEMENT", "Confirmation de paiement"),
                            ("NOTE_VALIDEE", "Note validée"),
                            ("INSCRIPTION", "Confirmation d'inscription"),
                        ],
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        max_length=10,
                        choices=[("SENT", "Envoyé"), ("FAILED", "Échec"), ("DELIVERED", "Délivré")],
                        db_index=True,
                        default="SENT",
                    ),
                ),
                (
                    "provider_message_id",
                    models.CharField(
                        blank=True, db_index=True, max_length=100,
                        help_text="ID retourné par Africa's Talking",
                    ),
                ),
                (
                    "failure_reason",
                    models.TextField(blank=True, help_text="Raison d'échec"),
                ),
                (
                    "sent_at",
                    models.DateTimeField(auto_now_add=False, help_text="Horodatage de l'envoi"),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="communication_smslog_set",
                        to="superadmin.tenant",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant", "recipient_phone", "sent_at"], name="comm_smslog_tenant_phone_sent"),
                    models.Index(fields=["tenant", "trigger_type"], name="comm_smslog_tenant_trigger"),
                ],
            },
        ),
    ]
