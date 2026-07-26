import io
from django.http import FileResponse
from django.template.loader import render_to_string
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from core.permissions import HasPermission
from core.utils import success_response, created_response
from .models import FeeCategory, StudentFee, Payment
from .serializers import (
    FeeCategorySerializer,
    FeeCategoryCreateSerializer,
    StudentFeeSerializer,
    StudentFeeCreateSerializer,
    PaymentListSerializer,
    PaymentCreateSerializer,
)


class FeeCategoryViewSet(viewsets.ModelViewSet):
    queryset = FeeCategory.objects.none()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    filterset_fields = ["school_year", "type", "is_mandatory"]

    def get_serializer_class(self):
        if self.action == "create":
            return FeeCategoryCreateSerializer
        return FeeCategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission("finance:read")]
        return [IsAuthenticated(), HasPermission("finance:create")]

    def get_queryset(self):
        return FeeCategory.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(FeeCategorySerializer(serializer.instance).data)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return success_response(serializer.data)


class StudentFeeViewSet(viewsets.ModelViewSet):
    queryset = StudentFee.objects.none()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student"]

    def get_serializer_class(self):
        if self.action == "create":
            return StudentFeeCreateSerializer
        return StudentFeeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission("finance:read")]
        return [IsAuthenticated(), HasPermission("finance:create")]

    def get_queryset(self):
        return StudentFee.objects.filter(
            tenant=self.request.tenant
        ).select_related("student", "fee_category")

    def perform_create(self, serializer):
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(StudentFeeSerializer(serializer.instance).data)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return success_response(serializer.data)


class PaymentViewSet(viewsets.GenericViewSet):
    queryset = Payment.objects.none()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "method", "status"]

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        return PaymentListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasPermission("finance:create")]
        return [IsAuthenticated(), HasPermission("finance:read")]

    def get_queryset(self):
        return Payment.objects.filter(tenant=self.request.tenant)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except IntegrityError:
            existing = Payment.objects.filter(
                idempotency_key=request.data.get("idempotency_key", ""),
                tenant=request.tenant,
            ).first()
            if existing:
                return Response(
                    {"message": "Ce paiement a déjà été enregistré (clé d'idempotence déjà utilisée)",
                     "existing_payment_id": str(existing.id)},
                    status=status.HTTP_409_CONFLICT,
                )
            raise
        payment = serializer.instance
        return created_response(PaymentListSerializer(payment).data)

    def perform_create(self, serializer):
        serializer.save()

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return success_response(serializer.data)

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        payment = self.get_object()
        if payment.status != Payment.Status.COMPLETED:
            return success_response(
                {"message": "Le reçu n'est disponible que pour les paiements complétés."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        html = render_to_string("finance/receipt.html", {"payment": payment})
        pdf_buffer = io.BytesIO()
        from weasyprint import HTML
        HTML(string=html).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        filename = f"recu_{payment.receipt_number}.pdf"
        return FileResponse(pdf_buffer, as_attachment=True, filename=filename)
