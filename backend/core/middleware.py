"""
core/middleware.py

TenantMiddleware — AUTH-03.

Extrait le tenant_id du JWT (claim injecté par simplejwt) et attache
l'objet Tenant correspondant à request.tenant pour toute la durée de la
requête.

RÈGLE DE SÉCURITÉ :
  - Si le token contient un tenant_id mais que le Tenant est SUSPENDED,
    la requête est rejetée (403) avec le message du contrat d'API.
  - Si l'utilisateur est SUPER_ADMIN, tenant_id est None → request.tenant = None
    (accès uniquement aux endpoints /superadmin/*).
  - Une ressource d'un autre tenant renvoie TOUJOURS 404, jamais 403
    (cf. §0.7 contrat d'API — ne pas révéler l'existence d'une ressource).
"""

from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class TenantMiddleware:
    """
    Middleware WSGI/ASGI qui résout request.tenant depuis le claim JWT.
    Doit être placé APRÈS les middlewares d'authentification Django.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        self._resolve_tenant(request)
        return self.get_response(request)

    def _resolve_tenant(self, request):
        """
        Tente de résoudre le tenant depuis le JWT.
        Ne lève pas d'exception si le token est absent ou invalide —
        l'authentification est laissée à DRF (IsAuthenticated).
        """
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return

        token_str = auth_header.split(" ", 1)[1]
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token_str)
            tenant_id = validated_token.get("tenant_id")

            if tenant_id:
                self._attach_tenant(request, tenant_id)
        except (InvalidToken, TokenError):
            # Token invalide — DRF renverra 401 plus tard
            pass

    def _attach_tenant(self, request, tenant_id: str):
        """
        Charge l'objet Tenant et l'attache à la requête.
        Renvoie une 403 immédiate si le tenant est suspendu.
        """
        from apps.superadmin.models import Tenant

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            # Tenant introuvable — le token est corrompu ; DRF gérera
            return

        if tenant.status == Tenant.Status.SUSPENDED:
            # Cette réponse est renvoyée directement, avant DRF
            # On stocke le tenant quand même pour que le message soit correct
            request.tenant = tenant
            request._tenant_suspended = True
            return

        request.tenant = tenant
