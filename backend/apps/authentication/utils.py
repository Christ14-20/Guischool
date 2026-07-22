"""
apps/authentication/utils.py

Utilitaires pour l'authentification JWT (SimpleJWT).
"""


def allow_authenticated_user(user):
    """
    Règle d'authentification SimpleJWT qui ne filtre PAS par is_active.
    La vérification de is_active est déléguée au serializer de login
    pour un message d'erreur plus précis ("Compte désactivé").
    """
    return user is not None
