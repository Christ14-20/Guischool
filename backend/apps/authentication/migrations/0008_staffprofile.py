# STAFF-V2-01 : ajout du modèle StaffProfile.
#
# Note : makemigrations a aussi détecté un écart pré-existant et sans lien
# sur Role.name (AlterField, choices) — même précédent que les migrations
# 0002 (communication) déjà rencontrées sur ce projet : non inclus ici,
# hors périmètre de ce ticket.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0007_add_communication_permissions'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('date_naissance', models.DateField(blank=True, null=True)),
                ('sexe', models.CharField(blank=True, choices=[('M', 'Masculin'), ('F', 'Féminin')], max_length=1)),
                ('date_embauche', models.DateField(blank=True, null=True)),
                ('type_contrat', models.CharField(blank=True, choices=[('CDI', 'CDI'), ('CDD', 'CDD'), ('VACATAIRE', 'Vacataire'), ('STAGE', 'Stage')], max_length=10)),
                ('numero_cnss', models.CharField(blank=True, max_length=50)),
                ('type_compte_paie', models.CharField(blank=True, choices=[('BANQUE', 'Compte bancaire'), ('ORANGE_MONEY', 'Orange Money'), ('ESPECES', 'Espèces')], max_length=15)),
                ('numero_compte_paie', models.CharField(blank=True, max_length=50)),
                ('statut', models.CharField(choices=[('ACTIF', 'Actif'), ('EN_CONGE', 'En congé'), ('SUSPENDU', 'Suspendu'), ('PARTI', 'Parti')], db_index=True, default='ACTIF', max_length=10)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='staff_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
