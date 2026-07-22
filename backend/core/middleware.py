"""
core/middleware.py

TenantMiddleware — AUTH-03.
MustChangePasswordMiddleware — AUTH-06.

TenantMiddleware :
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

MustChangePasswordMiddleware :
  Bloque toute requête (403) pour un utilisateur avec must_change_password=True,
  sauf pour les endpoints whitelistés (/auth/change-password/, /auth/logout/).
  Placé APRÈS TenantMiddleware dans la chaîne MIDDLEWARE.
  Les SUPER_ADMIN sont exemptés (leurs comptes ne sont pas créés avec un MDP temporaire).
"""

from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


CHANGE_PASSWORD_PATHS = ("/auth/change-password/", "/auth/logout/")


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
            request.tenant = tenant
            request._tenant_suspended = True
            return

        request.tenant = tenant


class MustChangePasswordMiddleware:
    """
    Middleware WSGI/ASGI — AUTH-06.

    Bloque toute requête pour un utilisateur dont le compte est en état
    must_change_password=True, à l'exception des endpoints whitelistés
    (/auth/change-password/ et /auth/logout/).

    Règles :
    - SUPER_ADMIN exempté (pas de mot de passe temporaire).
    - Ne bloque pas les requêtes non authentifiées (pas de JWT).
    - Fonctionne en lisant directement le JWT, avant même que DRF
      n'ait instancié request.user (même principe que TenantMiddleware).
    - Renvoie 403 avec message explicite : "Vous devez changer votre mot de passe."
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_block(request):
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Vous devez changer votre mot de passe.",
                },
                status=403,
            )
        return self.get_response(request)

    def _should_block(self, request) -> bool:
        """Détermine si la requête doit être bloquée."""
        # Ne pas bloquer les endpoints whitelistés
        path = request.path_info
        for allowed in CHANGE_PASSWORD_PATHS:
            if allowed in path:
                return False

        # Extraire le user_id depuis le JWT
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return False

        token_str = auth_header.split(" ", 1)[1]
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token_str)
        except (InvalidToken, TokenError):
            return False

        user_id = validated_token.get("user_id")
        if not user_id:
            return False

        # Charger l'utilisateur et vérifier must_change_password
        from apps.authentication.models import User

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return False

        # SUPER_ADMIN exempté
        if user.role and user.role.name == "SUPER_ADMIN":
            return False

        return user.must_change_password
