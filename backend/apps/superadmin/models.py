from core.models import TimestampedModel
from django.db import models


class Plan(TimestampedModel):
    name = models.CharField(max_length=50, unique=True)


class Tenant(TimestampedModel):
    class Status(models.TextChoices):
        TRIAL = "TRIAL", "Essai"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspendue"
        CANCELLED = "CANCELLED", "Résiliée"

    class SchoolType(models.TextChoices):
        PRIMAIRE = "PRIMAIRE", "Primaire"
        COLLEGE = "COLLEGE", "Collège"
        LYCEE = "LYCEE", "Lycée"
        MIXTE = "MIXTE", "Mixte"

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    school_type = models.CharField(max_length=20, choices=SchoolType.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.TRIAL, db_index=True
    )
    plan = models.ForeignKey(
        "superadmin.Plan", on_delete=models.PROTECT, related_name="tenants"
    )
