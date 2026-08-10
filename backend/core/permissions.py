"""
core/permissions.py

Classe de permission DRF réutilisable — AUTH-03.

Usage sur un ViewSet :
    permission_classes = [IsAuthenticated, HasPermission("notes:create:evaluation")]

Convention des codenames (A2 — arbitrage 2026-07-15) :
    Format : module:action[:scope]
    Source de vérité : contrat d'API §1 GET /auth/permissions/me/
"""

from rest_framework.permissions import BasePermission


class HasPermission(BasePermission):
    """
    Permission DRF vérifiant qu'un utilisateur possède un codename spécifique.
    Délègue la vérification à user.can(codename) défini sur le modèle User.

    Renvoie 403 si authentifié mais permission insuffisante.
    Renvoie 401 si non authentifié (géré par IsAuthenticated en amont).
    """

    def __init__(self, codename: str):
        self.codename = codename

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can(self.codename)

    def has_object_permission(self, request, view, obj):
        """
        Par défaut, la permission objet est identique à la permission vue.
        Surcharger dans les ViewSets pour les cas ABAC (ex. un enseignant ne
        peut lire que les notes de ses propres matières).
        """
        return self.has_permission(request, view)


class HasAnyPermission(BasePermission):
    """
    Permission DRF vérifiant qu'un utilisateur possède AU MOINS UN des
    codenames donnés — HasPermission fait un ET logique quand plusieurs
    instances sont listées dans permission_classes, ce qui ne convient pas
    aux endpoints partagés par plusieurs fonctionnalités indépendantes
    (ex. le catalogue de permissions, utilisé à la fois par l'édition de
    permissions individuelles d'un staff, staff:update, et par l'éditeur de
    rôles, roles:read/create/update).
    """

    def __init__(self, *codenames: str):
        self.codenames = codenames

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return any(request.user.can(c) for c in self.codenames)


class IsSuperAdmin(BasePermission):
    """Réservé aux utilisateurs avec role=SUPER_ADMIN (plateforme, hors tenant)."""

    message = "Accès réservé aux Super Administrateurs de la plateforme."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            hasattr(request.user, "role")
            and request.user.role.name == "SUPER_ADMIN"
        )


class IsTenantMember(BasePermission):
    """
    Vérifie que l'utilisateur appartient bien au tenant courant de la requête.
    Complémentaire au TenantMiddleware — ajoute une vérification explicite au
    niveau de la permission pour les cas où le middleware n'est pas appliqué.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False
        return request.user.tenant_id == tenant.id
