"""apps/finance/api/serializers.py"""
from rest_framework import serializers
from apps.finance.models import FeeCategory, StudentFee, Payment, Invoice


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = ["id", "tenant", "name", "type", "amount", "installments", "is_mandatory", "school_year", "created_at"]
        read_only_fields = ["id", "tenant", "created_at"]


class StudentFeeSerializer(serializers.ModelSerializer):
    fee_category_name = serializers.CharField(source="fee_category.name", read_only=True)

    class Meta:
        model = StudentFee
        fields = ["id", "student", "fee_category", "fee_category_name", "total_amount", "discount_amount", "discount_reason", "balance_due"]
        read_only_fields = ["id", "fee_category_name"]


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "tenant", "student", "student_name", "student_fee", "amount", "payment_date",
            "method", "reference", "received_by", "status", "receipt_number",
            "receipt_url", "sms_notification_sent", "created_at",
        ]
        read_only_fields = ["id", "tenant", "receipt_number", "created_at", "received_by", "sms_notification_sent", "student_name"]

    def get_student_name(self, obj):
        return f"{obj.student.nom} {obj.student.prenom}"



class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "tenant", "student", "student_name", "school_year",
            "total_due", "total_paid", "balance", "status",
            "pdf_url", "generated_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "generated_at", "student_name"]

    def get_student_name(self, obj):
        return f"{obj.student.nom} {obj.student.prenom}"
