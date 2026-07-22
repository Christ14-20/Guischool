"""
core/backends.py

Backend d'authentification personnalisé — STAFF-MVP-01.

N'inclut PAS la vérification is_active dans authenticate(), pour permettre
au serializer de login de renvoyer un message spécifique "Compte désactivé"
(403) plutôt que le 401 générique "Identifiants incorrects" de Django.

Référence : https://docs.djangoproject.com/en/5.1/topics/auth/customizing/#writing-an-authentication-backend
"""

from django.contrib.auth.backends import ModelBackend


class EmailModelBackend(ModelBackend):
    """
    Backend qui utilise l'email comme identifiant (USERNAME_FIELD = email)
    et ne filtre PAS par is_active au niveau authenticate().
    La vérification de is_active est déléguée au serializer de login
    pour un message d'erreur plus précis.
    """

    def user_can_authenticate(self, user):
        return True  # Ne pas filtrer par is_active ici
