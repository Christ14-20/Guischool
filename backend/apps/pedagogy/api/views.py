"""
apps/pedagogy/api/views.py
Views : SchoolYear, Class, Subject, Student, Grade, YearEndDecision.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.pedagogy.models import (
    SchoolYear, Level, Class, Subject, Filiere,
    Student, Enrollment, Grade, YearEndDecision, Evaluation, Attendance,
    TimetableSlot, MixedClass, ClassGroup, SubGroup,
)
from apps.pedagogy.api.serializers import (
    SchoolYearSerializer, LevelSerializer, ClassSerializer, SubjectSerializer,
    FiliereSerializer, MixedClassSerializer, ClassGroupSerializer, SubGroupSerializer,
    StudentListSerializer, StudentDetailSerializer, EnrollmentSerializer,
    GradeSerializer, GradeValidateSerializer,
    YearEndDecisionSerializer, BulkPromotionSerializer,
    EvaluationSerializer, AttendanceSerializer, TimetableSlotSerializer,
)
from apps.pedagogy.services import grading_service, enrollment_service
from apps.pedagogy.models import YearEndDecision as YED


# ── Classes de base du module ──────────────────────────────────────

class SchoolYearViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolYearSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "is_current"]

    def get_queryset(self):
        return SchoolYear.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class LevelViewSet(viewsets.ModelViewSet):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["cycle"]

    def get_queryset(self):
        return Level.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class FiliereViewSet(viewsets.ModelViewSet):
    serializer_class = FiliereSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["cycle", "code"]
    search_fields = ["name", "code"]

    def get_queryset(self):
        return Filiere.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school_year", "level", "filiere", "is_mixed"]
    search_fields = ["name"]

    def get_queryset(self):
        return Class.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("level", "school_year", "main_teacher", "filiere")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant=self.request.user.tenant)
        return Response(
            {"status": "success", "data": ClassSerializer(serializer.instance, context=self.get_serializer_context()).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="classement")
    def classement(self, request, pk=None):
        """GET /pedagogy/classes/{id}/classement/?annee_scolaire=&periode="""
        classe = self.get_object()
        annee_scolaire_id = request.query_params.get("annee_scolaire")
        periode = request.query_params.get("periode")
        if not annee_scolaire_id:
            return Response(
                {"status": "error", "message": "Paramètre 'annee_scolaire' requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ranking = grading_service.compute_class_ranking(classe.id, annee_scolaire_id, periode)
        return Response({"status": "success", "data": ranking})

    @action(detail=True, methods=["get"], url_path="students-by-level")
    def students_by_level(self, request, pk=None):
        """GET /pedagogy/classes/{id}/students-by-level/?niveau=
        Retourne les inscrits d'une classe mixte, filtrés par niveau."""
        from apps.pedagogy.api.serializers import EnrollmentSerializer

        classe = self.get_object()
        level_id = request.query_params.get("niveau")
        enrollments = classe.students_by_level(level_id)
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response({"status": "success", "data": serializer.data})


class MixedClassViewSet(viewsets.ModelViewSet):
    serializer_class = MixedClassSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type_mixte"]

    def get_queryset(self):
        return MixedClass.objects.filter(
            classe_physique__tenant=self.request.user.tenant
        ).select_related("classe_physique").prefetch_related("niveaux__level")


class ClassGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClassGroupSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["classe_mere", "type", "enseignant"]

    def get_queryset(self):
        qs = ClassGroup.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("enseignant")
        classe_id = self.kwargs.get("classe_pk")
        if classe_id:
            qs = qs.filter(classe_mere_id=classe_id)
        return qs

    def perform_create(self, serializer):
        classe_id = self.kwargs.get("classe_pk")
        if classe_id:
            serializer.save(tenant=self.request.user.tenant, classe_mere_id=classe_id)
        else:
            serializer.save(tenant=self.request.user.tenant)


class SubGroupViewSet(viewsets.ModelViewSet):
    serializer_class = SubGroupSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type", "enseignant"]

    def get_queryset(self):
        return SubGroup.objects.filter(
            tenant=self.request.user.tenant
        ).prefetch_related("classes")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_official"]
    search_fields = ["name", "code"]

    def get_queryset(self):
        return Subject.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class TimetableSlotViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableSlotSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["classe", "day_of_week", "subject", "mixed_level"]

    def get_queryset(self):
        return TimetableSlot.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("subject", "teacher", "mixed_level")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class EvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["classe", "subject", "type", "is_published"]

    def get_queryset(self):
        return Evaluation.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    @action(detail=True, methods=["patch"], url_path="lock")
    def lock(self, request, pk=None):
        evaluation = self.get_object()
        evaluation.is_locked = True
        evaluation.save(update_fields=["is_locked"])
        return Response({"status": "success", "message": "Évaluation verrouillée."})


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["classe", "student", "date", "status"]

    def get_queryset(self):
        return Attendance.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, tenant=self.request.user.tenant)


# ── Module 4.5 — Élèves ───────────────────────────────────────────

class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ["classe_actuelle", "statut", "annee_inscription", "sexe"]
    search_fields = ["nom", "prenom", "matricule", "tuteur_telephone"]
    ordering_fields = ["nom", "prenom", "matricule", "created_at"]

    def get_queryset(self):
        qs = Student.objects.filter(
            tenant=self.request.user.tenant
        ).select_related("classe_actuelle", "annee_inscription")
        niveau = self.request.query_params.get("niveau")
        if niveau:
            classe = self.request.query_params.get("classe_actuelle")
            annee = self.request.query_params.get("annee_inscription")
            if classe and annee:
                student_ids = Enrollment.objects.filter(
                    classe_id=int(classe),
                    annee_scolaire_id=int(annee),
                    niveau_mixte_id=int(niveau),
                ).values_list("eleve_id", flat=True)
                qs = qs.filter(id__in=student_ids)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return StudentListSerializer
        return StudentDetailSerializer

    def perform_create(self, serializer):
        from apps.pedagogy.services.enrollment_service import validate_enrollment_data
        from apps.superadmin.services.plan_limits import ensure_student_limit_available
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        data = serializer.validated_data
        ensure_student_limit_available(self.request.user.tenant)
        classe = data.get("classe_actuelle")
        annee = data.get("annee_inscription")
        try:
            validate_enrollment_data(
                {
                    "nom": data.get("nom", ""),
                    "prenom": data.get("prenom", ""),
                    "date_naissance": data.get("date_naissance"),
                    "tuteur_telephone": data.get("tuteur_telephone", ""),
                },
                classe,
                annee,
            )
        except DjangoValidationError as e:
            raise DRFValidationError(detail=e.message_dict if hasattr(e, "message_dict") else e.message)

        student = serializer.save(
            tenant=self.request.user.tenant,
            created_by=self.request.user,
        )
        # Créer l'enrollment initial
        if classe and annee:
            enrollment_kwargs = {
                "eleve": student,
                "classe": classe,
                "annee_scolaire": annee,
                "inscrit_par": self.request.user,
                "type_inscription": "NOUVELLE_INSCRIPTION",
            }
            niveau_mixte = self.request.data.get("niveau_mixte")
            if niveau_mixte:
                enrollment_kwargs["niveau_mixte_id"] = int(niveau_mixte)
            Enrollment.objects.create(**enrollment_kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return Response({"status": "success", "data": self.get_serializer(self.get_object()).data})

    @action(detail=True, methods=["get"], url_path="historique")
    def historique(self, request, pk=None):
        student = self.get_object()
        enrollments = EnrollmentSerializer(
            student.enrollments.all().select_related("classe", "annee_scolaire"), many=True
        ).data
        decisions = YearEndDecisionSerializer(
            student.year_end_decisions.all(), many=True
        ).data
        grades = GradeSerializer(
            student.grades.filter(valide=True), many=True
        ).data
        return Response({
            "status": "success",
            "data": {
                "inscriptions": enrollments,
                "decisions_fin_annee": decisions,
                "notes_validees": grades,
            },
        })

    @action(detail=True, methods=["post"], url_path="reinscription")
    def reinscription(self, request, pk=None):
        from apps.pedagogy.services.enrollment_service import check_reinscription_conditions
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        student = self.get_object()
        serializer = EnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        annee_cible = serializer.validated_data.get("annee_scolaire")
        classe_cible = serializer.validated_data.get("classe")
        try:
            check_reinscription_conditions(student, annee_cible)
        except DjangoValidationError as e:
            raise DRFValidationError(detail=e.message)

        enrollment = serializer.save(
            eleve=student,
            inscrit_par=request.user,
            type_inscription="REINSCRIPTION",
        )
        student.classe_actuelle = classe_cible
        student.save(update_fields=["classe_actuelle", "updated_at"])
        return Response(
            {"status": "success", "data": EnrollmentSerializer(enrollment).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="archiver")
    def archiver(self, request, pk=None):
        student = self.get_object()
        student.statut = "ARCHIVE"
        student.classe_actuelle = None
        student.save(update_fields=["statut", "classe_actuelle", "updated_at"])
        return Response({"status": "success", "message": f"Élève '{student.nom} {student.prenom}' archivé."})

    @action(detail=True, methods=["get"], url_path="moyenne")
    def moyenne(self, request, pk=None):
        student = self.get_object()
        annee_id = request.query_params.get("annee_scolaire")
        periode = request.query_params.get("periode")
        if not annee_id:
            return Response(
                {"status": "error", "message": "Paramètre 'annee_scolaire' requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = grading_service.compute_average(student.id, annee_id, periode)
        return Response({"status": "success", "data": result})


# ── Notes ──────────────────────────────────────────────────────────

class GradeViewSet(viewsets.ModelViewSet):
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["eleve", "matiere", "periode", "annee_scolaire", "valide"]

    def get_queryset(self):
        return Grade.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant, saisie_par=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="valider")
    def valider(self, request, pk=None):
        ser = GradeValidateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = grading_service.validate_grade(
            grade_id=pk,
            user_id=request.user.id,
            justification=ser.validated_data.get("justification", ""),
        )
        if not result["ok"]:
            return Response({"status": "error", "message": result["error"]}, status=400)
        return Response({"status": "success", "message": "Note validée."})

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_create(self, request):
        """Création groupée de notes depuis un JSON (issu d'un CSV ou d'une grille)."""
        from apps.pedagogy.models import Student

        data = request.data
        if not isinstance(data, list):
            return Response({"status": "error", "message": "Liste attendue."}, status=400)

        created_count = 0
        errors = []

        for index, item in enumerate(data):
            # Résolution matricule -> eleve_id si nécessaire
            if "eleve_matricule" in item and not item.get("eleve"):
                try:
                    student = Student.objects.get(
                        tenant=self.request.user.tenant,
                        matricule=item["eleve_matricule"]
                    )
                    item["eleve"] = str(student.id)
                except Student.DoesNotExist:
                    errors.append({"index": index, "errors": {"eleve_matricule": "Élève introuvable."}})
                    continue

            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save(tenant=self.request.user.tenant, saisie_par=self.request.user)
                created_count += 1
            else:
                errors.append({"index": index, "errors": serializer.errors})

        return Response({
            "status": "success",
            "created_count": created_count,
            "errors": errors
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="template")
    def template(self, request):
        """Génère un modèle CSV avec les matricules des élèves d'une classe."""
        import csv
        from django.http import HttpResponse
        from apps.pedagogy.models import Enrollment

        classe_id = request.query_params.get("classe")
        if not classe_id:
            return Response({"error": "Paramètre 'classe' manquant."}, status=400)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="modele_notes_classe_{classe_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(["matricule", "nom_complet", "note", "appreciation"])

        enrollments = Enrollment.objects.filter(
            classe_id=classe_id,
            annee_scolaire__is_current=True,
            eleve__statut="ACTIF"
        ).select_related("eleve")

        for enr in enrollments:
            writer.writerow([
                enr.eleve.matricule,
                f"{enr.eleve.nom} {enr.eleve.prenom}",
                "",
                ""
            ])

        return response

    @action(detail=False, methods=["get"], url_path="ranking")
    def ranking(self, request):
        """Classement d'une classe pour une période donnée."""
        from apps.pedagogy.services import grading_service

        classe_id = request.query_params.get("classe")
        annee_id = request.query_params.get("annee")
        periode = request.query_params.get("periode")

        if not classe_id or not annee_id:
            return Response({"error": "Paramètres 'classe' et 'annee' obligatoires."}, status=400)

        rankings = grading_service.compute_class_ranking(
            classe_id=classe_id,
            annee_scolaire_id=annee_id,
            periode=periode
        )

        return Response(rankings)


# ── Décisions de fin d'année ────────────────────────────────────────

class YearEndDecisionViewSet(viewsets.ModelViewSet):
    serializer_class = YearEndDecisionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["annee_scolaire", "decision", "classe_origine"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return YearEndDecision.objects.filter(
            eleve__tenant=self.request.user.tenant
        ).select_related("eleve", "classe_origine", "classe_destination")

    def perform_create(self, serializer):
        from apps.pedagogy.services.grading_service import compute_average

        eleve = serializer.validated_data["eleve"]
        annee = serializer.validated_data["annee_scolaire"]

        # Vérifier que l'année est en CLOTURE_EN_COURS
        if annee.status != "CLOTURE_EN_COURS":
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Les décisions de fin d'année ne sont possibles que si l'année est en statut CLOTURE_EN_COURS."
            )

        avg_data = compute_average(eleve.id, annee.id)
        moyenne = avg_data.get("moyenne")
        mention = YED.compute_mention(float(moyenne)) if moyenne is not None else ""

        serializer.save(
            prise_par=self.request.user,
            moyenne_annuelle=moyenne,
            mention=mention,
        )


class BulkPromotionView(viewsets.ViewSet):
    """POST /promotions/bulk/ — Traitement groupé d'une classe."""
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = BulkPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        classe = get_object_or_404(Class, id=data["classe_id"], tenant=request.user.tenant)
        annee = get_object_or_404(SchoolYear, id=data["annee_scolaire_id"], tenant=request.user.tenant)

        if annee.status != "CLOTURE_EN_COURS":
            return Response(
                {"status": "error", "message": "L'année doit être en statut CLOTURE_EN_COURS."},
                status=400,
            )

        enrollments = Enrollment.objects.filter(classe=classe, annee_scolaire=annee)
        created = 0
        for enrollment in enrollments:
            student = enrollment.eleve
            avg_data = grading_service.compute_average(student.id, annee.id)
            moyenne = avg_data.get("moyenne")
            mention = YED.compute_mention(float(moyenne)) if moyenne else ""
            YearEndDecision.objects.get_or_create(
                eleve=student,
                annee_scolaire=annee,
                defaults={
                    "decision": data["decision"],
                    "classe_origine": classe,
                    "moyenne_annuelle": moyenne,
                    "mention": mention,
                    "prise_par": request.user,
                    "commentaire": data.get("commentaire", ""),
                },
            )
            created += 1

        return Response({
            "status": "success",
            "message": f"{created} décisions créées pour la classe {classe.name}.",
        })
