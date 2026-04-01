"""
core/exceptions.py — Gestionnaire d'erreurs DRF standardisé.
Toutes les réponses d'erreur suivent le format :
{
    "status": "error",
    "message": "...",
    "errors": { ... }  # optionnel (validation)
}
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Surcharge le handler DRF pour normaliser toutes les erreurs."""
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "status": "error",
            "message": _get_message(response),
        }
        # Ajouter le détail de validation si disponible
        if isinstance(response.data, dict) and response.data != {"detail": response.data.get("detail")}:
            errors = {k: v for k, v in response.data.items() if k != "detail"}
            if errors:
                error_data["errors"] = errors

        response.data = error_data

    return response


def _get_message(response):
    """Extrait un message humain lisible depuis la réponse DRF."""
    data = response.data
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        # Prendre la première erreur de champ
        for key, val in data.items():
            if isinstance(val, list) and val:
                return f"{key}: {val[0]}"
    if isinstance(data, list) and data:
        return str(data[0])
    return _default_message(response.status_code)


def _default_message(code: int) -> str:
    messages = {
        400: "Données invalides.",
        401: "Authentification requise.",
        403: "Accès refusé.",
        404: "Ressource non trouvée.",
        405: "Méthode non autorisée.",
        429: "Trop de requêtes. Veuillez réessayer plus tard.",
        500: "Erreur interne du serveur.",
    }
    return messages.get(code, "Une erreur est survenue.")
