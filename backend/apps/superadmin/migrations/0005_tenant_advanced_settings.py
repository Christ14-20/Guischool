# Generated manually for ARCH-03 tenant advanced configuration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('superadmin', '0004_tenantnetwork_tenant_network'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='logo',
            field=models.ImageField(blank=True, null=True, upload_to='tenants/logos/', verbose_name='Logo'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='nif',
            field=models.CharField(blank=True, max_length=50, verbose_name='NIF'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='registre_commerce',
            field=models.CharField(blank=True, max_length=100, verbose_name='Registre de commerce'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='timezone',
            field=models.CharField(default='Africa/Conakry', max_length=64, verbose_name='Fuseau horaire'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='date_format',
            field=models.CharField(
                choices=[('DD/MM/YYYY', 'JJ/MM/AAAA'), ('MM/DD/YYYY', 'MM/JJ/AAAA'), ('YYYY-MM-DD', 'AAAA-MM-JJ')],
                default='DD/MM/YYYY',
                max_length=20,
                verbose_name='Format de date',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='first_day_week',
            field=models.PositiveSmallIntegerField(
                choices=[(0, 'Dimanche'), (1, 'Lundi')],
                default=1,
                verbose_name='Premier jour de la semaine',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='default_lang',
            field=models.CharField(
                choices=[('fr', 'Français'), ('en', 'English'), ('ar', 'Arabe')],
                default='fr',
                max_length=5,
                verbose_name='Langue par défaut',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='default_currency',
            field=models.CharField(
                choices=[('GNF', 'Franc guinéen'), ('USD', 'Dollar US'), ('EUR', 'Euro')],
                default='GNF',
                max_length=3,
                verbose_name='Devise par défaut',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='education_system',
            field=models.CharField(
                choices=[
                    ('GUINEEN', 'Guinéen'),
                    ('FRANCO_ARABE', 'Franco-arabe'),
                    ('IB', 'IB'),
                    ('MIXTE', 'Mixte'),
                ],
                default='GUINEEN',
                max_length=20,
                verbose_name='Système éducatif',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='active_levels',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Cycles actifs ex: ['PRIMAIRE', 'COLLEGE']",
                verbose_name='Niveaux actifs',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='exams_prepared',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Examens préparés ex: ['CEP', 'BEPC', 'BAC']",
                verbose_name='Examens préparés',
            ),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_internat',
            field=models.BooleanField(default=False, verbose_name='Internat'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_transport',
            field=models.BooleanField(default=False, verbose_name='Transport'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_cantine',
            field=models.BooleanField(default=False, verbose_name='Cantine'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_bibliotheque',
            field=models.BooleanField(default=False, verbose_name='Bibliothèque'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_labo',
            field=models.BooleanField(default=False, verbose_name='Laboratoire'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_official_exams',
            field=models.BooleanField(default=False, verbose_name='Examens officiels'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_payroll',
            field=models.BooleanField(default=False, verbose_name='Paie'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_whatsapp',
            field=models.BooleanField(default=False, verbose_name='WhatsApp'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_offline_advanced',
            field=models.BooleanField(default=False, verbose_name='Offline avancé'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='has_predictive_analytics',
            field=models.BooleanField(default=False, verbose_name='Analytique prédictive'),
        ),
    ]
