# Generated manually for EDU-03 - Add Filiere model

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedagogy', '0004_extend_level_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='Filiere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(choices=[('S', 'Scientifique'), ('L', 'Littéraire'), ('SE', 'Sciences de l\'Économique'), ('SM', 'Sciences de la Mathématique'), ('SS', 'Sciences de la Santé'), ('T1', 'Technique 1'), ('T2', 'Technique 2'), ('T3', 'Technique 3'), ('T4', 'Technique 4'), ('BEP', 'BEP'), ('CAP', 'CAP'), ('BTS', 'BTS')], max_length=10, verbose_name='Code filière')),
                ('name', models.CharField(max_length=100, verbose_name='Nom de la filière')),
                ('cycle', models.CharField(choices=[('LYCEE_GEN', 'Lycée Général'), ('LYCEE_TECH', 'Lycée Technique'), ('CQP', 'CQP')], max_length=20, verbose_name='Cycle concerné')),
                ('matieres_dominantes', models.JSONField(blank=True, default=list, help_text="Liste des codes de matières ex: ['FR', 'MATH', 'PC']", verbose_name='Matières dominantes')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filieres', to='superadmin.tenant')),
            ],
            options={
                'verbose_name': 'Filière',
                'verbose_name_plural': 'Filières',
                'ordering': ['cycle', 'name'],
            },
        ),
        migrations.AddField(
            model_name='class',
            name='filiere',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='classes', to='pedagogy.filiere', verbose_name='Filière'),
        ),
    ]