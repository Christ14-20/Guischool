from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from core.permissions import HasPermission
from core.pagination import StandardPagination
from core.utils import success_response, created_response, error_response
from apps.pedagogy.models import (
    Level, SchoolClass, SchoolYear, AcademicPeriod, Subject, ClassSubject,
    Student, Guardian, Attendance, Evaluation, Grade, YearEndDecision,
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
    StudentListSerializer,
    StudentUpdateSerializer,
    ReinscriptionSerializer,
    ArchiverSerializer,
    EnrollmentNestedSerializer,
    AttendanceBatchSerializer,
    AttendanceSerializer,
    AttendanceUpdateSerializer,
    AttendanceJustifySerializer,
    EvaluationSerializer,
    EvaluationCreateSerializer,
    BulkGradeSerializer,
    GradeItemSerializer,
    GradeSerializer,
    GradeModifySerializer,
    YearEndDecisionSerializer,
    PromotionsBulkSerializer,
)
from apps.pedagogy.services.school_year_service import (
    set_current_school_year,
    close_period,
)
from apps.pedagogy.services.student_service import (
    enroll_student,
    reinscribe_student,
    archive_student,
    EnrollmentError,
)
from apps.pedagogy.services.attendance_service import (
    create_batch_attendance,
    update_attendance_record,
    justify_attendance,
    AttendanceError,
)
from apps.pedagogy.tasks import (
    send_enrollment_confirmation_sms,
    send_absence_notification_sms,
    generate_bulletin_pdf,
)
from apps.pedagogy.services.grade_service import (
    compute_student_moyenne,
    compute_class_classement,
    arrondi_academique,
)
from apps.monitoring.services import audit_log, get_client_ip
from django_celery_results.models import TaskResult


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

    @action(detail=True, methods=["get"])
    def classement(self, request, pk=None):
        school_class = self.get_object()
        period_id = request.query_params.get("period_id")
        if not period_id:
            return error_response(
                "Le paramètre period_id est requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        from apps.pedagogy.models import AcademicPeriod
        period = AcademicPeriod.objects.filter(
            id=period_id, tenant=request.tenant
        ).first()
        if period is None:
            return error_response(
                "Période non trouvée.", status_code=status.HTTP_404_NOT_FOUND
            )

        classement = compute_class_classement(school_class, period)
        data = {
            "classe_id": str(school_class.id),
            "period_id": str(period.id),
            "classement": classement,
        }
        return success_response(data)


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
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    /students/ — gestion des élèves (Épic 4).

    - POST   /students/                    inscription transactionnelle (eleves:create)
    - GET    /students/                    liste paginée + filtres (eleves:read)
    - GET    /students/{id}/               détail (eleves:read)
    - PATCH  /students/{id}/               modification partielle (eleves:update)
    - POST   /students/{id}/reinscription/ réinscription (eleves:update)
    - POST   /students/{id}/archiver/      archivage (eleves:update)

    Contournement du doublon probable à l'inscription : ?force=true.
    """

    queryset = Student.objects.all()
    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasPermission("eleves:create")]
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission("eleves:read")]
        if self.action in ("moyenne", "bulletin"):
            return [IsAuthenticated(), HasPermission("notes:read")]
        return [IsAuthenticated(), HasPermission("eleves:update")]

    def get_serializer_class(self):
        if self.action == "list":
            return StudentListSerializer
        if self.action == "partial_update":
            return StudentUpdateSerializer
        if self.action == "create":
            return StudentCreateSerializer
        return StudentDetailSerializer

    def get_queryset(self):
        qs = (
            Student.objects.filter(tenant=self.request.tenant)
            .select_related("classe_actuelle")
            .prefetch_related("guardians")
            .order_by("nom", "prenom")
        )

        params = self.request.query_params
        classe_id = params.get("classe_id")
        if classe_id:
            qs = qs.filter(classe_actuelle_id=classe_id)

        statut = params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)

        school_year_id = params.get("school_year_id")
        if school_year_id:
            qs = qs.filter(enrollments__school_year_id=school_year_id).distinct()

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(prenom__icontains=search)
                | Q(matricule__icontains=search)
            )

        return qs

    def _get_object_or_404(self):
        student = (
            Student.objects.filter(id=self.kwargs["pk"], tenant=self.request.tenant)
            .select_related("classe_actuelle")
            .prefetch_related("guardians", "enrollments__classe", "enrollments__school_year")
            .first()
        )
        return student

    def retrieve(self, request, *args, **kwargs):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )
        serializer = StudentDetailSerializer(
            student, context=self.get_serializer_context()
        )
        return success_response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )
        serializer = StudentUpdateSerializer(
            student, data=request.data, partial=True,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="student.update",
            target_model="Student",
            target_id=student.id,
            ip_address=get_client_ip(request),
        )

        output = StudentDetailSerializer(
            student, context=self.get_serializer_context()
        )
        return success_response(output.data)

    @action(detail=True, methods=["post"])
    def reinscription(self, request, *args, **kwargs):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )

        serializer = ReinscriptionSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)

        try:
            enrollment = reinscribe_student(
                student=student,
                classe=serializer._classe,
                school_year=serializer._school_year,
                created_by=request.user,
            )
        except EnrollmentError as exc:
            return error_response(
                exc.message, status_code=exc.status_code, errors=exc.errors
            )

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="student.reinscription",
            target_model="Enrollment",
            target_id=enrollment.id,
            ip_address=get_client_ip(request),
        )

        output = EnrollmentNestedSerializer(
            enrollment, context=self.get_serializer_context()
        )
        return created_response(output.data)

    @action(detail=True, methods=["post"])
    def archiver(self, request, *args, **kwargs):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )

        serializer = ArchiverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        archive_student(student)

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="student.archive",
            target_model="Student",
            target_id=student.id,
            extra={"motif": serializer.validated_data["motif"]},
            ip_address=get_client_ip(request),
        )

        return success_response({"id": str(student.id), "statut": student.statut})

    @action(detail=True, methods=["get"])
    def moyenne(self, request, pk=None):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )
        period_id = request.query_params.get("period_id")
        if not period_id:
            return error_response(
                "Le paramètre period_id est requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        from apps.pedagogy.models import AcademicPeriod
        period = AcademicPeriod.objects.filter(
            id=period_id, tenant=request.tenant
        ).first()
        if period is None:
            return error_response(
                "Période non trouvée.", status_code=status.HTTP_404_NOT_FOUND
            )

        result = compute_student_moyenne(student, period)

        par_matiere = []
        for item in result["par_matiere"]:
            par_matiere.append({
                "subject": item["subject_name"],
                "moyenne": str(arrondi_academique(item["moyenne"])),
                "coefficient": str(item["coefficient"]),
            })

        data = {
            "student_id": str(student.id),
            "period_id": str(period.id),
            "moyenne_generale": (
                str(arrondi_academique(result["moyenne_generale"]))
                if result["moyenne_generale"] is not None else None
            ),
            "mention": result["mention"],
            "par_matiere": par_matiere,
        }
        return success_response(data)

    @action(detail=True, methods=["post"])
    def bulletin(self, request, pk=None):
        student = self._get_object_or_404()
        if student is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )
        period_id = request.data.get("period_id") or request.query_params.get("period_id")
        if not period_id:
            return error_response(
                "Le paramètre period_id est requis.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        from apps.pedagogy.models import AcademicPeriod
        period = AcademicPeriod.objects.filter(
            id=period_id, tenant=request.tenant
        ).first()
        if period is None:
            return error_response(
                "Période non trouvée.", status_code=status.HTTP_404_NOT_FOUND
            )

        task = generate_bulletin_pdf.delay(str(student.id), str(period.id))
        return success_response(
            {"task_id": task.id, "status": "processing"},
            status_code=status.HTTP_202_ACCEPTED,
        )

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


class AttendanceViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    /pedagogy/attendances/ — saisie et consultation des présences (Épic 5).

    - POST  /pedagogy/attendances/         saisie en lot d'une classe/date (attendance:create)
    - GET   /pedagogy/attendances/         liste filtrée (lecture ouverte, authentifié)
    - PATCH /pedagogy/attendances/{id}/    correction d'une présence (attendance:create)

    Le PATCH générique est un ajout hors contrat original (cf. §10) résolvant
    l'incohérence du message 409 qui invite à « Utiliser PATCH ».
    """

    queryset = Attendance.objects.all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("create", "partial_update"):
            return [IsAuthenticated(), HasPermission("attendance:create")]
        if self.action == "justify":
            return [IsAuthenticated(), HasPermission("attendance:justify")]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Attendance.objects.filter(tenant=self.request.tenant).order_by(
            "-date", "student__nom", "student__prenom"
        )
        params = self.request.query_params

        classe_id = params.get("classe_id")
        if classe_id:
            qs = qs.filter(classe_id=classe_id)

        student_id = params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)

        date = params.get("date")
        if date:
            qs = qs.filter(date=date)

        date_from = params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def list(self, request, *args, **kwargs):
        serializer = AttendanceSerializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = AttendanceBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        classe = SchoolClass.objects.filter(
            id=data["classe_id"], tenant=request.tenant
        ).first()
        if classe is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )

        try:
            created, sms_queued_for = create_batch_attendance(
                tenant=request.tenant,
                classe=classe,
                date=data["date"],
                records=data["records"],
                created_by=request.user,
            )
        except AttendanceError as exc:
            return error_response(
                exc.message, status_code=exc.status_code, errors=exc.errors
            )

        for student_id in sms_queued_for:
            student = next(
                a.student for a in created if str(a.student_id) == student_id
            )
            guardian = (
                student.guardians.filter(is_contact_urgence=True).first()
                or student.guardians.first()
            )
            send_absence_notification_sms.delay(student_id, guardian.telephone)

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="attendance.create",
            target_model="SchoolClass",
            target_id=classe.id,
            extra={"date": str(data["date"]), "created_count": len(created)},
            ip_address=get_client_ip(request),
        )

        return created_response(
            {
                "classe_id": str(classe.id),
                "date": str(data["date"]),
                "created_count": len(created),
                "sms_queued_for": sms_queued_for,
            }
        )

    def _get_object_or_none(self):
        return Attendance.objects.filter(
            id=self.kwargs["pk"], tenant=self.request.tenant
        ).first()

    def partial_update(self, request, *args, **kwargs):
        attendance = self._get_object_or_none()
        if attendance is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )

        serializer = AttendanceUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            update_attendance_record(
                attendance=attendance,
                status=data.get("status"),
                minutes_late=data["minutes_late"] if "minutes_late" in data else ...,
            )
        except AttendanceError as exc:
            return error_response(
                exc.message, status_code=exc.status_code, errors=exc.errors
            )

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="attendance.update",
            target_model="Attendance",
            target_id=attendance.id,
            ip_address=get_client_ip(request),
        )

        return success_response(AttendanceSerializer(attendance).data)

    @action(detail=True, methods=["patch"])
    def justify(self, request, *args, **kwargs):
        attendance = self._get_object_or_none()
        if attendance is None:
            return error_response(
                "Ressource non trouvée", status_code=status.HTTP_404_NOT_FOUND
            )

        serializer = AttendanceJustifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            justify_attendance(
                attendance=attendance,
                justification_text=serializer.validated_data["justification_text"],
            )
        except AttendanceError as exc:
            return error_response(
                exc.message, status_code=exc.status_code, errors=exc.errors
            )

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="attendance.justify",
            target_model="Attendance",
            target_id=attendance.id,
            ip_address=get_client_ip(request),
        )

        return success_response(
            {"id": str(attendance.id), "status": attendance.status}
        )


class EvaluationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    /pedagogy/evaluations/ — gestion des évaluations (Épic 6).

    - POST   /pedagogy/evaluations/                         créer une évaluation
    - GET    /pedagogy/evaluations/                         lister les évaluations (filtrable par classe/période)
    - GET    /pedagogy/evaluations/{id}/                    détail d'une évaluation
    - PATCH  /pedagogy/evaluations/{id}/lock/               verrouiller (notes:lock)
    """

    queryset = Evaluation.objects.all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasPermission("notes:create:evaluation")]
        if self.action == "lock":
            return [IsAuthenticated(), HasPermission("notes:lock")]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return EvaluationCreateSerializer
        return EvaluationSerializer

    def get_queryset(self):
        qs = Evaluation.objects.filter(tenant=self.request.tenant).order_by("-date", "-created_at")
        params = self.request.query_params
        classe_id = params.get("classe_id")
        if classe_id:
            qs = qs.filter(class_obj_id=classe_id)
        period_id = params.get("period_id")
        if period_id:
            qs = qs.filter(period_id=period_id)
        return qs.select_related("class_obj", "subject", "period", "teacher")

    def perform_create(self, serializer):
        self._check_teacher_scope(serializer)
        serializer.save(tenant=self.request.tenant, teacher=self.request.user)

    def _check_teacher_scope(self, serializer):
        user = self.request.user
        if user.role.name != "TEACHER":
            return
        class_id = serializer.validated_data.get("class_obj").id
        subject_id = serializer.validated_data.get("subject").id
        assigned = ClassSubject.objects.filter(
            class_obj_id=class_id,
            subject_id=subject_id,
            teacher=user,
        ).exists()
        if not assigned:
            raise PermissionError("Vous ne pouvez créer une évaluation que pour vos propres matières.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except PermissionError as e:
            return error_response(str(e), status_code=status.HTTP_403_FORBIDDEN)
        return created_response(EvaluationSerializer(serializer.instance, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["patch"])
    def lock(self, request, pk=None):
        evaluation = self.get_object()
        if evaluation.is_locked:
            return error_response(
                "L'évaluation est déjà verrouillée.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        missing_count = self._count_students_without_grades(evaluation)
        if missing_count > 0:
            return error_response(
                f"Impossible de verrouiller : {missing_count} élève(s) n'ont pas encore de note saisie",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        return success_response(
            {"id": str(evaluation.id), "is_locked": True}
        )

    def _count_students_without_grades(self, evaluation) -> int:
        enrolled = (
            Student.objects.filter(
                classe_actuelle=evaluation.class_obj,
                tenant=self.request.tenant,
                statut=Student.Status.ACTIF,
            ).count()
        )
        graded = Grade.objects.filter(evaluation=evaluation).count()
        return max(0, enrolled - graded)


class GradeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Endpoints pour les notes (Épic 6).

    - POST   /pedagogy/grades/bulk/                           saisie en masse
    - GET    /pedagogy/grades/                                lister les notes (filtrable par évaluation)
    - GET    /pedagogy/grades/{id}/                           détail d'une note
    - POST   /pedagogy/grades/{id}/valider/                   valider une note (notes:validate — DIRECTOR)
    - PATCH  /pedagogy/grades/{id}/modifier-apres-validation/ corriger (DIRECTOR + justification)
    """

    queryset = Grade.objects.all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("valider", "modifier_apres_validation"):
            return [IsAuthenticated(), HasPermission("notes:validate")]
        if self.action == "bulk":
            return [IsAuthenticated(), HasPermission("notes:create:evaluation")]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "bulk":
            return BulkGradeSerializer
        if self.action in ("valider", "modifier_apres_validation"):
            return GradeModifySerializer
        return GradeSerializer

    def get_queryset(self):
        qs = Grade.objects.filter(tenant=self.request.tenant).order_by(
            "student__nom", "student__prenom"
        )
        params = self.request.query_params
        evaluation_id = params.get("evaluation_id")
        if evaluation_id:
            qs = qs.filter(evaluation_id=evaluation_id)
        student_id = params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.select_related("student", "evaluation", "validated_by", "created_by")

    @action(detail=False, methods=["post"])
    def bulk(self, request, *args, **kwargs):
        serializer = BulkGradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        evaluation = self._get_evaluation_or_404(data["evaluation_id"])
        if evaluation.is_locked:
            return error_response(
                "L'évaluation est verrouillée : impossible d'ajouter ou de modifier des notes.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        created_count = 0
        warnings = []
        scores = []
        for item in data["grades"]:
            try:
                grade = Grade.objects.create(
                    tenant=self.request.tenant,
                    evaluation=evaluation,
                    student_id=item["student_id"],
                    score=item.get("score"),
                    is_absent=item.get("is_absent", False),
                    created_by=request.user,
                )
                created_count += 1
                if grade.note_convertie is not None:
                    scores.append(float(grade.note_convertie))
            except Exception as exc:
                warnings.append({
                    "student_id": str(item["student_id"]),
                    "message": str(exc),
                })

        stats = {}
        if scores:
            n = len(scores)
            sorted_scores = sorted(scores)
            stats["moyenne"] = round(sum(scores) / n, 2)
            if n % 2 == 1:
                stats["mediane"] = float(sorted_scores[n // 2])
            else:
                mid = n // 2
                stats["mediane"] = round((sorted_scores[mid - 1] + sorted_scores[mid]) / 2, 2)
            mean = sum(scores) / n
            variance = sum((s - mean) ** 2 for s in scores) / n
            stats["ecart_type"] = round(variance ** 0.5, 2)

        return created_response({
            "created_count": created_count,
            "warnings": warnings,
            "stats": stats,
        })

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        grade = self.get_object()
        if not grade.evaluation.is_locked:
            return error_response(
                "L'évaluation doit être verrouillée avant de pouvoir valider les notes.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if grade.is_validated:
            return error_response(
                "Cette note est déjà validée.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        grade.is_validated = True
        grade.validated_by = request.user
        grade.validated_at = timezone.now()
        grade.save(update_fields=["is_validated", "validated_by", "validated_at"])

        self._update_evaluation_published_status(grade.evaluation)

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="notes:validate",
            target_model="Grade",
            target_id=grade.id,
            ip_address=get_client_ip(request),
        )
        return success_response({
            "id": str(grade.id),
            "is_validated": True,
            "validated_at": grade.validated_at.isoformat(),
        })

    @action(detail=True, methods=["patch"])
    def modifier_apres_validation(self, request, pk=None):
        grade = self.get_object()
        if not grade.is_validated:
            return error_response(
                "Cette note n'est pas encore validée. Utilisez PATCH /pedagogy/grades/{id}/ pour la modifier.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GradeModifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        justification = serializer.validated_data.get("justification")

        old_score = grade.score
        old_is_absent = grade.is_absent
        old_comment = grade.comment

        if "score" in serializer.validated_data:
            grade.score = serializer.validated_data["score"]
        if "is_absent" in serializer.validated_data:
            grade.is_absent = serializer.validated_data["is_absent"]
        if "comment" in serializer.validated_data:
            grade.comment = serializer.validated_data["comment"]

        grade.is_validated = False
        grade.validated_by = None
        grade.validated_at = None
        grade.save()

        self._update_evaluation_published_status(grade.evaluation)

        audit_log(
            user=request.user,
            tenant=request.tenant,
            action="notes:modify-after-validation",
            target_model="Grade",
            target_id=grade.id,
            extra={
                "justification": justification,
                "old_score": str(old_score) if old_score else None,
                "new_score": str(grade.score) if grade.score else None,
                "old_is_absent": old_is_absent,
                "new_is_absent": grade.is_absent,
            },
            ip_address=get_client_ip(request),
        )
        return success_response(GradeSerializer(grade, context=self.get_serializer_context()).data)

    def _get_evaluation_or_404(self, evaluation_id):
        evaluation = Evaluation.objects.filter(
            id=evaluation_id, tenant=self.request.tenant
        ).first()
        if evaluation is None:
            from rest_framework.exceptions import NotFound
            raise NotFound("Évaluation non trouvée.")
        return evaluation

    @staticmethod
    def _update_evaluation_published_status(evaluation):
        all_validated = not Grade.objects.filter(
            evaluation=evaluation,
            is_validated=False,
        ).exists()
        if evaluation.is_published != all_validated:
            evaluation.is_published = all_validated
            evaluation.save(update_fields=["is_published"])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_status(request, task_id):
    try:
        result = TaskResult.objects.get(task_id=task_id)
    except TaskResult.DoesNotExist:
        return error_response(
            "Tâche non trouvée.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    data = {
        "task_id": result.task_id,
        "status": result.status,
        "result": result.result,
        "date_done": result.date_done.isoformat() if result.date_done else None,
    }
    return success_response(data)


class YearEndDecisionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = YearEndDecision.objects.all()
    serializer_class = YearEndDecisionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), HasPermission("notes:validate")]
        return [IsAuthenticated(), HasPermission("notes:read")]

    def get_serializer_class(self):
        if self.action == "create":
            return YearEndDecisionSerializer
        return YearEndDecisionSerializer

    def get_queryset(self):
        qs = YearEndDecision.objects.filter(tenant=self.request.tenant)
        school_year_id = self.request.query_params.get("school_year_id")
        if school_year_id:
            qs = qs.filter(school_year_id=school_year_id)
        student_id = self.request.query_params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.select_related("student", "school_year", "classe_origine", "classe_destination", "prise_par")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.validated_data.get("student")
        school_year = serializer.validated_data.get("school_year")
        if student and student.tenant_id != request.tenant.pk:
            return error_response(
                "Élève non trouvé.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if school_year and school_year.tenant_id != request.tenant.pk:
            return error_response(
                "Année scolaire non trouvée.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        self.perform_create(serializer)
        return created_response(
            YearEndDecisionSerializer(serializer.instance, context=self.get_serializer_context()).data
        )

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, prise_par=self.request.user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def promotions_bulk(request):
    if not request.user.can("notes:validate"):
        return error_response(
            "Vous n'avez pas la permission de valider les notes.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    serializer = PromotionsBulkSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    classe_origine_id = serializer.validated_data["classe_origine_id"]
    school_year_cible_id = serializer.validated_data["school_year_cible_id"]
    decisions_filter = serializer.validated_data["decisions_filter"]

    from apps.pedagogy.models import SchoolClass as SC, SchoolYear as SY

    classe_origine = SC.objects.filter(
        id=classe_origine_id, tenant=request.tenant
    ).first()
    if not classe_origine:
        return error_response(
            "Classe d'origine non trouvée.",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    school_year_cible = SY.objects.filter(
        id=school_year_cible_id, tenant=request.tenant
    ).first()
    if not school_year_cible:
        return error_response(
            "Année scolaire cible non trouvée.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    decisions_qs = YearEndDecision.objects.filter(
        tenant=request.tenant,
        student__classe_actuelle=classe_origine,
        school_year=school_year_cible,
    )
    if decisions_filter == "ADMIS":
        decisions_qs = decisions_qs.filter(decision=YearEndDecision.Decision.ADMIS)
    else:
        decisions_qs = decisions_qs.filter(
            decision__in=[YearEndDecision.Decision.ADMIS, YearEndDecision.Decision.REDOUBLE]
        )

    processed_count = 0
    skipped_reasons = []
    for decision in decisions_qs.select_related("student", "classe_destination"):
        student = decision.student
        if decision.decision == YearEndDecision.Decision.ADMIS:
            if not decision.classe_destination:
                skipped_reasons.append({
                    "student_id": str(student.id),
                    "reason": "Pas de classe de destination définie.",
                })
                continue
            student.classe_actuelle = decision.classe_destination
            student.statut = Student.Status.ACTIF
            student.save(update_fields=["classe_actuelle", "statut"])
            processed_count += 1
        elif decision.decision == YearEndDecision.Decision.REDOUBLE:
            student.classe_actuelle = classe_origine
            student.statut = Student.Status.ACTIF
            student.save(update_fields=["classe_actuelle", "statut"])
            processed_count += 1
        else:
            skipped_reasons.append({
                "student_id": str(student.id),
                "reason": f"Décision '{decision.decision}' non prise en charge pour la promotion automatique.",
            })

    return success_response({
        "processed_count": processed_count,
        "skipped_count": len(skipped_reasons),
        "skipped_reasons": skipped_reasons,
    })
