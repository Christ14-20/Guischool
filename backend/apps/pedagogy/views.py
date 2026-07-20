from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import HasPermission
from core.utils import success_response, created_response, error_response
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, AcademicPeriod, Subject, ClassSubject,
    Student, Guardian,
)
from apps.pedagogy.serializers import (
    LevelSerializer,
    ClassSerializer,
    SchoolYearSerializer,
    SchoolYearDetailSerializer,
    AcademicPeriodSerializer,
    AcademicPeriodCreateSerializer,
    SubjectSerializer,
    ClassSubjectSerializer,
    GuardianSerializer,
    StudentCreateSerializer,
    StudentDetailSerializer,
)
from apps.pedagogy.services.school_year_service import (
    set_current_school_year,
    close_period,
)
from apps.pedagogy.services.student_service import enroll_student, EnrollmentError
from apps.pedagogy.tasks import send_enrollment_confirmation_sms
from apps.monitoring.services import audit_log, get_client_ip


class SchoolYearViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/schoolyears/           — liste des années scolaires (lecture ouverte)
    POST /pedagogy/schoolyears/           — création (DIRECTOR/STUDENT_STUDIES)
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
    POST /pedagogy/school-years/{school_year_pk}/periods/  — création (DIRECTOR/STUDENT_STUDIES)
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


class ClassViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/classes/           — liste paginée des classes
    POST /pedagogy/classes/           — création (DIRECTOR/STUDENT_STUDIES)
    GET  /pedagogy/classes/{id}/      — détail d'une classe

    Filtres : ?school_year_id=...&level_id=...&search=6ème
    """

    queryset = SchoolClass.objects.all().select_related("level", "main_teacher")
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["school_year_id", "level_id"]
    search_fields = ["name"]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.tenant).order_by("name")

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("pedagogy:create:schoolyear")]
        return [IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)


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


class SubjectViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/subjects/           — liste des matières
    POST /pedagogy/subjects/           — création (DIRECTOR/STUDENT_STUDIES)
    """

    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.tenant).order_by("code")

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("pedagogy:create:schoolyear")]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)


class ClassSubjectViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /pedagogy/classes/{class_pk}/subjects/   — liste des matières d'une classe
    POST /pedagogy/classes/{class_pk}/subjects/   — ajouter une matière à une classe
    """

    queryset = ClassSubject.objects.all().select_related("subject", "teacher")
    serializer_class = ClassSubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(
            class_obj__tenant=self.request.tenant,
            class_obj_id=self.kwargs["class_pk"],
        )

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("pedagogy:create:schoolyear")]
        return [IsAuthenticated()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        class_pk = self.kwargs.get("class_pk")
        if class_pk:
            class_obj = SchoolClass.objects.filter(
                id=class_pk, tenant=self.request.tenant
            ).first()
            context["class_obj"] = class_obj
        return context

    def list(self, request, *args, **kwargs):
        class_pk = kwargs.get("class_pk")
        class_obj = SchoolClass.objects.filter(
            id=class_pk, tenant=request.tenant
        ).first()
        if not class_obj:
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        class_pk = kwargs.get("class_pk")
        class_obj = SchoolClass.objects.filter(
            id=class_pk, tenant=request.tenant
        ).first()
        if not class_obj:
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output = ClassSubjectSerializer(serializer.instance, context=self.get_serializer_context())
        return created_response(output.data)


class StudentViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    POST /students/ — inscription transactionnelle (élève + tuteur + enrollment).
    Permission : eleves:create (DIRECTOR, STUDENT_STUDIES).
    Contournement du doublon probable : ?force=true.
    """

    queryset = Student.objects.all()
    serializer_class = StudentCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasPermission("eleves:create")]
        return [IsAuthenticated()]

    def get_queryset(self):
        return self.queryset.filter(tenant=self.request.tenant)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        force = request.query_params.get("force", "").lower() == "true"

        try:
            student = enroll_student(
                tenant=request.tenant,
                created_by=request.user,
                nom=data["nom"],
                prenom=data["prenom"],
                date_naissance=data["date_naissance"],
                sexe=data["sexe"],
                lieu_naissance=data.get("lieu_naissance", ""),
                classe=serializer._classe,
                school_year=serializer._school_year,
                type_inscription=data["type_inscription"],
                guardian_data=data["guardian"],
                force=force,
            )
        except EnrollmentError as exc:
            return error_response(
                exc.message,
                status_code=exc.status_code,
                errors=exc.errors,
            )

        guardian_phone = data["guardian"]["telephone"]
        send_enrollment_confirmation_sms.delay(str(student.id), guardian_phone)

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="student.create",
            target_model="Student",
            target_id=student.id,
            ip_address=get_client_ip(request),
        )

        output = StudentDetailSerializer(student, context=self.get_serializer_context())
        return created_response(output.data)


class GuardianViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET  /students/{student_pk}/guardians/   — liste des responsables d'un élève
    POST /students/{student_pk}/guardians/   — ajouter un responsable (DIRECTOR/STUDENT_STUDIES)
    """

    queryset = Guardian.objects.all()
    serializer_class = GuardianSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(
            tenant=self.request.tenant,
            student_id=self.kwargs["student_pk"],
        )

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated(), HasPermission("eleves:create")]
        return [IsAuthenticated()]

    def _get_student_or_none(self):
        return Student.objects.filter(
            id=self.kwargs["student_pk"], tenant=self.request.tenant
        ).first()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["student"] = self._get_student_or_none()
        return context

    def list(self, request, *args, **kwargs):
        if not self._get_student_or_none():
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        if not self._get_student_or_none():
            return error_response(
                "Ressource non trouvée",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return created_response(serializer.data)
