"""apps/finance/api/urls.py"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.finance.api.views import FeeCategoryViewSet, StudentFeeViewSet, PaymentViewSet, InvoiceViewSet

router = DefaultRouter()
router.register("feecategories", FeeCategoryViewSet, basename="feecategory")
router.register("student-fees", StudentFeeViewSet, basename="student-fee")
router.register("payments", PaymentViewSet, basename="payment")
router.register("invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [path("", include(router.urls))]
