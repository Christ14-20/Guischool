"""apps/superadmin/api/settings_urls.py — Routes /api/v1/settings/*"""
from django.urls import path
from apps.superadmin.api.views_settings import TenantSettingsView

urlpatterns = [
    path("tenant/", TenantSettingsView.as_view(), name="tenant-settings"),
]
