"""apps/finance/api/views.py"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.finance.models import FeeCategory, StudentFee, Payment, Invoice
from apps.finance.api.serializers import FeeCategorySerializer, StudentFeeSerializer, PaymentSerializer, InvoiceSerializer


class FeeCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCategorySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type", "is_mandatory", "school_year"]

    def get_queryset(self):
        return FeeCategory.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class StudentFeeViewSet(viewsets.ModelViewSet):
    serializer_class = StudentFeeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["student", "fee_category"]

    def get_queryset(self):
        return StudentFee.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["student", "method", "status", "payment_date"]
    search_fields = ["receipt_number", "reference"]
    ordering_fields = ["payment_date", "amount"]

    def get_queryset(self):
        return Payment.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        import uuid
        now = timezone.now()
        short_id = str(uuid.uuid4())[:6].upper()
        receipt_number = f"REC-{now.strftime('%Y%m%d')}-{short_id}"
        serializer.save(
            tenant=self.request.user.tenant,
            received_by=self.request.user,
            receipt_number=receipt_number
        )


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["student", "school_year", "status"]

    def get_queryset(self):
        return Invoice.objects.filter(tenant=self.request.user.tenant)

    @action(detail=True, methods=["post"], url_path="generate-pdf")
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        # TODO: Intégrer la génération PDF via Celery
        invoice.generated_at = timezone.now()
        invoice.save(update_fields=["generated_at"])
        return Response({
            "status": "success",
            "message": "Génération PDF programmée (TODO: tâche Celery).",
            "generated_at": invoice.generated_at,
        })
