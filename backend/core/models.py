"""
core/models.py

Classes abstraites de base — §0.2 du schéma de données MVP Eduguinée.

Ces deux classes sont le socle de TOUS les modèles métier du projet :
- TenantScopedModel : pour toute entité rattachée à un établissement (école).
  Chaque ViewSet filtrant ces modèles DOIT appliquer .filter(tenant=request.tenant).
- TimestampedModel : pour les entités globales (Plan, Tenant, Role, Permission, AuditLog)
  qui ne sont pas propres à un tenant.

Convention de nommage des permissions (décision A2, arbitrage 2026-07-15) :
  Format : module:action[:scope]
  Exemples : "notes:create:evaluation", "attendance:create", "eleves:read:medical"
  Ce format est la source de vérité pour tout le RBAC du projet.
  NE PAS utiliser la notation can_verb_resource (ex: can_create_student) — obsolète.
"""

import uuid
from django.db import models


class TimestampedModel(models.Model):
    """
    Classe abstraite pour les entités non intrinsèquement rattachées à un
    tenant unique (elles gèrent leur propre FK tenant si besoin).
    Exemples : Plan (global), Tenant, Permission (global), AuditLog.
    Role a son propre FK `tenant` nullable (cf. apps/authentication/models.py)
    — nullable plutôt qu'obligatoire (TenantScopedModel) car les rôles-modèles
    système (tenant=NULL) doivent pouvoir exister.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantScopedModel(models.Model):
    """
    Classe abstraite pour toute entité métier rattachée à un établissement scolaire.

    RÈGLE NON NÉGOCIABLE :
    Tout ViewSet dont le modèle hérite de TenantScopedModel DOIT filtrer
    get_queryset() sur tenant=self.request.tenant (injecté par TenantMiddleware).
    Un test d'isolation multi-tenant est obligatoire pour chaque nouveau modèle
    avant qu'il soit considéré comme terminé (cf. AUTH-03 / QA-01).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "superadmin.Tenant",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
