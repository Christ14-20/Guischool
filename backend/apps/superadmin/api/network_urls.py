"""apps/superadmin/api/network_urls.py — Routes pour /api/v1/network/*"""
from django.urls import path
from apps.superadmin.api.views_network import NetworkDashboardView, NetworkSchoolsView

urlpatterns = [
    path("dashboard/", NetworkDashboardView.as_view(), name="network-dashboard"),
    path("schools/", NetworkSchoolsView.as_view(), name="network-schools"),
]
