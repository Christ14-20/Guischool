# Generated manually for EDU-01 - Extend Level model

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedagogy', '0003_add_campus_fk'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='level',
            options={'ordering': ['cycle', 'order_index'], 'verbose_name': 'Niveau'},
        ),
        migrations.AlterField(
            model_name='level',
            name='cycle',
            field=models.CharField(choices=[('MATERNELLE', 'Maternelle'), ('PRIMAIRE', 'Primaire'), ('CQP', 'Cours Professionnels Qualifiants (BEP/CAP)'), ('COLLEGE', 'Collège'), ('LYCEE_GEN', 'Lycée Général'), ('LYCEE_TECH', 'Lycée Technique'), ('ETFP_A', 'Etudes Fondamentales de 1er Cycle (A)'), ('ETFP_B', 'Etudes Fondamentales de 2nd Cycle (B)')], max_length=20, verbose_name='Cycle éducatif'),
        ),
        migrations.AlterField(
            model_name='level',
            name='name',
            field=models.CharField(help_text='Ex: TPS, 6ème, Terminale S', max_length=50),
        ),
        migrations.AddField(
            model_name='level',
            name='code_officiel_minedu',
            field=models.CharField(blank=True, max_length=20, verbose_name='Code officiel MINEDU'),
        ),
        migrations.AddField(
            model_name='level',
            name='age_min',
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name='Âge minimum'),
        ),
        migrations.AddField(
            model_name='level',
            name='age_max',
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name='Âge maximum'),
        ),
        migrations.AddField(
            model_name='level',
            name='diplome_final',
            field=models.CharField(blank=True, max_length=100, verbose_name='Diplôme final'),
        ),
        migrations.AddField(
            model_name='level',
            name='duree_annees',
            field=models.PositiveSmallIntegerField(default=1, verbose_name='Durée en années'),
        ),
        migrations.AddField(
            model_name='level',
            name='evaluation_type',
            field=models.CharField(choices=[('NUMERIC', 'Numérique'), ('DESCRIPTIVE', 'Descriptive')], default='NUMERIC', max_length=15, verbose_name="Type d'évaluation"),
        ),
    ]