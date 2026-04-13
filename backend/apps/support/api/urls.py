"""apps/support/api/urls.py"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.support.api.views import (
	SupportTicketViewSet,
	PublicSchoolOnboardingRequestCreateView,
	PublicSchoolOnboardingRequestStatusView,
	AdminSchoolOnboardingRequestViewSet,
)

router = DefaultRouter()
router.register("tickets", SupportTicketViewSet, basename="support-ticket")
router.register("onboarding-requests", AdminSchoolOnboardingRequestViewSet, basename="support-onboarding-request")

urlpatterns = [
	path("", include(router.urls)),
	path("public/onboarding-requests/", PublicSchoolOnboardingRequestCreateView.as_view(), name="public-onboarding-create"),
	path("public/onboarding-requests/status/", PublicSchoolOnboardingRequestStatusView.as_view(), name="public-onboarding-status"),
]
