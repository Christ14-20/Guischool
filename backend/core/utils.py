"""
core/utils.py

Utilitaires partagés entre toutes les apps du projet.
"""

import re
from rest_framework.response import Response
from rest_framework import status


# ── Téléphone guinéen ──────────────────────────────────────────────────────────
# Format attendu : +224XXXXXXXXX (9 chiffres après l'indicatif)
GUINEA_PHONE_REGEX = re.compile(r"^\+224[0-9]{9}$")


def is_valid_guinea_phone(phone: str) -> bool:
    """Valide un numéro de téléphone guinéen au format +224XXXXXXXXX."""
    return bool(GUINEA_PHONE_REGEX.match(phone))


# ── Réponses API standardisées ─────────────────────────────────────────────────

def success_response(data, status_code=status.HTTP_200_OK) -> Response:
    """
    Enveloppe de réponse succès standard — §0.3 contrat d'API.
    {"status": "success", "data": {...}}
    """
    return Response({"status": "success", "data": data}, status=status_code)


def created_response(data) -> Response:
    """Réponse 201 Created."""
    return success_response(data, status_code=status.HTTP_201_CREATED)


def error_response(
    message: str,
    errors: dict = None,
    status_code=status.HTTP_400_BAD_REQUEST,
) -> Response:
    """
    Enveloppe de réponse erreur standard — §0.3 contrat d'API.
    {"status": "error", "message": "...", "errors": {...}}
    Le champ "errors" est omis si None (cas 401/403/404).
    """
    payload = {"status": "error", "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status_code)
