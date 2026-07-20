from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import HasPermission
from core.utils import success_response, created_response, error_response
from apps.pedagogy.models import Level, SchoolYear, AcademicPeriod
from apps.pedagogy.serializers import (
    LevelSerializer,
    SchoolYearSerializer,
    SchoolYearDetailSerializer,
    AcademicPeriodSerializer,
    AcademicPeriodCreateSerializer,
)
from apps.pedagogy.services.school_year_service import (
    set_current_school_year,
    close_period,
)


class SchoolYearViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/schoolyears/           — liste des années scolaires (lecture ouverte)
    POST /pedagogy/schoolyears/           — création (DIRECTOR/SECRETAIRE)
    GET  /pedagogy/schoolyears/{id}/      — détail d'une année avec ses périodes
    PATCH /pedagogy/schoolyears/{id}/set-current/ — définir l'année courante (DIRECTOR)
    """

    queryset = SchoolYear.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.tenant).order_by("-start_date")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SchoolYearDetailSerializer
        return SchoolYearSerializer

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("pedagogy:create:schoolyear")]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="set-current")
    def set_current(self, request, pk=None):
        """
        PATCH /pedagogy/schoolyears/{id}/set-current/
        Passe is_current=True sur cette année, False sur toutes les autres du tenant.
        """
        school_year = self.get_object()
        set_current_school_year(school_year)
        serializer = SchoolYearSerializer(school_year)
        return success_response(serializer.data)


class PeriodViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/school-years/{school_year_pk}/periods/  — liste des périodes
    POST /pedagogy/school-years/{school_year_pk}/periods/  — création (DIRECTOR/SECRETAIRE)
    """

    queryset = AcademicPeriod.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(school_year__tenant=self.request.tenant)

    def get_serializer_class(self):
        if self.action == "create":
            return AcademicPeriodCreateSerializer
        return AcademicPeriodSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        school_year_pk = self.kwargs.get("school_year_pk")
        if school_year_pk:
            school_year = SchoolYear.objects.filter(
                id=school_year_pk, tenant=self.request.tenant
            ).first()
            context["school_year"] = school_year
        return context

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("pedagogy:create:period")]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        school_year_pk = kwargs.get("school_year_pk")
        school_year = SchoolYear.objects.filter(
            id=school_year_pk, tenant=request.tenant
        ).first()
        if not school_year:
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        periods = self.get_queryset().filter(school_year=school_year)
        serializer = self.get_serializer(periods, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        school_year_pk = kwargs.get("school_year_pk")
        school_year = SchoolYear.objects.filter(
            id=school_year_pk, tenant=request.tenant
        ).first()
        if not school_year:
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        output = AcademicPeriodSerializer(instance, context=self.get_serializer_context())
        return created_response(output.data)

    @action(detail=True, methods=["patch"], url_path="close")
    def close(self, request, pk=None):
        """
        PATCH /pedagogy/periods/{id}/close/
        Clôture une période académique.
        TODO Épic 6 : vérifier qu'aucune évaluation n'est non verrouillée avant clôture.
        """
        period = self.get_object()
        close_period(period)
        serializer = AcademicPeriodSerializer(period)
        return success_response(serializer.data)


class LevelViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET /pedagogy/levels/ — liste des niveaux standards (non paginée, catalogue fixe)
    Filtres : ?cycle=COLLEGE
    """

    queryset = Level.objects.all()
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["cycle"]
    pagination_class = None

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.tenant)
