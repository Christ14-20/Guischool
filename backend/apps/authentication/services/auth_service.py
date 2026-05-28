"""
apps/authentication/services/auth_service.py
Logique métier : génération tokens, réponse auth standardisée.
"""
from rest_framework_simplejwt.tokens import RefreshToken


def _get_user_campus_id(user):
    """
    Retourne le campus_id de l'utilisateur.
    - Cherche d'abord un campus principal (is_main=True) dans son tenant.
    - Si un seul campus : retourne directement son ID.
    - Super Admin (pas de tenant) : retourne None.
    """
    if not user.tenant_id:
        return None
    try:
        from apps.superadmin.models import Campus
        # Priorité : campus principal du tenant
        campus = Campus.objects.filter(tenant_id=user.tenant_id, is_main=True, is_active=True).first()
        if not campus:
            campus = Campus.objects.filter(tenant_id=user.tenant_id, is_active=True).first()
        return str(campus.id) if campus else None
    except Exception:
        return None


def get_tokens_for_user(user):
    """Génère une paire access/refresh tokens avec claims custom (tenant_id, campus_id, role)."""
    refresh = RefreshToken.for_user(user)

    # Injection des claims custom dans le token
    refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
    refresh["campus_id"] = _get_user_campus_id(user)
    refresh["role"] = user.get_role_name() or ("SUPER_ADMIN" if user.is_superuser else "")

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def build_auth_response(user):
    """Construit la réponse complète après login ou register."""
    tokens = get_tokens_for_user(user)
    # Fallback : un superuser Django sans rôle RBAC est traité comme SUPER_ADMIN
    role = user.get_role_name() or ("SUPER_ADMIN" if user.is_superuser else "")
    campus_id = _get_user_campus_id(user)
    return {
        "status": "success",
        "data": {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                "campus_id": campus_id,
            },
            "tokens": tokens,
        },
    }
