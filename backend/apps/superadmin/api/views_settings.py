"""apps/superadmin/api/views_settings.py — GET/PATCH /settings/tenant/ (ARCH-03)."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser

from apps.authentication.permissions import IsSchoolDirector
from apps.superadmin.api.serializers_tenant_settings import TenantSettingsSerializer


class TenantSettingsView(APIView):
    """
    Configuration avancée de l'établissement courant.
    Accès réservé au Directeur (ADMIN_SCHOOL).
    """
    permission_classes = [IsSchoolDirector]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def _get_tenant(self, request):
        return request.user.tenant

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"status": "error", "message": "Aucun établissement associé à cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TenantSettingsSerializer(tenant, context={"request": request})
        return Response({"status": "success", "data": serializer.data})

    def patch(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"status": "error", "message": "Aucun établissement associé à cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TenantSettingsSerializer(
            tenant, data=request.data, partial=True, context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"status": "success", "data": serializer.data})
