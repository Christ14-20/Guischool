"""apps/authentication/api/urls.py — Routes /auth/* et /users/*"""
from django.urls import path
from apps.authentication.api.views import (
    RegisterView,
    LoginView,
    LogoutView,
    TokenRefreshView,
    UserMeView,
    ChangePasswordView,
)

urlpatterns = [
    # Authentification
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    # Profil utilisateur
    path("users/me/", UserMeView.as_view(), name="users-me"),
    path("users/me/change-password/", ChangePasswordView.as_view(), name="users-change-password"),
]
