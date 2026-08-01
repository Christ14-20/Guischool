"""
apps/authentication/urls.py — AUTH-02

Routes de l'app authentication montées sous /api/v1/ dans config/urls.py.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, RefreshView, LogoutView, MeView,
    PermissionsMeView, PermissionsCatalogView, TeachersListView, ChangePasswordView,
    StaffViewSet,
)

router = DefaultRouter()
router.register(r"auth/staff", StaffViewSet, basename="staff")

urlpatterns = [
    # Auth endpoints
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/permissions/me/", PermissionsMeView.as_view(), name="auth-permissions-me"),
    path("auth/permissions/catalog/", PermissionsCatalogView.as_view(), name="auth-permissions-catalog"),

    # User endpoints
    path("users/me/", MeView.as_view(), name="users-me"),
    path("auth/teachers/", TeachersListView.as_view(), name="auth-teachers"),

    # Staff endpoints (STAFF-MVP-02)
    path("", include(router.urls)),
]
