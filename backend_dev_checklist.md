## Checklist “End-to-End” Backend (Django + DRF) - Eduguinée 3.0

### 1. Préparation & initialisation
- [ ] Initialiser projet Django (app `core`, structure `apps/*`)
- [ ] Choisir et figer la structure de dossier (modules : `authentication`, `superadmin`, `pedagogy`, `finance`, `monitoring`, `support`, `integrations`)
- [ ] Mettre en place gestion des variables d’environnement (`.env`, `.env.example`)
- [ ] Configurer `INSTALLED_APPS`, `MIDDLEWARE`, `ROOT_URLCONF`, `DATABASES`
- [ ] Définir stratégie DB : PostgreSQL (au moins pour le plan cible), migrations Django OK

### 2. Fondations API (DRF)
- [ ] Installer/activer `djangorestframework`
- [ ] Configurer `DEFAULT_AUTHENTICATION_CLASSES`, `DEFAULT_PERMISSION_CLASSES`
- [ ] Configurer pagination (offset ou cursor) + filtrage/ordering (DRF + `django-filter` si retenu)
- [ ] Standardiser la forme des erreurs (codes 400/401/403/404/500 comme dans le cahier)
- [ ] Mettre en place versionning d’API (`/api/v1/`)
- [ ] Ajouter (plus tard) génération docs `drf-spectacular` + endpoints Swagger

### 3. Authentification & sécurité (JWT + rotation)
- [ ] Ajouter `djangorestframework-simplejwt` (access 15 min, refresh 7 jours)
- [ ] Implémenter endpoints :
  - [ ] `POST /auth/register/`
  - [ ] `POST /auth/login/`
  - [ ] `POST /auth/refresh/`
  - [ ] `POST /auth/logout/`
  - [ ] `GET/PATCH /users/me/`
- [ ] Réponses d’erreur standardisées auth (401/400)
- [ ] Vérifier qu’il y a protection brute-force (niveau applicatif : throttling/rate limiting via gateway ou DRF)
- [ ] Configurer CORS/CSRF correctement (selon stratégie JWT + frontend)

### 4. RBAC / Permissions
- [ ] Créer modèles `Role`, `Permission` + association
- [ ] Etendre `User` (email unique, tenant, role, custom_permissions si besoin)
- [ ] Implémenter système de permissions DRF :
  - [ ] Permissions par endpoint (mapping méthode -> permission codename)
  - [ ] Mécanisme de “can_*” cohérent avec le cahier
- [ ] Mettre en place helpers (ex: fonction `can(user, "can_view_x")` ou permissions classes)

### 5. Multi-tenant (isolation)
- [ ] Mettre en place modèle `Tenant` et rattachement (FK tenant sur entités)
- [ ] Choisir stratégie multi-tenant :
  - [ ] Schéma par tenant (Enterprise) ou
  - [ ] RLS (Starter/Pro)
- [ ] Mettre en place la résolution tenant à partir de :
  - [ ] JWT (claims) et/ou
  - [ ] sous-domaine `slug` (si applicable) et/ou
  - [ ] header (si gateway)
- [ ] Ajouter des contrôles pour empêcher les fuites inter-tenant (tests obligatoires)

### 6. Super Administration (Écoles / Plans)
- [ ] Créer endpoints (avec permissions RBAC) :
  - [ ] `POST /superadmin/schools/` (create tenant)
  - [ ] `GET /superadmin/schools/` (list)
  - [ ] `GET /superadmin/schools/{id}/` (detail)
  - [ ] `PATCH /superadmin/schools/{id}/suspend/`
  - [ ] `PATCH /superadmin/schools/{id}/reactivate/`
  - [ ] `POST /superadmin/plans/` (create plan)
  - [ ] `GET /superadmin/plans/` (list plans)
  - [ ] `PUT /superadmin/plans/{id}/`
- [ ] Ajouter services “métier” côté `services/` (tenant_service, etc.)
- [ ] Validation + audit trail des actions critiques (préparer `AuditLog`)

### 7. Module Pédagogie
- [ ] Modèles : `SchoolYear`, `Level`, `Class`, `Subject`, `ClassSubject`, `TimetableSlot`, `Attendance`, `Evaluation`, `Grade`
- [ ] Endpoints (permissions + filtrage) :
  - [ ] `GET/POST /pedagogy/schoolyears/`
  - [ ] `GET/POST /pedagogy/classes/`
  - [ ] `GET/POST /pedagogy/students/`
  - [ ] `GET /pedagogy/students/{id}/grades/`
  - [ ] `POST /pedagogy/evaluations/`
  - [ ] `PATCH /pedagogy/evaluations/{id}/lock/`
  - [ ] `POST /pedagogy/grades/bulk/`
  - [ ] `GET/POST /pedagogy/attendances/`
- [ ] Stratégies perf (index DB, pagination, éviter N+1)
- [ ] Vérifier règles “verrouillage” (evaluation lock)

### 8. Module Finance
- [ ] Modèles : `FeeCategory`, `StudentFee`, `Payment`, `Invoice`
- [ ] Endpoints :
  - [ ] `GET/POST /finance/feecategories/`
  - [ ] `GET /finance/students/{id}/fees/`
  - [ ] `POST /finance/payments/`
  - [ ] `GET /finance/payments/`
  - [ ] `GET /finance/invoices/`
  - [ ] `POST /finance/invoices/{id}/generate-pdf/`
- [ ] Idempotence paiement (important pour webhooks MoMo)
- [ ] Cohérence états facture (Pending/Paid/Overdue)
- [ ] Génération PDF (pipeline + stockage S3)

### 9. Monitoring & Support
- [ ] Modèles : `AuditLog`, `SystemAlert`, `SupportTicket`, `TicketMessage`
- [ ] Endpoints :
  - [ ] `GET /monitoring/auditlogs/`
  - [ ] `GET /monitoring/systemalerts/`
  - [ ] `POST /support/tickets/`
  - [ ] `GET /support/tickets/`
  - [ ] `GET /support/tickets/{id}/`
  - [ ] `POST /support/tickets/{id}/messages/`
  - [ ] `PATCH /support/tickets/{id}/assign/`
  - [ ] `PATCH /support/tickets/{id}/status/`
- [ ] Journalisation automatique (audit trail) sur actions critiques
- [ ] Politique de rétention (si applicable)

### 10. Intégrations tierces
- [ ] Stockage fichiers `django-storages` (S3 compatible MinIO/AWS)
- [ ] Organisation buckets/prefixes par tenant -> élèves/pdfs/images
- [ ] Webhooks paiements Mobile Money :
  - [ ] Endpoint(s) webhook Orange/MTN
  - [ ] Reconciliation nocturne (job Celery)
  - [ ] Retry/backoff si nécessaire
- [ ] Messaging :
  - [ ] Africastalking SMS (queue/async)
  - [ ] Sendgrid email (templates)
  - [ ] Firebase push (FCM) + fallback SMS si non délivré

### 11. Asynchrone (Celery)
- [ ] Installer/configurer `celery`, `django-celery-beat`, `django-celery-results`
- [ ] Mettre en place tâches pour :
  - [ ] Envoi notifications (SMS/Email/Push)
  - [ ] Reconciliation paiements
  - [ ] Génération PDF bulletins/factures
- [ ] Ajouter `retry` + backoff + DLQ/stratégie d’échec (selon choix)

### 12. Qualité : tests, validations, migrations
- [ ] Écrire tests unitaires pour services métiers (tenant, billing, etc.)
- [ ] Écrire tests API DRF pour permissions/auth (401/403/400)
- [ ] Tests multi-tenant (aucune fuite de données)
- [ ] Migrations :
  - [ ] stratégie migrations OK
  - [ ] tests sur base de données cible (Postgres si prévu)
- [ ] Valider sérialisation/desérialisation et contraintes DB

### 13. Perf, sécurité, robustesse
- [ ] Index DB sur champs de filtrage fréquents
- [ ] Profiling/optimisation (N+1, sérializers, requêtes)
- [ ] Rate limiting (gateway) + quotas si nécessaire
- [ ] Sécurité :
  - [ ] injection SQL (ORM + whitelists)
  - [ ] XSS (validation templates si jamais HTML)
  - [ ] CSRF (contrôle selon JWT)
- [ ] Chiffrement en transit/repos (TLS/S3 SSE/optionnel champ chiffré)

### 14. Documentation & DX
- [ ] drf-spectacular : génération OpenAPI + Swagger UI
- [ ] Documenter les endpoints et schémas (auth headers, erreurs standard)
- [ ] Mettre une convention de naming des permissions (`can_view_*`, `can_create_*`, etc.)

### 15. Mise en production (ops)
- [ ] Définir environnement prod/staging (DEBUG false, ALLOWED_HOSTS)
- [ ] Configurer web server (Gunicorn/Uvicorn selon ASGI)
- [ ] Logs structurés + corrélation requêtes
- [ ] Monitoring (latence, erreurs, files Celery)
- [ ] Backup/DR (selon cahier)

### 16. Module Gestion des Élèves et des Notes
- [ ] Modèles : `Student`, `Enrollment`, `Grade` (note mixte), `YearEndDecision`
- [ ] Matricule : génération {ANNEE_DEBUT}-{SEQUENCE} avec unicité par école/année
- [ ] Valider règles d'inscription :
  - [ ] doublons (nom/prénom/date_naissance)
  - [ ] capacité de classe (`capacite_max_classe`)
  - [ ] téléphone tuteur format `+224...`
  - [ ] email tuteur si renseigné (validation + unicité optionnelle)
  - [ ] année scolaire cible `OUVERTE`/`EN_COURS`
- [ ] Réinscription :
  - [ ] conditions statut (ACTIF / décision ADMIS ou REDOUBLE)
  - [ ] décision fin d'année précédente validée
  - [ ] création `Enrollment` type `REINSCRIPTION` + mise à jour `classe_actuelle`
- [ ] Notes :
  - [ ] conversion barème vers `note_convertie` sur 20
  - [ ] calcul moyenne dynamique (Σ(note_convertie × coefficient) / Σ(coefficients))
  - [ ] gestion brouillon vs validée (`valide`)
  - [ ] verrou/modification validée uniquement par `ADMIN_SCHOOL` + justification
- [ ] Décision fin d'année :
  - [ ] déclenchement uniquement si année `CLOTURE_EN_COURS`
  - [ ] permissions `ADMIN_SCHOOL` (SECRETAIRE peut préparer, mais pas valider)
  - [ ] décisions `ADMIS/REDOUBLE/ORIENTE/TRANSFERE/EXCLU` + effets attendus
  - [ ] calcul `mention` à partir des seuils (configurables par école)
  - [ ] règle redoublement max (par niveau) + alertes/forçage avec justification
- [ ] Archivage/historique :
  - [ ] `ARCHIVE` au lieu de suppression
  - [ ] endpoints d’historique complet (inscriptions, notes, décisions)
- [ ] Endpoints API à mettre en place (versionnés `/api/v1/...`) :
  - [ ] `/students/` + détails + patch + archiver
  - [ ] `/students/{id}/reinscription/`
  - [ ] `/students/{id}/historique/`
  - [ ] `/grades/` (CRUD partiel selon périmètre)
  - [ ] `/grades/{id}/valider/`
  - [ ] `/students/{id}/moyenne/`
  - [ ] `/classes/{id}/classement/`
  - [ ] `/year-end-decisions/` + détail
  - [ ] `/promotions/bulk/`
- [ ] Multi-tenant : tests anti-fuite cross-school (students/grades/decisions uniquement dans le schéma du tenant)
- [ ] Journalisation :
  - [ ] log inscription, modification profil, saisie note, validation note, décision fin d'année, archivage
- [ ] Permissions/RBAC :
  - [ ] mapping permissions par rôle (`ADMIN_SCHOOL`, `SECRETAIRE`, `SUPER_ADMIN`)
  - [ ] règles “isolation données” dans les permissions/querysets

