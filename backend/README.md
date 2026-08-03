# Eduguinée 3.0 — Backend

API REST du SaaS multi-tenant de gestion scolaire Eduguinée. Django 5.1 + Django REST Framework, authentification JWT, isolation stricte par établissement (tenant), tâches asynchrones via Celery.

> Pour une vue d'ensemble du projet (frontend inclus), voir le [README racine](../README.md).

---

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Architecture](#architecture)
- [Applications Django](#applications-django)
- [Conventions de l'API](#conventions-de-lapi)
- [Multi-tenancy & sécurité](#multi-tenancy--sécurité)
- [Permissions (RBAC)](#permissions-rbac)
- [Tâches asynchrones (Celery)](#tâches-asynchrones-celery)
- [Stockage de fichiers](#stockage-de-fichiers)
- [Tests](#tests)
- [Commandes utiles](#commandes-utiles)
- [Structure du projet](#structure-du-projet)
- [CI/CD](#cicd)

---

## Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Framework | Django | 5.1.4 |
| API | Django REST Framework | 3.15.2 |
| Auth | djangorestframework-simplejwt | 5.3.1 |
| Base de données | PostgreSQL (psycopg2-binary) | 16 |
| Cache / broker | Redis | 7 |
| Tâches asynchrones | Celery + django-celery-beat + django-celery-results | 5.4 |
| Stockage fichiers | django-storages (S3) + boto3, MinIO en dev | — |
| Hash mots de passe | Argon2id (argon2-cffi) | — |
| Filtrage | django-filter | 24.3 |
| Doc API | drf-spectacular (OpenAPI / Swagger / Redoc) | 0.27 |
| SMS | Africa's Talking (mock activable en dev) | — |
| Paiement mobile | Orange Money (webhook + polling) | — |
| Tests | pytest, pytest-django, pytest-cov, factory-boy, Faker | 8.3 |
| Serveur WSGI (staging/prod) | Gunicorn | 23 |
| Monitoring erreurs | Sentry SDK (staging/prod) | — |
| Python | — | 3.13 |

---

## Démarrage rapide

### 1. Services infrastructure

Depuis la racine du repo :

```bash
docker compose up -d
```

Démarre PostgreSQL (`:5432`), Redis (`:6379`) et MinIO (`:9000` API / `:9001` console).

### 2. Environnement Python

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate

pip install -r requirements/development.txt
```

### 3. Configuration

```bash
cp .env.example .env
# Les valeurs par défaut fonctionnent avec docker compose tel quel.
```

### 4. Base de données & stockage

```bash
python manage.py migrate

# Crée le bucket MinIO cible s'il n'existe pas déjà (idempotent)
python manage.py ensure_storage_bucket
```

### 5. Données initiales

```bash
python scripts/init_data.py
```

> Le script s'exécute comme un script Python autonome (il appelle `django.setup()` lui-même) — c'est la commande à utiliser **quel que soit l'OS**. Ne pas utiliser `python manage.py shell < scripts/init_data.py` : la redirection `<` est une syntaxe shell POSIX qui ne fonctionne pas de la même façon sous PowerShell (`Unknown command` ou `NameError` si le contenu du fichier est collé tel quel dans le shell interactif).

Crée, de façon idempotente :
- le plan `Starter` (stub),
- les 6 rôles MVP : `SUPER_ADMIN`, `DIRECTOR`, `STUDENT_STUDIES`, `TEACHER`, `ACCOUNTANT`, `PARENT`,
- les permissions de base du module auth (`auth:login`, `auth:refresh`, `auth:logout`, `users:read:me`, `users:update:me`, `auth:permissions:read`),
- un compte Super Admin (`admin@eduguinee.gn` / `changeme123!` par défaut — surchargeable via les variables d'environnement `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`, **à changer avant tout déploiement réel**).

### 6. Lancer le serveur

```bash
python manage.py runserver
```

API disponible sur `http://localhost:8000/`, documentation interactive sur `/api/schema/swagger-ui/`.

### 7. (Optionnel) Lancer Celery

Pour tester les tâches asynchrones (SMS, génération PDF, réconciliation Orange Money, verrouillage des présences en fin de journée...) :

```bash
# Worker
celery -A celery_app worker -l info

# Beat (tâches planifiées : django-celery-beat)
celery -A celery_app beat -l info
```

### 8. (Optionnel) Créer une école de démo

```bash
python manage.py shell
```

```python
from apps.superadmin.services import create_school
tenant = create_school(
    name="Mon École",
    code_minedu="1234567A",
    contact_email="directeur@ecole.com",
    contact_phone="+224 6XX XXX XXX",
    city="Conakry",
)
# create_school initialise aussi les matières et niveaux standards du tenant.

from apps.authentication.services import create_director_account
director = create_director_account(
    tenant=tenant,
    email="directeur@ecole.com",
    first_name="Mamadou",
    last_name="Diallo",
)
# Un mot de passe temporaire est généré automatiquement (must_change_password=True).
```

> Le Super Admin peut aussi créer des écoles via l'interface frontend `/superadmin/schools/new`.

---

## Variables d'environnement

Définies dans `backend/.env` (voir `.env.example`), chargées via `python-decouple`.

| Variable | Défaut | Description |
|---|---|---|
| `SECRET_KEY` | — (obligatoire) | Clé secrète Django, sert aussi de clé de signature JWT |
| `DEBUG` | `False` | Mode debug (forcé à `True` dans `settings/development.py`) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hôtes autorisés, liste séparée par des virgules |
| `DB_NAME` | `eduguinee_dev` | Nom de la base PostgreSQL |
| `DB_USER` | `eduguinee` | Utilisateur DB |
| `DB_PASSWORD` | `eduguinee` | Mot de passe DB |
| `DB_HOST` | `localhost` | Hôte DB |
| `DB_PORT` | `5432` | Port DB |
| `REDIS_URL` | `redis://localhost:6379/0` | URL Redis (cache + broker/backend Celery) |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | Clé d'accès MinIO / S3 |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | Clé secrète MinIO / S3 |
| `AWS_STORAGE_BUCKET_NAME` | `eduguinee-dev` | Bucket de stockage des fichiers |
| `AWS_S3_ENDPOINT_URL` | `http://localhost:9000` | Endpoint MinIO (S3-compatible) |
| `AWS_QUERYSTRING_EXPIRE` | `315360000` (~10 ans) | Durée de validité des URLs présignées S3 — volontairement longue car `pdf_url`/`receipt_pdf_url` sont persistées en base, pas régénérées à la lecture |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origines autorisées (CORS) |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `15` | Durée de vie de l'access token |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7` | Durée de vie du refresh token (rotation + blacklist activées) |
| `AFRICASTALKING_MOCK` | `True` | Simule l'envoi de SMS sans appel réseau réel |
| `AFRICASTALKING_API_KEY` / `_USERNAME` / `_WEBHOOK_SECRET` / `_API_URL` | — | Identifiants Africa's Talking (SMS) |
| `SENTRY_DSN` | vide | DSN Sentry — actif uniquement en staging/production (laisser vide en dev) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | `admin@eduguinee.gn` / `changeme123!` | Identifiants du Super Admin créé par `scripts/init_data.py` |

Trois modules de settings, sélectionnés via `DJANGO_SETTINGS_MODULE` (`config/settings/`) :
- **`development.py`** — `DEBUG=True`, CORS ouvert à toutes origines, rate limiting désactivé. Utilisé par défaut (`manage.py`, `pytest.ini`, `celery_app/celery.py`).
- **`staging.py`** — cookies sécurisés, redirection HTTPS forcée, intégration Sentry.
- **`base.py`** — commun aux deux, jamais utilisé seul.

---

## Architecture

```
Frontend (Next.js, :3000)
        │  JWT Bearer
        ▼
┌───────────────────────────────────────────┐
│         Django / DRF  (:8000)              │
│  TenantMiddleware → résout request.tenant  │
│  MustChangePasswordMiddleware               │
│  /admin/ · /api/v1/* · /webhooks/* · /api/schema/*
└──────┬──────────────┬──────────────┬──────┘
       │              │              │
       ▼              ▼              ▼
 PostgreSQL       Redis          MinIO (S3)
 (données)   (cache + Celery)  (PDF, reçus)
       ▲
       │ tâches planifiées / async
  Celery worker + beat
```

### Flux d'authentification

1. `POST /api/v1/auth/login/` avec email + mot de passe.
2. `CustomTokenObtainPairSerializer` vérifie les identifiants, l'état `is_active`, l'état de suspension du tenant, puis émet un JWT dont les claims incluent `tenant_id`, `role`, `must_change_password`.
3. Chaque requête authentifiée porte ce JWT en `Authorization: Bearer <token>`.
4. `TenantMiddleware` lit `tenant_id` dans le token et attache l'objet `Tenant` à `request.tenant` — sans lever d'exception si le token est absent/invalide (laissé à `IsAuthenticated`).
5. `MustChangePasswordMiddleware` bloque (403) toute requête d'un compte avec `must_change_password=True`, sauf `/auth/change-password/` et `/auth/logout/`.
6. `POST /api/v1/auth/refresh/` fait tourner le refresh token (rotation + blacklist de l'ancien).

---

## Applications Django

| App | Rôle | Modèles principaux |
|---|---|---|
| **`core`** | Socle transverse : classes abstraites, middlewares, permissions DRF, pagination, gestion d'erreurs. Pas de modèles métier propres. | — |
| **`apps.authentication`** | Comptes utilisateurs, rôles, permissions, gestion du personnel (staff), authentification JWT. | `User` (AbstractUser + `tenant`, `role`, `must_change_password`, `custom_permissions`, champs RH), `Role`, `Permission`, `StaffProfile` |
| **`apps.superadmin`** | Administration de la plateforme : établissements (tenants), plans d'abonnement, facturation SaaS. | `Tenant`, `Plan`, `PlatformInvoice`, `PlatformInvoiceSequence` |
| **`apps.pedagogy`** | Cœur métier scolaire : années/classes/matières, élèves, présences, notes, décisions de fin d'année. | `SchoolYear`, `AcademicPeriod`, `Level`, `SchoolClass`, `Subject`, `ClassSubject`, `Student`, `Enrollment`, `Guardian`, `MatriculeSequence`, `Attendance`, `Evaluation`, `Grade`, `YearEndDecision` |
| **`apps.finance`** | Frais scolaires, paiements (espèces + Orange Money), factures. | `FeeCategory`, `StudentFee`, `Payment`, `OrangeMoneyTransaction`, `Invoice`, `ReceiptSequence` |
| **`apps.communication`** | Envoi de SMS transactionnels (Africa's Talking). | `SMSLog` |
| **`apps.monitoring`** | Traçabilité des actions sensibles. | `AuditLog` |

Chaque modèle métier hérite de l'une des deux classes abstraites définies dans `core/models.py` :

- **`TenantScopedModel`** — entité rattachée à un établissement (`tenant` FK obligatoire + `id` UUID + timestamps). Tout `ViewSet` exposant un tel modèle **doit** filtrer `get_queryset()` sur `tenant=request.tenant` ; l'isolation multi-tenant est couverte par un test dédié (marqueur pytest `tenant_isolation`) pour chaque nouveau modèle.
- **`TimestampedModel`** — entité globale, non rattachée à un tenant (`Plan`, `Tenant`, `Role`, `Permission`, `AuditLog`).

### Domaine métier — points clés

- **Années scolaires** (`SchoolYear.Status`) : `PREPARATION → ACTIVE → CLOSED`, découpées en `AcademicPeriod` (trimestres/semestres) qui peuvent être verrouillées indépendamment.
- **Élèves** (`Student.Status`) : `ACTIF, SUSPENDU, TRANSFERE, SORTI, ARCHIVE` — inscription/réinscription tracées via `Enrollment`, matricule généré séquentiellement par établissement (`MatriculeSequence`).
- **Présences** (`Attendance.Status`) : `PRESENT, ABSENT, ABSENT_JUSTIFIE, RETARD` — verrouillées automatiquement en fin de journée par une tâche Celery planifiée, justifiables après verrouillage via un endpoint dédié.
- **Notes** : `Evaluation` (devoir/composition, verrouillable) → `Grade` (note par élève, validable individuellement après verrouillage de l'évaluation) → génération de bulletin PDF asynchrone.
- **Décisions de fin d'année** (`YearEndDecision`) : admission/redoublement/exclusion, avec promotion en masse (`promotions/bulk/`) pour faire passer une classe entière à l'année suivante.
- **Finance** : `FeeCategory` (frais type scolarité/inscription) → `StudentFee` (assignation à un élève) → `Payment` (espèces ou Orange Money, avec réconciliation asynchrone du second) → `Invoice` (facture consolidée par élève/année, PDF généré en tâche asynchrone).
- **Facturation plateforme** (`superadmin`) : `PlatformInvoice` générées automatiquement par tâche planifiée à partir du plan de chaque tenant, avec relances par SMS/notification en cas de retard.

---

## Conventions de l'API

Toutes les routes métier sont préfixées par `/api/v1/` (`config/urls.py`). Les webhooks (appelés par des systèmes externes qui ignorent ce versioning) vivent hors de ce préfixe, sous `/webhooks/`.

### Enveloppe de réponse standard

**Succès :**
```json
{ "status": "success", "data": { ... } }
```

**Succès paginé** (`core/pagination.py`, page 25 par défaut, 100 max, paramètre `page_size`) :
```json
{
  "status": "success",
  "data": {
    "count": 143,
    "next": "https://api.../students/?page=3&page_size=25",
    "previous": "https://api.../students/?page=1&page_size=25",
    "results": [ ... ]
  }
}
```

**Erreur** (`core/exceptions.py`, `EXCEPTION_HANDLER` global) :
```json
{ "status": "error", "message": "...", "errors": { "champ": ["détail"] } }
```
Le champ `errors` n'apparaît que sur les erreurs 400 (validation champ par champ) ; pour 401/403/404/429/500, seul `message` est présent.

### Endpoints principaux

| Domaine | Routes |
|---|---|
| **Auth** | `POST /auth/login\|refresh\|logout/`, `POST /auth/change-password/`, `GET /auth/permissions/me\|catalog/`, `GET /users/me/`, `GET /auth/teachers/` |
| **Personnel (staff)** | `GET/POST /auth/staff/`, `GET/PATCH /auth/staff/{id}/`, `PATCH /auth/staff/{id}/enable\|disable\|change-role\|custom-permissions/`, `GET /auth/staff/dashboard/` |
| **Super Admin** | `GET /superadmin/dashboard/`, `GET/POST /superadmin/plans/`, `GET/POST /superadmin/schools/`, `PATCH /superadmin/schools/{id}/suspend\|reactivate\|change-plan/`, `GET /superadmin/schools/{id}/invoices/` |
| **Pédagogie** | `GET/POST /pedagogy/schoolyears\|levels\|classes\|subjects/`, `PATCH /pedagogy/schoolyears/{id}/set-current\|close/`, `GET/POST /pedagogy/school-years/{id}/periods/`, `PATCH /pedagogy/periods/{id}/close/`, `GET/POST /pedagogy/classes/{id}/subjects/`, `GET /pedagogy/classes/{id}/classement/` |
| **Élèves** | `GET/POST /students/`, `GET/PATCH /students/{id}/`, `POST /students/{id}/reinscription\|archiver\|bulletin/`, `GET /students/{id}/moyenne/`, `GET/POST /students/{id}/guardians/` |
| **Présences** | `GET/POST /pedagogy/attendances/`, `PATCH /pedagogy/attendances/{id}/`, `PATCH /pedagogy/attendances/{id}/justify/` |
| **Notes** | `GET/POST /pedagogy/evaluations/`, `PATCH /pedagogy/evaluations/{id}/lock/`, `GET /pedagogy/grades/`, `POST /grades/bulk/`, `POST /grades/{id}/valider/`, `PATCH /grades/{id}/modifier-apres-validation/` |
| **Décisions** | `GET/POST /pedagogy/year-end-decisions/`, `POST /pedagogy/promotions/bulk/` |
| **Finance** | `GET/POST /finance/feecategories\|student-fees\|payments/`, `POST /finance/payments/orange-money/initiate/`, `GET /finance/payments/{id}/receipt\|status/`, `GET /finance/invoices/`, `POST /finance/invoices/{id}/generate-pdf/` |
| **Tâches async** | `GET /pedagogy/tasks/{task_id}/status/` — polling générique pour les jobs Celery déclenchés côté client (bulletin, PDF, paiement Orange Money) |
| **Webhooks** (hors `/api/v1/`) | `POST /webhooks/orange-money/`, `POST /webhooks/africastalking/delivery/` |

Documentation interactive complète, générée depuis le code (drf-spectacular) :
- Swagger UI : `http://localhost:8000/api/schema/swagger-ui/`
- Redoc : `http://localhost:8000/api/schema/redoc/`
- Schéma OpenAPI brut : `http://localhost:8000/api/schema/`

---

## Multi-tenancy & sécurité

- **Isolation stricte** : toute ressource `TenantScopedModel` est filtrée par `request.tenant` au niveau du `ViewSet`. Une ressource d'un autre tenant renvoie **404**, jamais 403 (on ne révèle pas son existence).
- **Suspension d'établissement** (`Tenant.Status`) :
  - `SUSPENDED_HARD` → toute requête est rejetée (403), y compris en lecture — y compris pour un JWT émis avant la suspension (`TenantMiddleware` revérifie le statut à chaque requête, pas seulement à la connexion).
  - `SUSPENDED_SOFT` → seules les méthodes d'écriture (POST/PUT/PATCH/DELETE) sont bloquées ; lecture/export restent accessibles.
- **Mot de passe temporaire** : un compte créé avec `must_change_password=True` ne peut appeler aucun endpoint hors `/auth/change-password/` et `/auth/logout/` tant qu'il n'a pas changé son mot de passe (sauf `SUPER_ADMIN`, jamais créé avec un mot de passe temporaire).
- **Hachage des mots de passe** : Argon2id en priorité (`argon2-cffi`), PBKDF2 en repli, longueur minimale 12 caractères.
- **Traçabilité** : `apps.monitoring.services.audit_log(...)` journalise les actions sensibles (connexion, création/désactivation de compte, changement de rôle, suspension d'établissement, changement de plan...) dans `AuditLog`, immuable, indexé sur `(tenant, created_at)`.

---

## Permissions (RBAC)

Convention de nommage des codenames, source de vérité du RBAC (`core/models.py`) :

```
module:action[:scope]
```

Exemples : `notes:create:evaluation`, `attendance:create`, `eleves:read:medical`, `staff:disable`.

- Chaque `Role` (`SUPER_ADMIN`, `DIRECTOR`, `STUDENT_STUDIES`, `TEACHER`, `ACCOUNTANT`, `PARENT`) porte un ensemble de `Permission`.
- Un `User` peut recevoir des `custom_permissions` individuelles en plus de celles de son rôle — un « rôle composite » ad hoc sans créer de nouveau `Role` en base (endpoint `PATCH /auth/staff/{id}/custom-permissions/`).
- Vérification côté DRF via `core.permissions.HasPermission("codename")`, qui délègue à `user.can(codename)`. Autres classes disponibles : `IsSuperAdmin`, `IsTenantMember`.
- `GET /auth/permissions/me/` renvoie l'ensemble effectif de permissions de l'utilisateur courant (rôle + `custom_permissions`) — c'est la source de vérité côté frontend pour l'affichage conditionnel de l'UI.

---

## Tâches asynchrones (Celery)

Broker et result backend : Redis (`CELERY_BROKER_URL`) + `django-db` (django-celery-results) pour la persistance des résultats. Planification récurrente via `django-celery-beat` (stockée en base, configurable depuis `/admin/`).

| Tâche | App | Déclencheur |
|---|---|---|
| `send_enrollment_confirmation_sms` | pedagogy | À l'inscription d'un élève |
| `send_absence_notification_sms` | pedagogy | À l'enregistrement d'une absence |
| `lock_stale_attendances` | pedagogy | Planifiée — verrouille les présences de la veille |
| `generate_bulletin_pdf` | pedagogy | `POST /students/{id}/bulletin/` |
| `reconcile_orange_money_transactions` | finance | Planifiée — rapproche les transactions en attente auprès d'Orange Money |
| `generate_invoice_pdf` | finance | `POST /finance/invoices/{id}/generate-pdf/` |
| `flag_overdue_invoices` | finance | Planifiée — marque les factures élèves en retard |
| `send_tenant_status_notification` | superadmin | Suspension/réactivation d'un établissement |
| `generate_platform_invoices` | superadmin | Planifiée — facturation SaaS mensuelle par tenant |
| `flag_overdue_platform_invoices` | superadmin | Planifiée |
| `send_overdue_invoice_reminder` | superadmin | Planifiée — relances échelonnées |
| `send_sms` | communication | Appelée par les autres apps (abstraction Africa's Talking, mockable via `AFRICASTALKING_MOCK`) |

Les jobs déclenchés depuis une requête HTTP (génération de bulletin/facture, paiement Orange Money) renvoient un `task_id` que le frontend poll via `GET /pedagogy/tasks/{task_id}/status/`.

```bash
# Lancer un worker
celery -A celery_app worker -l info

# Lancer le scheduler (tâches planifiées)
celery -A celery_app beat -l info

# Les deux dans un seul process (dev uniquement, jamais en prod)
celery -A celery_app worker -B -l info
```

---

## Stockage de fichiers

Tous les fichiers générés (reçus de paiement, factures, bulletins PDF) sont stockés sur un backend S3-compatible via `django-storages` (`STORAGES["default"]`, seule clé lue par Django ≥ 4.2 — `DEFAULT_FILE_STORAGE` est un réglage legacy mort, ignoré silencieusement).

- **Dev** : MinIO (`docker compose up -d`), bucket créé/vérifié par `python manage.py ensure_storage_bucket`.
- **URLs** : les `pdf_url` / `receipt_pdf_url` sont des URLs S3 présignées, persistées telles quelles en base (pas régénérées à la lecture) avec une durée de validité longue (`AWS_QUERYSTRING_EXPIRE`, ~10 ans par défaut) — un document financier ne doit ni devenir un lien mort après 1h, ni être servi depuis un bucket public sans expiration.

---

## Tests

```bash
# Tous les tests
pytest

# Avec couverture (rapport terminal + HTML)
pytest --cov
open htmlcov/index.html

# Un module spécifique
pytest apps/pedagogy/tests/ -k "test_period"

# Uniquement les tests d'isolation multi-tenant
pytest -m tenant_isolation
```

Configuration (`pytest.ini`) :
- Settings Django utilisés : `config.settings.development`
- Marqueurs : `unit` (sans DB), `integration` (avec DB), `tenant_isolation` (obligatoire pour tout nouveau modèle `TenantScopedModel`)
- Fixtures/données de test : `factory-boy` + `Faker`

La CI (`.github/workflows/backend.yml`) exécute `python manage.py check` puis `pytest --cov --cov-fail-under=80` sur Python 3.13 avec PostgreSQL 16 et Redis 7 en services — le build échoue sous 80 % de couverture.

---

## Commandes utiles

```bash
# Migrations
python manage.py makemigrations
python manage.py makemigrations pedagogy   # ciblée sur une app
python manage.py migrate
python manage.py showmigrations

# Shells
python manage.py shell                     # ORM shell standard
python manage.py shell_plus --ipython      # via django-extensions, si installé

# Comptes
python manage.py createsuperuser

# Stockage
python manage.py ensure_storage_bucket     # crée le bucket S3/MinIO s'il n'existe pas

# Vérification statique
python manage.py check

# Django admin
# http://localhost:8000/admin/
```

---

## Structure du projet

```
backend/
├── apps/
│   ├── authentication/   # Users, rôles, permissions, personnel (staff)
│   ├── superadmin/       # Tenants, plans, facturation plateforme
│   ├── pedagogy/         # Années, classes, élèves, présences, notes, décisions
│   ├── finance/          # Frais, paiements, factures élèves
│   ├── communication/    # SMS (Africa's Talking)
│   └── monitoring/       # AuditLog
│       └── <app>/
│           ├── models.py
│           ├── serializers.py
│           ├── views.py          # ViewSets DRF
│           ├── urls.py
│           ├── tasks.py          # tâches Celery (si présentes)
│           └── tests/
├── celery_app/
│   └── celery.py         # app Celery, autodiscover des tasks.py
├── config/
│   ├── settings/
│   │   ├── base.py        # commun
│   │   ├── development.py
│   │   └── staging.py
│   ├── urls.py            # routage racine (/api/v1/, /webhooks/, /admin/, /api/schema/)
│   ├── wsgi.py / asgi.py
├── core/
│   ├── models.py           # TenantScopedModel, TimestampedModel
│   ├── middleware.py        # TenantMiddleware, MustChangePasswordMiddleware
│   ├── permissions.py       # HasPermission, IsSuperAdmin, IsTenantMember
│   ├── pagination.py        # StandardPagination
│   ├── exceptions.py        # enveloppe d'erreur standard
│   ├── backends.py          # auth par email
│   └── management/commands/ensure_storage_bucket.py
├── scripts/
│   └── init_data.py        # rôles, permissions de base, Super Admin
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── staging.txt
├── templates/               # gabarits PDF (bulletins, factures, reçus)
├── mediafiles/               # stockage local de secours (dev uniquement)
├── manage.py
├── pytest.ini
├── .env.example
└── .env                      # non versionné
```

---

## CI/CD

`.github/workflows/backend.yml`, déclenché sur `push`/`pull_request` touchant `backend/**`, vers les branches `main`, `eduguinee`, `develop` :

1. Services PostgreSQL 16 + Redis 7.
2. Python 3.13, dépendances depuis `requirements/development.txt`.
3. `python manage.py check`.
4. `pytest --cov --cov-fail-under=80`.
5. Upload du rapport de couverture HTML en artefact.
