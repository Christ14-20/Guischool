"""
core/exceptions.py

Gestionnaire d'erreurs DRF personnalisé — aligne toutes les réponses d'erreur
sur l'enveloppe standard du contrat d'API (§0.3) :

Erreur :
  {"status": "error", "message": "...", "errors": {...}}

Le champ "errors" n'apparaît que pour les 400 (validation champ par champ).
Pour les 401/403/404/500, seul "message" est présent.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Handler d'exceptions DRF standardisé.
    À configurer dans settings : EXCEPTION_HANDLER = 'core.exceptions.custom_exception_handler'
    """
    response = exception_handler(exc, context)

    if response is None:
        # Exception non gérée par DRF — laisser Django la gérer (500)
        return response

    error_payload = {
        "status": "error",
        "message": _get_error_message(response),
    }

    # Erreurs de validation (400) — on inclut le détail champ par champ
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        error_payload["errors"] = response.data

    response.data = error_payload
    return response


def _get_error_message(response) -> str:
    """Extrait un message lisible depuis la réponse DRF originale."""
    data = response.data

    # Messages d'erreur standards par code HTTP
    status_messages = {
        401: "Authentification requise",
        403: "Accès refusé",
        404: "Ressource non trouvée",
        405: "Méthode non autorisée",
        429: "Trop de requêtes — réessayez dans quelques instants",
        500: "Erreur interne du serveur",
    }

    if response.status_code in status_messages:
        # Utiliser le détail fourni par DRF si disponible, sinon le message standard
        if isinstance(data, dict) and "detail" in data:
            return str(data["detail"])
        return status_messages[response.status_code]

    # 400 : retourner le premier message de validation comme message principal
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
        return "Données invalides"

    return str(data)
