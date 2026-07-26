import io
from decimal import Decimal
from datetime import date
from django.db.models import Q
from rest_framework import serializers
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.template.loader import render_to_string
from .models import FeeCategory, StudentFee, Payment, ReceiptSequence, Invoice


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = "__all__"
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class FeeCategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = ["school_year", "name", "type", "amount", "is_mandatory", "due_date"]


class StudentFeeSerializer(serializers.ModelSerializer):
    fee_category = FeeCategorySerializer(read_only=True)
    fee_category_id = serializers.UUIDField(write_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentFee
        fields = [
            "id", "student", "student_name", "fee_category", "fee_category_id",
            "total_amount", "discount_amount", "balance_due",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "student_name", "balance_due", "created_at", "updated_at"]

    def get_student_name(self, obj):
        return f"{obj.student.nom} {obj.student.prenom}"


class StudentFeeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentFee
        fields = ["student", "fee_category_id", "total_amount", "discount_amount"]

    fee_category_id = serializers.UUIDField()

    def validate(self, attrs):
        total = attrs.get("total_amount", 0)
        discount = attrs.get("discount_amount", 0)
        if discount > total:
            raise serializers.ValidationError(
                {"discount_amount": "La remise ne peut pas dépasser le montant total."}
            )
        return attrs

    def create(self, validated_data):
        fee_category_id = validated_data.pop("fee_category_id")
        validated_data["fee_category"] = FeeCategory.objects.get(id=fee_category_id)
        total = validated_data["total_amount"]
        discount = validated_data.get("discount_amount", 0)
        validated_data["balance_due"] = total - discount
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)


class PaymentListSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    fee_category_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "receipt_number", "receipt_pdf_url", "amount", "method", "status",
            "payment_date", "student_name", "fee_category_name",
        ]

    def get_student_name(self, obj):
        return f"{obj.student.nom} {obj.student.prenom}"

    def get_fee_category_name(self, obj):
        if obj.student_fee:
            return obj.student_fee.fee_category.name
        return ""


class PaymentCreateSerializer(serializers.ModelSerializer):
    student_id = serializers.UUIDField(write_only=True)
    student_fee_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Payment
        fields = ["student_id", "student_fee_id", "amount", "method", "idempotency_key"]
        extra_kwargs = {
            "idempotency_key": {"validators": []},  # DB constraint handles uniqueness; we catch IntegrityError in view
        }

    def validate_method(self, value):
        if value != Payment.Method.CASH:
            raise serializers.ValidationError(
                "Seul le paiement en espèces (CASH) est accepté sur cet endpoint."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        tenant = request.tenant
        student_id = validated_data.pop("student_id")
        student_fee_id = validated_data.pop("student_fee_id", None)

        from apps.pedagogy.models import Student
        student = Student.objects.get(id=student_id, tenant=tenant)

        student_fee = None
        if student_fee_id:
            student_fee = StudentFee.objects.select_for_update().get(
                id=student_fee_id, tenant=tenant, student=student,
            )

        amount = validated_data["amount"]

        if student_fee and amount > student_fee.balance_due:
            raise serializers.ValidationError(
                {"amount": "Le montant du paiement dépasse le solde dû."}
            )

        payment = Payment.objects.create(
            tenant=tenant,
            student=student,
            student_fee=student_fee,
            amount=amount,
            method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            idempotency_key=validated_data["idempotency_key"],
            received_by=request.user,
        )

        # Mise à jour du solde AVANT génération du reçu (pour cohérence
        # entre les deux chemins — le webhook fait de même)
        if student_fee:
            student_fee.balance_due -= Decimal(str(amount))
            student_fee.save(update_fields=["balance_due", "updated_at"])

        generate_receipt_for_payment(payment)

        return payment


def _resolve_receipt_school_year(payment):
    """
    Détermine l'année scolaire à utiliser pour la numérotation du reçu.

    Ordre de résolution :
      1. student_fee.fee_category.school_year (si la transaction est liée à un frais)
      2. SchoolYear.is_current du tenant
    """
    if payment.student_fee:
        return payment.student_fee.fee_category.school_year

    from apps.pedagogy.models import SchoolYear
    sy = SchoolYear.objects.filter(
        tenant=payment.tenant, is_current=True,
    ).first()
    return sy


def generate_receipt_for_payment(payment):
    """
    Génère un numéro de reçu et un PDF pour un paiement COMPLETED.

    Cette fonction est le point d'entrée UNIQUE pour la génération de reçu,
    utilisée à la fois par :
      - le paiement espèces (CASH, création synchrone)
      - la confirmation webhook Orange Money
      - la réconciliation nocturne

    Elle détermine l'année scolaire via _resolve_receipt_school_year(),
    génère un numéro séquentiel via ReceiptSequence, puis génère et stocke
    le PDF via WeasyPrint + default_storage.

    La fonction modifie payment.receipt_number et payment.receipt_pdf_url
    et sauvegarde le tout en base.
    """
    sy = _resolve_receipt_school_year(payment)
    if sy is None:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Impossible de générer le reçu : aucune année scolaire trouvée")
        return

    annee = sy.start_date.year
    from django.db import transaction as db_transaction
    with db_transaction.atomic():
        seq, _ = ReceiptSequence.objects.select_for_update().get_or_create(
            tenant=payment.tenant,
            school_year=sy,
            defaults={"last_seq": 0},
        )
        seq.last_seq += 1
        seq.save(update_fields=["last_seq", "updated_at"])
        receipt_number = f"REC-{annee}-{seq.last_seq:06d}"

    payment.receipt_number = receipt_number
    pdf_buffer = io.BytesIO()
    html = render_to_string("finance/receipt.html", {"payment": payment})
    from weasyprint import HTML
    HTML(string=html).write_pdf(pdf_buffer)

    filename = f"receipts/{receipt_number}.pdf"
    from django.core.files.storage import default_storage
    saved_path = default_storage.save(filename, ContentFile(pdf_buffer.getvalue()))
    payment.receipt_pdf_url = default_storage.url(saved_path)
    payment.save(update_fields=["receipt_number", "receipt_pdf_url", "updated_at"])


def sync_invoice(student, school_year):
    from .models import Invoice as InvoiceModel

    invoice, _ = InvoiceModel.objects.get_or_create(
        tenant=student.tenant,
        student=student,
        school_year=school_year,
        defaults={"total_due": 0, "total_paid": 0, "balance": 0},
    )

    due_sum = sum(
        (sf.total_amount - sf.discount_amount)
        for sf in StudentFee.objects.filter(
            student=student, fee_category__school_year=school_year,
        )
    )
    invoice.total_due = due_sum

    paid_sum = sum(
        p.amount
        for p in Payment.objects.filter(
            student=student, status=Payment.Status.COMPLETED,
        ).filter(
            Q(student_fee__fee_category__school_year=school_year)
            | Q(student_fee__isnull=True,
                payment_date__date__range=(
                    school_year.start_date, school_year.end_date
                ))
        )
    )
    invoice.total_paid = paid_sum
    invoice.balance = invoice.total_due - invoice.total_paid

    unpaid_fees = StudentFee.objects.filter(
        student=student, fee_category__school_year=school_year,
        balance_due__gt=0,
    ).select_related("fee_category")
    due_dates = [
        sf.fee_category.due_date or school_year.end_date
        for sf in unpaid_fees
    ]
    invoice.due_date = min(due_dates) if due_dates else (
        invoice.due_date or school_year.end_date
    )

    if invoice.balance == 0:
        invoice.status = InvoiceModel.Status.PAID
    elif invoice.due_date and date.today() > invoice.due_date:
        invoice.status = InvoiceModel.Status.OVERDUE
    elif invoice.total_paid > 0:
        invoice.status = InvoiceModel.Status.PARTIAL
    else:
        invoice.status = InvoiceModel.Status.PENDING

    invoice.save()
    return invoice


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    school_year_label = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "student", "student_name", "school_year", "school_year_label",
            "total_due", "total_paid", "balance", "due_date", "status",
            "pdf_url", "generated_at", "created_at", "updated_at",
        ]

    def get_student_name(self, obj):
        return f"{obj.student.nom} {obj.student.prenom}"

    def get_school_year_label(self, obj):
        return obj.school_year.label


class OrangeMoneyInitiateSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    student_fee_id = serializers.UUIDField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=0)
    payer_phone = serializers.CharField(max_length=20)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)

    def validate_payer_phone(self, value):
        if not value.startswith("+"):
            raise serializers.ValidationError(
                "Le numéro doit être au format international, ex. +224655112233."
            )
        return value


class PaymentStatusSerializer(serializers.ModelSerializer):
    new_balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ["id", "status", "receipt_number", "receipt_pdf_url",
                   "new_balance_due", "failure_reason"]

    def get_new_balance_due(self, obj):
        if obj.student_fee:
            return str(obj.student_fee.balance_due)
        return "0"
