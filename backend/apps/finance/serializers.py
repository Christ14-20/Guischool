import io
from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.template.loader import render_to_string
from .models import FeeCategory, StudentFee, Payment, ReceiptSequence


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = "__all__"
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class FeeCategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = ["school_year", "name", "type", "amount", "is_mandatory"]


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
        sy = None
        if student_fee_id:
            student_fee = StudentFee.objects.select_for_update().get(
                id=student_fee_id, tenant=tenant, student=student,
            )
            sy = student_fee.fee_category.school_year

        if sy is None:
            from apps.pedagogy.models import SchoolYear
            sy = SchoolYear.objects.filter(
                tenant=tenant, is_current=True,
            ).select_for_update().first()
            if sy is None:
                raise serializers.ValidationError(
                    "Aucune année scolaire courante trouvée pour générer le reçu."
                )

        amount = validated_data["amount"]

        if student_fee and amount > student_fee.balance_due:
            raise serializers.ValidationError(
                {"amount": "Le montant du paiement dépasse le solde dû."}
            )

        # Generate receipt number
        annee = sy.start_date.year
        seq, _ = ReceiptSequence.objects.select_for_update().get_or_create(
            tenant=tenant,
            school_year=sy,
            defaults={"last_seq": 0},
        )
        seq.last_seq += 1
        seq.save(update_fields=["last_seq", "updated_at"])
        receipt_number = f"REC-{annee}-{seq.last_seq:06d}"

        payment = Payment.objects.create(
            tenant=tenant,
            student=student,
            student_fee=student_fee,
            amount=amount,
            method=Payment.Method.CASH,
            status=Payment.Status.COMPLETED,
            receipt_number=receipt_number,
            idempotency_key=validated_data["idempotency_key"],
            received_by=request.user,
        )

        # Update balance
        if student_fee:
            student_fee.balance_due -= Decimal(str(amount))
            student_fee.save(update_fields=["balance_due", "updated_at"])

        # Generate and store receipt PDF
        pdf_buffer = io.BytesIO()
        html = render_to_string("finance/receipt.html", {"payment": payment})
        from weasyprint import HTML
        HTML(string=html).write_pdf(pdf_buffer)

        filename = f"receipts/{payment.receipt_number}.pdf"
        from django.core.files.storage import default_storage
        saved_path = default_storage.save(filename, ContentFile(pdf_buffer.getvalue()))
        payment.receipt_pdf_url = default_storage.url(saved_path)
        payment.save(update_fields=["receipt_pdf_url", "updated_at"])

        return payment
