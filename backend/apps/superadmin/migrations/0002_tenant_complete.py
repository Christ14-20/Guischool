# Generated manually — TENANT-01: ajout des champs complets §1.1 (Tenant) et §1.2 (Plan)
#
# Migration ADDITIVE : ne supprime rien, n'altère aucun champ existant.
# Les nouveaux champs CharField/EmailField/URLField/JSONField non-nullables utilisent
# un one-off default vide ("") — acceptable car aucune donnée de prod n'existe à ce stade.
# Tenant.contact_email a un default vide mais une contrainte unique → les tests doivent
# toujours fournir une valeur réelle.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("superadmin", "0001_initial"),
    ]

    operations = [
        # ── Plan : ajout des champs complets §1.2 ────────────────────────────
        migrations.AddField(
            model_name="plan",
            name="max_students",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="plan",
            name="max_staff",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="plan",
            name="price_monthly",
            field=models.DecimalField(decimal_places=2, default="0.00", max_digits=10),
        ),
        migrations.AddField(
            model_name="plan",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        # ── Tenant : champs identité ──────────────────────────────────────────
        migrations.AddField(
            model_name="tenant",
            name="code_minedu",
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="tenant",
            name="contact_name",
            field=models.CharField(default="", max_length=150),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="tenant",
            name="contact_phone",
            field=models.CharField(default="", max_length=20),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="tenant",
            name="contact_email",
            field=models.EmailField(default="", unique=True),
            preserve_default=False,
        ),
        # ── Tenant : localisation ─────────────────────────────────────────────
        migrations.AddField(
            model_name="tenant",
            name="region",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="tenant",
            name="prefecture",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="tenant",
            name="commune",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="tenant",
            name="quartier",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="tenant",
            name="latitude",
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9, null=True
            ),
        ),
        migrations.AddField(
            model_name="tenant",
            name="longitude",
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9, null=True
            ),
        ),
        # ── Tenant : configuration ────────────────────────────────────────────
        migrations.AddField(
            model_name="tenant",
            name="logo",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="tenant",
            name="settings",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="tenant",
            name="trial_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # ── Tenant : Meta.indexes — conforme §1.1 ─────────────────────────────
        # Redondant avec db_index=True sur le champ status, mais ajouté tel quel
        # pour respecter le schéma au champ près (décision TENANT-01).
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(fields=["status"], name="superadmin__status_575a20_idx"),
        ),
    ]
