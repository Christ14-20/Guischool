from rest_framework import serializers
from apps.pedagogy.models import SchoolYear, AcademicPeriod
from apps.pedagogy.services.school_year_service import (
    validate_no_period_overlap,
)


class SchoolYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolYear
        fields = [
            "id",
            "label",
            "start_date",
            "end_date",
            "status",
            "is_current",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "is_current", "created_at", "updated_at"]

    def validate_label(self, value):
        if self.instance:
            qs = SchoolYear.objects.filter(
                tenant=self.context["request"].tenant, label__iexact=value
            ).exclude(id=self.instance.id)
        else:
            qs = SchoolYear.objects.filter(
                tenant=self.context["request"].tenant, label__iexact=value
            )
        if qs.exists():
            raise serializers.ValidationError(
                "Une année scolaire avec ce libellé existe déjà"
            )
        return value

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] >= attrs["end_date"]:
                raise serializers.ValidationError(
                    {"end_date": "La date de fin doit être postérieure à la date de début"}
                )
        return attrs

    def create(self, validated_data):
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)


class SchoolYearDetailSerializer(serializers.ModelSerializer):
    periods = serializers.SerializerMethodField()

    class Meta:
        model = SchoolYear
        fields = [
            "id",
            "label",
            "start_date",
            "end_date",
            "status",
            "is_current",
            "periods",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "is_current", "periods", "created_at", "updated_at"]

    def get_periods(self, obj):
        periods = obj.periods.all()
        return AcademicPeriodSerializer(periods, many=True).data


class AcademicPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            "id",
            "school_year",
            "name",
            "type",
            "start_date",
            "end_date",
            "order",
            "is_closed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_closed", "created_at", "updated_at"]


class AcademicPeriodCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            "name",
            "type",
            "start_date",
            "end_date",
            "order",
        ]

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date"):
            if attrs["start_date"] >= attrs["end_date"]:
                raise serializers.ValidationError(
                    {"end_date": "La date de fin doit être postérieure à la date de début"}
                )

        school_year = self.context["school_year"]
        validate_no_period_overlap(
            school_year,
            attrs["start_date"],
            attrs["end_date"],
            exclude_period_id=getattr(self.instance, "id", None),
        )
        return attrs

    def create(self, validated_data):
        validated_data["school_year"] = self.context["school_year"]
        validated_data["tenant"] = self.context["request"].tenant
        return super().create(validated_data)
