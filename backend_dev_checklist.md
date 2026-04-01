## Checklist “End-to-End” Backend (Django + DRF) - Eduguinée 3.0

### 1. Préparation & initialisation
- [x] Initialiser projet Django (app `core`, structure `apps/*`)
- [x] Choisir et figer la structure de dossier (modules : `authentication`, `superadmin`, `pedagogy`, `finance`, `monitoring`, `support`)
- [x] Mettre en place gestion des variables d’environnement (`.env`, `.env.example`)
- [x] Configurer `INSTALLED_APPS`, `MIDDLEWARE`, `ROOT_URLCONF`, `DATABASES`
- [x] Définir stratégie DB : SQLite (dev/test), migrations Django OK

### 2. Fondations API (DRF)
- [x] Installer/activer `djangorestframework`
- [x] Configurer `DEFAULT_AUTHENTICATION_CLASSES`, `DEFAULT_PERMISSION_CLASSES`
- [x] Configurer pagination (StandardResultsSetPagination) + filtrage/ordering (`django-filter`)
- [x] Standardiser la forme des erreurs (codes 400/401/403/404/500 via `custom_exception_handler`)
- [x] Mettre en place versionning d’API (`/api/v1/`)
- [x] Ajouter génération docs `drf-spectacular` + endpoints Swagger

### 3. Authentification & sécurité (JWT + rotation)
- [x] Ajouter `djangorestframework-simplejwt` (access 15 min, refresh 7 jours)
- [x] Implémenter endpoints :
  - [x] `POST /auth/register/`
  - [x] `POST /auth/login/`
  - [x] `POST /auth/refresh/`
  - [x] `POST /auth/logout/`
  - [x] `GET/PATCH /users/me/`
- [x] Réponses d’erreur standardisées auth (401/400)
- [x] Vérifier qu’il y a protection brute-force (rotation + blacklistage JWT)
- [x] Configurer CORS/CSRF correctement

### 4. RBAC / Permissions
- [x] Créer modèles `Role`, `Permission` + association
- [x] Etendre `User` (email unique, tenant, role, custom_permissions)
- [x] Implémenter système de permissions DRF :
  - [x] Permissions par endpoint (`HasPermission`)
  - [x] Mécanisme de “can_*” cohérent avec le cahier
- [x] Mettre en place helpers (méthode `user.can(codename)`)

### 5. Multi-tenant (isolation)
- [x] Mettre en place modèle `Tenant` et rattachement (FK tenant sur entités)
- [x] Choisir stratégie multi-tenant : Isolation applicative par filtrage (`get_queryset`)
- [x] Mettre en place la résolution tenant à partir de : JWT (claims `tenant_id`)
- [/] Ajouter des contrôles pour empêcher les fuites inter-tenant (tests à venir)

### 6. Super Administration (Écoles / Plans)
- [x] Créer endpoints (avec permissions RBAC) :
  - [x] `POST /superadmin/schools/` (create tenant via `tenant_service`)
  - [x] `GET /superadmin/schools/` (list)
  - [x] `GET /superadmin/schools/{id}/` (detail)
  - [x] `PATCH /superadmin/schools/{id}/suspend/`
  - [x] `PATCH /superadmin/schools/{id}/reactivate/`
  - [x] `POST /superadmin/plans/` (create plan)
  - [x] `GET /superadmin/plans/` (list plans)
  - [x] `PUT/PATCH /superadmin/plans/{id}/`
- [x] Ajouter services “métier” côté `services/` (tenant_service.py)
- [x] Validation + audit trail des actions critiques (AuditLog)

### 7. Module Pédagogie
- [x] Modèles : `SchoolYear`, `Level`, `Class`, `Subject`, `ClassSubject`, `TimetableSlot`, `Attendance`, `Evaluation`, `Grade`
- [x] Endpoints (permissions + filtrage) :
  - [x] `GET/POST /pedagogy/schoolyears/`
  - [x] `GET/POST /pedagogy/classes/`
  - [x] `GET/POST /pedagogy/subjects/`
  - [x] `/pedagogy/evaluations/`, `/pedagogy/attendances/`
- [x] Stratégies perf (select_related/prefetch_related OK)
- [x] Vérifier règles “verrouillage” (evaluation lock/lock)

### 8. Module Finance
- [x] Modèles : `FeeCategory`, `StudentFee`, `Payment`, `Invoice`
- [x] Endpoints :
  - [x] `GET/POST /finance/feecategories/`
  - [x] `GET /finance/student-fees/`
  - [x] `POST /finance/payments/`
  - [x] `GET /finance/payments/`
  - [x] `GET /finance/invoices/`
  - [x] `POST /finance/invoices/{id}/generate-pdf/` (Tâche Celery TODO)
- [x] Idempotence paiement (via receipt_number unique)
- [x] Cohérence états facture (Pending/Paid/Overdue)
- [/] Génération PDF (Structure prête, Celery task à finaliser)

### 9. Monitoring & Support
- [x] Modèles : `AuditLog`, `SystemAlert`, `SupportTicket`, `TicketMessage`
- [x] Endpoints :
  - [x] `GET /monitoring/auditlogs/`
  - [x] `GET /monitoring/systemalerts/`
  - [x] `POST/GET /support/tickets/`
  - [x] `POST /support/tickets/{id}/messages/`
  - [x] `PATCH /support/tickets/{id}/assign/`
  - [x] `PATCH /support/tickets/{id}/status/`
- [x] Journalisation automatique (AuditLog.log helper)

### 10. Intégrations tierces
- [/] Stockage fichiers `django-storages` (Config S3/MinIO prête dans settings)
- [ ] Webhooks paiements Mobile Money
- [ ] Messaging (Africastalking/Sendgrid/Firebase - structures prêtes)

### 11. Asynchrone (Celery)
- [x] Installer/configurer `celery`, `django-celery-beat`, `django-celery-results`
- [/] Mettre en place tâches pour notifications/PDF/Reconciliation

### 12. Qualité : tests, validations, migrations
- [/] Écrire tests unitaires pour services métiers (Phase 7)
- [/] Écrire tests API DRF pour permissions/auth (Phase 7)
- [x] Migrations : Stratégie effectuée et appliquée (0001_initial pour toutes les apps)
- [x] Valider sérialisation/desérialisation (Validations métier dans serializers/services)

### 13. Perf, sécurité, robustesse
- [x] Index DB sur champs de filtrage fréquents (AuditLog, Student)
- [x] Profiling/optimisation (select_related utilisé dans les ViewSets)
- [x] Sécurité : injection SQL (ORM), XSS (whitelists), CSRF (JWT)

### 14. Documentation & DX
- [x] drf-spectacular : OpenAPI + Swagger UI opérationnels
- [x] Documenter les endpoints (via Docstrings et Serializers)
- [x] Convention de naming des permissions (`can_view_*`) respectée

### 15. Mise en production (ops)
- [ ] Définir environnement prod/staging
- [ ] Configurer web server (Gunicorn)
- [ ] Backup/DR

### 16. Module Gestion des Élèves et des Notes (Section 4.5 CDC)
- [x] Modèles : `Student`, `Enrollment`, `Grade`, `YearEndDecision`
- [x] Matricule : génération `{ANNEE}-{SEQ:05d}` unique par école/année
- [x] Valider règles d'inscription (doublons, capacité, téléphone +224, année active)
- [x] Réinscription : conditions statut + décision précédente validée
- [x] Notes : conversion barème sur 20 + calcul moyenne dynamique Σ(note×coeff)/Σcoeff
- [x] Décision fin d'année : réservé `CLOTURE_EN_COURS`, mentions auto, archivage auto
- [x] Endpoints API v1 : `/students/`, `/students/{id}/reinscription/`, `/students/{id}/historique/`, `/grades/`, `/grades/{id}/valider/`, `/students/{id}/moyenne/`, `/classes/{id}/classement/`, `/year-end-decisions/`, `/promotions/bulk/`
- [x] Multi-tenant : isolation via queryset filtering dans StudentViewSet/GradeViewSet
- [x] Journalisation : Log des inscriptions et des validation de notes via AuditLog
- [x] Permissions/RBAC : Mapping avec `HasPermission` sur tous les nouveaux endpoints

