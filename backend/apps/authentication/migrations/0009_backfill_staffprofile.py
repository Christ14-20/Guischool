"""
Migration 0009 — STAFF-V2-01

Backfill : crée un StaffProfile (vide, statut=ACTIF) pour tout User
existant dont le rôle est TEACHER/STUDENT_STUDIES/ACCOUNTANT — les mêmes
rôles gérés par StaffViewSet (DIRECTOR/SUPER_ADMIN/PARENT n'en ont jamais).
Sans ce backfill, StaffListSerializer/StaffDetailSerializer devraient gérer
un cas "profil manquant" pour tout compte staff créé avant ce ticket — au
lieu de ça, l'invariant "tout compte staff a un profil" est garanti dès la
migration.
"""

from django.db import migrations

STAFF_ROLE_NAMES = ("TEACHER", "STUDENT_STUDIES", "ACCOUNTANT")


def backfill_staff_profiles(apps, schema_editor):
    User = apps.get_model("authentication", "User")
    StaffProfile = apps.get_model("authentication", "StaffProfile")

    staff_users = User.objects.filter(
        role__name__in=STAFF_ROLE_NAMES,
        staff_profile__isnull=True,
    )
    StaffProfile.objects.bulk_create(
        [StaffProfile(user=user) for user in staff_users]
    )


def noop_reverse(apps, schema_editor):
    # Rien à faire : supprimer StaffProfile (migration 0008 reverse) suffit
    # à défaire ce backfill.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0008_staffprofile"),
    ]

    operations = [
        migrations.RunPython(backfill_staff_profiles, noop_reverse),
    ]
