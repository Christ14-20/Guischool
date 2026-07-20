"""
config/urls.py

Routage global de l'application.
Toutes les API sont préfixées par /api/v1/ (SETUP-01).
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

api_v1_patterns = [
    # Applications
    path("", include("apps.authentication.urls")),
    path("superadmin/", include("apps.superadmin.urls")),
    path("pedagogy/", include("apps.pedagogy.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Versioning de l'API (SETUP-01)
    path("api/v1/", include(api_v1_patterns)),

    # Documentation de l'API (drf-spectacular + Swagger UI)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

# Servir les fichiers statiques et médias en développement
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
