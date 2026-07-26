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
    path("payments/orange-money/initiate/", views.PaymentViewSet.as_view({
        "post": "initiate_orange_money",
    }), name="payment-om-initiate"),
    path("payments/<uuid:pk>/status/", views.PaymentViewSet.as_view({
        "get": "payment_status",
    }), name="payment-status"),
    path("invoices/", views.InvoiceViewSet.as_view({
        "get": "list",
    }), name="invoice-list"),
    path("invoices/<uuid:pk>/", views.InvoiceViewSet.as_view({
        "get": "retrieve",
    }), name="invoice-detail"),
    path("invoices/<uuid:pk>/generate-pdf/", views.InvoiceViewSet.as_view({
        "post": "generate_pdf",
    }), name="invoice-generate-pdf"),
]
