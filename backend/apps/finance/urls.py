from django.urls import path
from . import views

urlpatterns = [
    path("feecategories/", views.FeeCategoryViewSet.as_view({
        "get": "list",
        "post": "create",
    }), name="feecategory-list"),
    path("feecategories/<uuid:pk>/", views.FeeCategoryViewSet.as_view({
        "get": "retrieve",
    }), name="feecategory-detail"),
    path("student-fees/", views.StudentFeeViewSet.as_view({
        "get": "list",
        "post": "create",
    }), name="studentfee-list"),
    path("student-fees/<uuid:pk>/", views.StudentFeeViewSet.as_view({
        "get": "retrieve",
    }), name="studentfee-detail"),
    path("payments/", views.PaymentViewSet.as_view({
        "get": "list",
        "post": "create",
    }), name="payment-list"),
    path("payments/<uuid:pk>/", views.PaymentViewSet.as_view({
        "get": "retrieve",
    }), name="payment-detail"),
    path("payments/<uuid:pk>/receipt/", views.PaymentViewSet.as_view({
        "get": "receipt",
    }), name="payment-receipt"),
]
