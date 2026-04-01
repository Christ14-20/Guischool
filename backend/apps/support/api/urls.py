"""apps/support/api/urls.py"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.support.api.views import SupportTicketViewSet

router = DefaultRouter()
router.register("tickets", SupportTicketViewSet, basename="support-ticket")

urlpatterns = [path("", include(router.urls))]
