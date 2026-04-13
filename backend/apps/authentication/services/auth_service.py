"""
apps/authentication/services/auth_service.py
Logique métier : génération tokens, réponse auth standardisée.
"""
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens_for_user(user):
    """Génère une paire access/refresh tokens pour l'utilisateur."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def build_auth_response(user):
    """Construit la réponse complète après login ou register."""
    tokens = get_tokens_for_user(user)
    # Fallback : un superuser Django sans rôle RBAC est traité comme SUPER_ADMIN
    role = user.get_role_name() or ("SUPER_ADMIN" if user.is_superuser else "")
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
            },
            "tokens": tokens,
        },
    }
