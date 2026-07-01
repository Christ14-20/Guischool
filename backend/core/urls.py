"""
core/urls.py — Centralisation des routes de l'API Eduguinée.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# Personnalisation de l'interface d'administration
admin.site.site_header = "Eduguinée 3.0 — Administration"
admin.site.site_title = "Eduguinée Admin"
admin.site.index_title = "Tableau de bord Eduguinée"

urlpatterns = [
    # Admin Django
    path("admin/", admin.site.urls),

    # API v1 — Modules groupés
    path("api/v1/", include([
        # Authentification & Users
        path("", include("apps.authentication.api.urls")),
        
        # Super Administration (Écoles/Plans)
        path("superadmin/", include("apps.superadmin.api.urls")),
        
        # Réseaux d'écoles (Tenant Networks)
        path("network/", include("apps.superadmin.api.network_urls")),

        # Configuration tenant (Directeur)
        path("settings/", include("apps.superadmin.api.settings_urls")),
        
        # Pédagogie (Années, Classes, Élèves, Notes, Décisions)
        path("", include("apps.pedagogy.api.urls")),
        
        # Finance (Frais, Paiements, Factures)
        path("finance/", include("apps.finance.api.urls")),
        
        # Monitoring
        path("monitoring/", include("apps.monitoring.api.urls")),
        
        # Support
        path("support/", include("apps.support.api.urls")),

        # Synchronisation Offline
        path("sync/", include("apps.sync.api.urls")),
    ])),

    # Documentation API (Swagger/Redoc)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
