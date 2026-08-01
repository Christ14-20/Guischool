# Eduguinée 3.0 — SaaS de gestion scolaire

Plateforme multi-tenant de gestion d'établissements scolaires (MVP).  
Frontend Next.js 15 + backend Django REST Framework + PostgreSQL / Redis / MinIO.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                 │
│  Port 3000  ·  App Router  ·  NextAuth v5  ·  Tailwind 4 │
└──────────────┬──────────────────────────────┬───────────┘
               │  BFF (API Routes)            │  CSR (Axios)
               │  /api/auth/*                 │  + JWT Bearer
               ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Django 5.1 / DRF 3.15)             │
│  Port 8000  ·  JWT (SimpleJWT)  ·  Isolation tenant     │
│  /admin/  ·  /api/v1/auth/  ·  /api/v1/pedagogy/  · …   │
└──────────────┬──────────────────────────────┬───────────┘
               │                              │
               ▼                              ▼
         ┌──────────┐                  ┌──────────┐
         │PostgreSQL│                  │  Redis   │
         │   :5432  │                  │  :6379   │
         └──────────┘                  └──────────┘
               │
               ▼
         ┌──────────┐
         │  MinIO   │  Stockage fichiers (S3-compatible)
         │ :9000/01 │
         └──────────┘
```

### Flux d'authentification

1. L'utilisateur saisit email + mot de passe sur `/login`
2. NextAuth `authorize()` appelle `POST /api/v1/auth/login/` (Django)
3. Django vérifie les credentials, retourne un JWT (access + refresh) avec les claims `tenant_id`, `role`, `must_change_password`
4. Le callback `jwt()` stocke les tokens dans le cookie de session NextAuth
5. Le callback `session()` expose `user`, `accessToken`, `refreshToken`
6. Le middleware `authorized()` vérifie l'authentification, les routes super admin, et `mustChangePassword`
7. Les appels API côté serveur utilisent `getBackendClient()` qui injecte le Bearer token

---

## Stack technique

### Frontend
| Technologie | Version |
|---|---|
| Next.js | 15.5 (App Router, Turbopack) |
| React | 19.1 |
| NextAuth | 5.0 beta (CredentialsProvider) |
| Tailwind CSS | 4 |
| Axios | 1.18 |
| Zod | 4 |
| Zustand | 5 |
| Lucide React | 1.24 |
| TypeScript | 5 |

### Backend
| Technologie | Version |
|---|---|
| Django | 5.1.4 |
| Django REST Framework | 3.15.2 |
| SimpleJWT | 5.3.1 |
| PostgreSQL | 16 (via psycopg2-binary) |
| Celery | 5.4 (Redis broker) |
| MinIO (S3) | via django-storages + boto3 |
| Argon2 | Chiffrement des mots de passe |
| pytest | 8.3 (pytest-django, factory-boy, Faker) |
| drf-spectacular | 0.27 (OpenAPI / Swagger) |
| django-filter | 24.3 |
| django-celery-beat | Tâches planifiées |

### Services Docker
| Service | Image | Port |
|---|---|---|
| PostgreSQL | `postgres:16-alpine` | 5432 |
| Redis | `redis:7-alpine` | 6379 |
| MinIO | `minio/minio:latest` | 9000 (API) / 9001 (Console) |

---

## Prérequis

- **Python** 3.13+
- **Node.js** 20+
- **Docker** & **Docker Compose** (ou PostgreSQL / Redis / MinIO installés directement)
- **pnpm** (recommandé) ou npm

---

## Démarrage rapide

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd Guischool
```

### 2. Lancer les services Docker

```bash
docker compose up -d
```

Démarre PostgreSQL, Redis et MinIO.  
Les données sont persistées dans des volumes Docker.

### 3. Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv .venv
source .venv/bin/activate  # Linux/Mac

# Installer les dépendances
pip install -r requirements/development.txt

# Copier et ajuster les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (les valeurs par défaut fonctionnent en local)

# Appliquer les migrations
python manage.py migrate

# Créer le bucket MinIO cible s'il n'existe pas déjà (idempotent — INFRA-V2-01)
python manage.py ensure_storage_bucket

# Créer les données initiales (plans, rôles, permissions, super admin)
python manage.py shell < scripts/init_data.py

# Lancer le serveur de développement
python manage.py runserver
```

Le backend est accessible sur `http://localhost:8000/`.

#### Données initiales (scripts/init_data.py)

Crée automatiquement :
- **Plan** "Starter" (max 500 élèves, 50 personnels)
- **Rôles** MVP : SUPER_ADMIN, DIRECTOR, STUDENT_STUDIES, TEACHER, PARENT
- **Permissions** auth : `auth:create`, `auth:read`, `auth:update`, `auth:disable`, `staff:create`, `staff:read`, `staff:update`, `staff:disable`
- **Super Admin** : email `admin@eduguinee.com`, mot de passe `Admin123!` (à changer en production)

### 4. Frontend

```bash
cd frontend

# Installer les dépendances
pnpm install
# ou : npm install

# Copier les variables d'environnement
cp .env.local.example .env.local  # ou créer le fichier
# Éditer si nécessaire

# Lancer le serveur de développement
pnpm dev
# ou : npm run dev
```

Le frontend est accessible sur `http://localhost:3000/`.

### 5. (Optionnel) Créer une école et des données démo

```bash
cd backend
source .venv/bin/activate

# Accéder au shell Django
python manage.py shell
```

```python
# Créer une école (génère automatiquement tenant + matières + niveaux standards)
from apps.superadmin.services import create_school
tenant = create_school(
    name="Mon École",
    code_minedu="1234567A",
    contact_email="directeur@ecole.com",
    contact_phone="+224 6XX XXX XXX",
    city="Conakry",
)

# Créer une année scolaire
from apps.pedagogy.models import SchoolYear
from datetime import date
sy = SchoolYear.objects.create(
    tenant=tenant,
    label="2025-2026",
    start_date=date(2025, 10, 1),
    end_date=date(2026, 7, 31),
    status="PREPARATION",
)

# Créer un compte directeur
from apps.authentication.services import create_director_account
director = create_director_account(
    tenant=tenant,
    email="directeur@ecole.com",
    first_name="Mamadou",
    last_name="Diallo",
)
# Le mot de passe temporaire est généré automatiquement
```

> **Note** : le Super Admin peut aussi créer des écoles via l'interface `/superadmin/schools/new`.

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Défaut | Description |
|---|---|---|
| `SECRET_KEY` | (obligatoire) | Clé secrète Django |
| `DEBUG` | `True` | Mode debug |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hôtes autorisés |
| `DB_NAME` | `eduguinee_dev` | Nom de la base |
| `DB_USER` | `eduguinee` | Utilisateur DB |
| `DB_PASSWORD` | `eduguinee` | Mot de passe DB |
| `DB_HOST` | `localhost` | Hôte DB |
| `DB_PORT` | `5432` | Port DB |
| `REDIS_URL` | `redis://localhost:6379/0` | URL Redis |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | MinIO / S3 |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | MinIO / S3 |
| `AWS_STORAGE_BUCKET_NAME` | `eduguinee-dev` | Bucket |
| `AWS_S3_ENDPOINT_URL` | `http://localhost:9000` | Endpoint MinIO |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origines CORS |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `15` | Durée access token |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7` | Durée refresh token |

### Frontend (`frontend/.env.local`)

| Variable | Défaut | Description |
|---|---|---|
| `AUTH_SECRET` | (obligatoire) | Clé secrète NextAuth |
| `NEXT_PUBLIC_DJANGO_API_URL` | `http://localhost:8000/api/v1` | URL de l'API Django |

---

## Structure du projet

```
.
├── backend/
│   ├── apps/
│   │   ├── authentication/     # Auth, utilisateurs, staff
│   │   ├── finance/            # Paiements, factures (MVP)
│   │   ├── monitoring/         # Audit log, métriques
│   │   ├── pedagogy/           # Élèves, notes, cours, périodes
│   │   └── superadmin/         # Plans, écoles (tenants)
│   ├── config/
│   │   ├── settings/           # base.py, development.py, staging.py
│   │   └── urls.py             # Routage API v1
│   ├── core/                   # Modèles abstraits, middleware, permissions
│   ├── requirements/           # base.txt, development.txt, staging.txt
│   └── scripts/                # init_data.py
│
├── frontend/
│   ├── app/
│   │   ├── (app)/              # Routes principales (dashboard, élèves, etc.)
│   │   ├── (auth)/             # Login, changement mot de passe
│   │   └── (superadmin)/       # Super Admin (gestion écoles)
│   ├── components/ui/          # Composants réutilisables
│   ├── hooks/                  # useAuth (Zustand)
│   ├── lib/api/                # Client Axios (server / client)
│   └── auth.config.ts          # Middleware & configuration NextAuth
│
├── docker-compose.yml          # PostgreSQL + Redis + MinIO
└── .github/workflows/          # CI backend + frontend
```

---

## API — Vue d'ensemble

Toutes les API sont préfixées par `/api/v1/`.  
Documentation Swagger : `http://localhost:8000/api/schema/swagger-ui/`  
Documentation Redoc : `http://localhost:8000/api/schema/redoc/`

| Domaine | Endpoints principaux |
|---|---|
| **Auth** | `POST /auth/login/`, `POST /auth/refresh/`, `POST /auth/logout/`, `POST /auth/change-password/`, `GET /users/me/`, `GET /auth/permissions/me/`, `GET /auth/staff/`, `POST /auth/staff/`, `PATCH /auth/staff/{id}/enable\|disable/` |
| **Super Admin** | `GET/POST /superadmin/plans/`, `GET/POST /superadmin/schools/` |
| **Pédagogie** | `GET/POST /pedagogy/schoolyears/`, `GET/POST /pedagogy/levels/`, `GET/POST /pedagogy/classes/`, `GET/POST /pedagogy/subjects/`, `GET/POST /pedagogy/school-years/{id}/periods/` |
| **Élèves** | `GET/POST /students/`, `GET/PATCH /students/{id}/`, `POST /students/{id}/reinscription\|archiver/`, `GET /students/{id}/bulletin/` |
| **Notes** | `GET/POST /grades/`, `POST /grades/bulk/`, `GET/POST /grades/evaluations/` |
| **Présences** | `GET/POST /pedagogy/attendances/`, `PATCH /pedagogy/attendances/{id}/justify/` |

### Isolation multi-tenant

Chaque requête authentifiée contient un claim JWT `tenant_id`.  
Le middleware `TenantMiddleware` résout `request.tenant`.  
Tous les modèles métier héritent de `TenantScopedModel` qui filtre automatiquement par tenant.

---

## Tests

### Backend

```bash
cd backend
source .venv/bin/activate

# Exécuter tous les tests
pytest

# Avec couverture
pytest --cov

# Tests d'un module spécifique
pytest apps/pedagogy/tests/ -k "test_period"

# Rapport de couverture HTML
pytest --cov-report=html
open htmlcov/index.html
```

Configuration pytest dans `backend/pytest.ini` :
- Marqueurs : `unit`, `integration`, `tenant_isolation`
- Module Django : `config.settings.development`

### Frontend

```bash
cd frontend

# Build de production (vérifie les erreurs de compilation)
pnpm build

# Linter ESLint
pnpm lint
```

---

## CI/CD

Deux workflows GitHub Actions (`.github/workflows/`) :

- **Backend CI** : Python 3.13, services PostgreSQL 16 + Redis 7, exécute `pytest` (seuil 80% de couverture)
- **Frontend CI** : Node.js 20, exécute `eslint` + `next build`

Déclenchés sur `push` et `pull_request` vers la branche `main`.

---

## Commandes utiles

```bash
# Backend - migrations
python manage.py makemigrations
python manage.py migrate
python manage.py showmigrations

# Backend - shell
python manage.py shell  # Django ORM shell
python manage.py shell_plus --ipython  # avec django-extensions

# Backend - créer un super admin
python manage.py createsuperuser

# Backend - migrations pour un module spécifique
python manage.py makemigrations pedagogy

# Frontend - dev
pnpm dev          # Next.js avec Turbopack
pnpm build        # Build production
pnpm start        # Lancer le build production

# Docker
docker compose up -d                    # Démarrer les services
docker compose down                     # Arrêter
docker compose logs -f                  # Logs en temps réel
docker compose exec db psql -U eduguinee -d eduguinee_dev  # Console PostgreSQL
```
