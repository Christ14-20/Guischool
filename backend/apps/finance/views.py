import hashlib
import io
import json
import logging
import time
import uuid

from django.http import FileResponse, JsonResponse
from django.template.loader import render_to_string
from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from core.permissions import HasPermission
from core.utils import success_response, created_response
from .models import FeeCategory, StudentFee, Payment, OrangeMoneyTransaction, Invoice
from .providers.orange_money import OrangeMoneyProvider
from .providers.base import ProviderNetworkError, retry_with_backoff
from .serializers import (
    FeeCategorySerializer,
    FeeCategoryCreateSerializer,
    StudentFeeSerializer,
    StudentFeeCreateSerializer,
    PaymentListSerializer,
    PaymentCreateSerializer,
    OrangeMoneyInitiateSerializer,
    PaymentStatusSerializer,
    InvoiceSerializer,
    generate_receipt_for_payment,
    sync_invoice,
)

logger = logging.getLogger(__name__)


def get_provider():
    return OrangeMoneyProvider()


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
        instance = serializer.save()
        sync_invoice(instance.student, instance.fee_category.school_year)

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
        school_year = (
            payment.student_fee.fee_category.school_year
            if payment.student_fee
            else payment.student.annee_inscription
        )
        if school_year:
            sync_invoice(payment.student, school_year)
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

        return FileResponse(pdf_buffer, as_attachment=True,
                            filename=f"recu_{payment.receipt_number}.pdf")

    @action(detail=False, methods=["post"], url_path="orange-money/initiate")
    def initiate_orange_money(self, request):
        serializer = OrangeMoneyInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tenant = request.tenant
        student_id = serializer.validated_data["student_id"]
        student_fee_id = serializer.validated_data.get("student_fee_id")
        amount = serializer.validated_data["amount"]
        payer_phone = serializer.validated_data["payer_phone"]

        from apps.pedagogy.models import Student
        student = Student.objects.get(id=student_id, tenant=tenant)

        student_fee = None
        if student_fee_id:
            student_fee = StudentFee.objects.select_for_update().get(
                id=student_fee_id, tenant=tenant, student=student,
            )
            if amount > student_fee.balance_due:
                return Response(
                    {"status": "error", "message": "Le montant dépasse le solde dû."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Initier via le provider
        provider = get_provider()
        idempotency_key = serializer.validated_data.get("idempotency_key") or (
            hashlib.sha256(
                f"{tenant.id}:{student_id}:{amount}:{payer_phone}:{time.strftime('%Y-%m-%d')}".encode()
            ).hexdigest()
        )

        try:
            result = retry_with_backoff(
                lambda: provider.initiate_payment(
                    tenant, int(amount), payer_phone, idempotency_key,
                ),
                max_attempts=3,
                base_delay=1,
            )
        except ProviderNetworkError:
            logger.error("OM initiate failed after retries")
            return Response(
                {"status": "error",
                 "message": "Le service Orange Money est temporairement indisponible. Veuillez réessayer."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        provider_txn_id = result["provider_transaction_id"]

        try:
            with db_transaction.atomic():
                payment = Payment.objects.create(
                    tenant=tenant,
                    student=student,
                    student_fee=student_fee,
                    amount=amount,
                    method=Payment.Method.ORANGE_MONEY,
                    status=Payment.Status.PENDING,
                    idempotency_key=idempotency_key,
                    received_by=request.user,
                )
                OrangeMoneyTransaction.objects.create(
                    tenant=tenant,
                    payment=payment,
                    provider_transaction_id=provider_txn_id,
                    provider_status=OrangeMoneyTransaction.Status.INITIATED,
                )
        except IntegrityError:
            existing = Payment.objects.filter(
                idempotency_key=idempotency_key, tenant=tenant,
            ).first()
            if existing:
                return Response(
                    {"status": "error",
                     "message": "Ce paiement a déjà été initié (clé d'idempotence déjà utilisée).",
                     "existing_payment_id": str(existing.id)},
                    status=status.HTTP_409_CONFLICT,
                )
            raise

        return Response(
            {
                "status": "success",
                "data": {
                    "payment_id": str(payment.id),
                    "status": "PENDING",
                    "provider_transaction_id": provider_txn_id,
                    "message": (
                        f"Une notification a été envoyée sur le téléphone {payer_phone}. "
                        "Le parent doit valider le paiement dans son application Orange Money."
                    ),
                    "poll_url": f"/finance/payments/{payment.id}/status/",
                },
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="status")
    def payment_status(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentStatusSerializer(payment)
        return success_response(serializer.data)


class InvoiceViewSet(viewsets.GenericViewSet):
    queryset = Invoice.objects.none()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "status", "school_year"]

    def get_serializer_class(self):
        return InvoiceSerializer

    def get_permissions(self):
        if self.action == "generate_pdf":
            return [IsAuthenticated(), HasPermission("finance:update")]
        return [IsAuthenticated(), HasPermission("finance:read")]

    def get_queryset(self):
        return Invoice.objects.filter(
            tenant=self.request.tenant
        ).select_related("student", "school_year")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return success_response(serializer.data)

    @action(detail=True, methods=["post"], url_path="generate-pdf")
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()

        from .tasks import generate_invoice_pdf
        task = generate_invoice_pdf.delay(str(invoice.id))

        return Response(
            {"task_id": task.id, "status": "PENDING"},
            status=status.HTTP_202_ACCEPTED,
        )


# Exempté de JWT/TenantMiddleware : Orange ne connaît pas nos tenants.
# L'authenticité repose sur HMAC (X-Orange-Signature).
@csrf_exempt
@require_http_methods(["POST"])
def orange_money_webhook(request):
    """
    Webhook Orange Money — appelé par Orange Money lors d'une confirmation de paiement.

    ⚠  Aucun JWT requis : la vérification d'authenticité repose uniquement
       sur la signature HMAC (header X-Orange-Signature).
       L'endpoint est exempté du TenantMiddleware (pas de JWT).
       Le tenant est déduit via la chaîne :
         provider_transaction_id → OrangeMoneyTransaction → Payment → tenant.

    ⚠  HYPOTHÈSE MVP — ALGORITHME HMAC NON CONFIRMÉ
       Voir apps/finance/providers/orange_money.py pour les détails.
    """
    raw_body = request.body
    signature = request.META.get("HTTP_X_ORANGE_SIGNATURE", "")

    provider = get_provider()

    if not provider.verify_webhook(raw_body, signature):
        logger.warning("OM webhook rejeté : signature invalide")
        return JsonResponse({"received": False}, status=401)

    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError:
        return JsonResponse({"received": False}, status=400)

    transaction_id = data.get("transaction_id", "")
    webhook_status = data.get("status", "")

    if not transaction_id:
        return JsonResponse({"received": False}, status=400)

    try:
        om_txn = OrangeMoneyTransaction.objects.select_related(
            "payment__student_fee__fee_category__school_year",
            "payment__student",
        ).get(provider_transaction_id=transaction_id)
    except OrangeMoneyTransaction.DoesNotExist:
        logger.warning("OM webhook : transaction inconnue %s", transaction_id)
        return JsonResponse({"received": True})

    payment = om_txn.payment

    om_txn.raw_webhook_payload = data

    if webhook_status == "SUCCESS":
        # Éviter le double traitement
        if payment.status == Payment.Status.COMPLETED:
            return JsonResponse({"received": True})

        om_txn.provider_status = OrangeMoneyTransaction.Status.CONFIRMED
        om_txn.save(update_fields=["provider_status", "raw_webhook_payload", "updated_at"])

        payment.status = Payment.Status.COMPLETED
        payment.reference = transaction_id
        payment.save(update_fields=["status", "reference", "updated_at"])

        # Balance update AVANT generate_receipt (cohérent avec le chemin CASH)
        if payment.student_fee:
            from decimal import Decimal

            payment.student_fee.balance_due -= Decimal(str(payment.amount))
            payment.student_fee.save(update_fields=["balance_due", "updated_at"])

        generate_receipt_for_payment(payment)

        school_year = (
            payment.student_fee.fee_category.school_year
            if payment.student_fee
            else None
        )
        if school_year:
            sync_invoice(payment.student, school_year)

        logger.info("OM paiement confirmé — %s (%s)", payment.receipt_number, transaction_id)
    else:
        if payment.status == Payment.Status.FAILED:
            return JsonResponse({"received": True})

        om_txn.provider_status = OrangeMoneyTransaction.Status.FAILED
        om_txn.save(update_fields=["provider_status", "raw_webhook_payload", "updated_at"])

        payment.status = Payment.Status.FAILED
        payment.failure_reason = data.get("failure_reason", "Paiement rejeté par Orange Money")
        payment.save(update_fields=["status", "failure_reason", "updated_at"])

        logger.info("OM paiement échoué — %s", transaction_id)

    return JsonResponse({"received": True})
