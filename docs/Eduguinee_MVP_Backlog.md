# BACKLOG MVP — EDUGUINÉE 3.0
## Découpage en épics et tickets, ordonné par dépendance technique

> **🗓 Dernière mise à jour :** 2026-07-20
> **📍 Avancement global :** Épics 0, 1, 2, 3, 4 & 5 ✅ terminés · Épic 6 🔜 en cours
> >
> | Épic | Statut | Commit(s) |
> |------|--------|-----------|
> | 0 — Setup & Infrastructure | ✅ **TERMINÉ** | `SETUP-01..05` |
> | 1 — Authentification & RBAC | ✅ **TERMINÉ** | `AUTH-01..04` |
> | 2 — Multi-tenant & Super Admin | ✅ **TERMINÉ** | `TENANT-01..05` |
> | 3 — Structure Pédagogique | ✅ **TERMINÉ** | `STRUCT-01..06` |
> | 4 — Élèves (inscription, réinscription) | ✅ **TERMINÉ** | `STUDENT-MVP-01..05` |
> | 5 — Présences | ✅ **TERMINÉ** | `ATT-01..03` |
> | 6 — Notes, Évaluations, Bulletins | 🔜 **EN COURS** | `GRADE-MVP-01` (modèles), `GRADE-MVP-02` (endpoints) |
> | 7..11 — Modules métier | ⏳ En attente | — |
> >
> **Couverture de tests :** 280 tests backend · **Build frontend :** ✅ 0 erreur · **`python manage.py check` :** ✅ 0 issue

**Basé sur :** Cahier des Charges Complet v2.0 + arbitrages MVP (offline reporté, App Parent en React Native, Orange Money seul en V1)
**Usage :** Chaque épic est un bloc de valeur livrable. Chaque ticket est copiable tel quel dans Trello/Jira/Linear. Ne pas démarrer un épic tant que ses dépendances ne sont pas closes — l'ordre proposé n'est pas arbitraire, chaque étape a besoin de la précédente pour être testable de bout en bout.

**Légende priorité :** 🔴 Bloquant (rien ne fonctionne sans) · 🟠 Haute (cœur du MVP) · 🟡 Moyenne (améliore l'expérience, peut glisser de quelques jours) · 🟢 Basse (confort, peut sortir du MVP si le planning se tend)
**Légende statut :** ✅ Livré · 🔜 En cours · ⏳ En attente · ⚠️ Partiellement livré

---

## Vue d'ensemble des épics

| # | Épic | Dépend de | Priorité |
|---|---|---|---|
| 0 | Setup & Infrastructure | — | 🔴 |
| 1 | Authentification & RBAC de base | 0 | 🔴 |
| 2 | Multi-tenant & Super Administration | 1 | 🔴 |
| 3 | Années scolaires, Classes, Niveaux, Matières | 2 | 🔴 |
| 4 | Élèves — fiche, inscription, réinscription | 3 | 🔴 |
| 5 | Présences | 4 | 🟠 |
| 6 | Notes, Évaluations, Bulletins | 4 | 🔴 |
| 7 | Finance — frais, paiements, Orange Money | 4 | 🔴 |
| 8 | Communication SMS | 5, 6, 7 | 🟠 |
| 9 | Application Parent (React Native) | 4, 6, 7, 8 | 🟠 |
| 10 | Application Enseignant (web responsive) | 5, 6 | 🟠 |
| 11 | QA, durcissement, déploiement pilote | Tous | 🔴 |

---

## ÉPIC 0 — Setup & Infrastructure ✅

**Objectif :** avoir un squelette de projet déployable avant d'écrire la moindre fonctionnalité métier.
**Statut :** ✅ **TERMINÉ**

### 🃏 [SETUP-01] Initialisation du projet Backend ✅
**Priorité :** 🔴 Bloquant
- [x] Initialiser le projet Django (`core` + structure `apps/*` : `authentication`, `superadmin`, `pedagogy`, `finance`, `monitoring`)
- [x] Configurer `.env` / `.env.example`, `INSTALLED_APPS`, `MIDDLEWARE`, `ROOT_URLCONF`
- [x] Configurer PostgreSQL comme base par défaut (dev via Docker Compose)
- [x] Installer et configurer DRF : pagination standard, filtrage (`django-filter`), gestion d'erreurs standardisée (`custom_exception_handler`)
- [x] Versionning API : préfixe `/api/v1/`
- [x] Documentation API : `drf-spectacular` + Swagger UI
**Labels :** `setup` `backend`

### 🃏 [SETUP-02] Initialisation du projet Frontend Web ✅
**Priorité :** 🔴 Bloquant
- [x] Initialiser Next.js 15 (App Router) + TypeScript
- [x] Installer shadcn/ui, Tailwind, Lucide icons
- [x] Structure de dossiers : `app/(auth)`, `app/(superadmin)`, `app/(app)`, `components/`, `lib/`, `hooks/`, `store/`, `types/`
- [x] Configurer le client Axios (`lib/api/client.ts`) avec intercepteurs (finalisé AUTH-04)
- [x] Palette de couleurs et typographie Eduguinée dans `tailwind.config.ts`
**Labels :** `setup` `frontend`

### 🃏 [SETUP-03] Initialisation de l'app React Native (Parent) ⏳
**Priorité :** 🟠 Haute
> ⏳ **Reporté à l'Épic 9** — dépend des modules métier (Élèves, Notes, Finance)
- [ ] Initialiser le projet avec Expo (managed workflow)
- [ ] Configurer la navigation (React Navigation), le state management (Zustand ou Redux Toolkit léger)
- [ ] Configurer le client API (Axios ou fetch wrapper) pointant vers l'API v1
- [ ] Configurer les notifications push (Expo Notifications / Firebase Cloud Messaging)
- [ ] Pipeline de build EAS (Expo Application Services) pour Android en priorité
**Labels :** `setup` `mobile`

### 🃏 [SETUP-04] CI/CD et environnements ✅
**Priorité :** 🔴 Bloquant
- [x] Pipeline GitHub Actions : lint → test → build (backend et frontend séparés)
- [x] Environnements dev / staging définis avec variables séparées
- [x] Déploiement staging automatique sur push vers `develop`
- [x] Stockage fichiers : MinIO en dev/staging (config S3-compatible dans `django-storages`)
**Labels :** `setup` `devops`

### 🃏 [SETUP-05] Stack asynchrone ✅
**Priorité :** 🟠 Haute
- [x] Installer et configurer Celery + Redis
- [x] `django-celery-beat` (tâches planifiées) et `django-celery-results`
- [x] Vérifier l'exécution d'une tâche de test (ex. envoi d'email de bienvenue asynchrone)
**Labels :** `setup` `backend` `celery`

---

## ÉPIC 1 — Authentification & RBAC de base ✅

**Objectif :** un utilisateur peut se connecter, obtenir un token, et le système sait qui il est et ce qu'il a le droit de faire.
**Dépend de :** Épic 0.
**Statut :** ✅ **TERMINÉ** — 33 tests, couverture 89%

### 🃏 [AUTH-01] Modèles User, Role, Permission ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `User` étendu (`AbstractUser`) : email unique, téléphone (+224), tenant (FK, nullable pour Super Admin), role (FK), custom_permissions (JSON), is_active, email_verified, phone_verified
- [x] Modèle `Role` : name, label, relation M2M avec `Permission`
- [x] Modèle `Permission` : codename format `module:action[:scope]`, module, description
- [x] Rôles MVP créés en fixture : `SUPER_ADMIN`, `DIRECTOR`, `STUDENT_STUDIES` (« Directeur des études / Scolarité »), `TEACHER`, `PARENT`
- [x] Helper `user.can(codename)` pour vérification de permission en code
- [x] Modèle `AuditLog` avec index composite `(tenant, created_at)` pour performance
**Labels :** `auth` `rbac` `backend`
> **Décision d'arbitrage :** codename format `module:action[:scope]` (ex: `notes:create:evaluation`) — source de vérité dans `Permission.codename`.

### 🃏 [AUTH-02] Endpoints d'authentification JWT ✅
**Priorité :** 🔴 Bloquant
- [x] Installer `djangorestframework-simplejwt` : access token 15 min, refresh token 7 jours, rotation + blacklist
- [x] `POST /auth/register/` — **NON IMPLÉMENTÉ en Épic 1** (intentionnel) : la création d'utilisateurs se fait via `POST /superadmin/schools/` en Épic 2 (TENANT-03)
- [x] `POST /auth/login/` — claims JWT personnalisés (`tenant_id`, `role`), rate-limit 10 req/min
- [x] `POST /auth/refresh/`
- [x] `POST /auth/logout/` (blacklist du refresh token)
- [x] `GET/PATCH /users/me/`
- [x] `GET /auth/permissions/me/` — retourne rôle + liste des codenames
- [x] Réponses d'erreur standardisées : 401 "Identifiants incorrects", 403 "Compte suspendu"
- [x] Protection anti brute-force (rate-limit via `django-ratelimit`, désactivé en dev/test)
**Labels :** `auth` `backend` `priorité-haute`

### 🃏 [AUTH-03] Permissions DRF et middleware tenant ✅
**Priorité :** 🔴 Bloquant
- [x] Classe de permission `HasPermission` réutilisable sur les ViewSets (`core/permissions.py`)
- [x] `TenantMiddleware` : extraction du `tenant_id` depuis le JWT, `request.tenant` injecté
- [x] Tests d'isolation : vérification 404 exact (jamais 403) pour ressources cross-tenant
- [x] CORS configuré (`corsheaders`) pour origines frontend
- [x] `TenantScopedModel` : base class avec `tenant` FK et indexation automatique
**Labels :** `auth` `multi-tenant` `sécurité` `priorité-haute`

### 🃏 [AUTH-04] Pages et flux d'authentification Frontend Web ✅
**Priorité :** 🔴 Bloquant
- [x] Page `/login` : email + mot de passe, validation Zod + react-hook-form, UI glassmorphism premium
- [x] Intégration Auth.js v5 (Credentials provider), JWT en session côté serveur Next.js
- [x] `getBackendClient()` : helper serveur avec `Authorization: Bearer <token>` injecté depuis la session
- [x] `middleware.ts` : protection des routes `/app/*` et `/superadmin/*` par rôle (Edge runtime)
- [x] Redirection post-login selon le rôle : `SUPER_ADMIN` → `/superadmin/dashboard`, autres → `/dashboard`
- [x] Gestion des erreurs : 401 → "Identifiants incorrects", 403 → "Compte suspendu"
- [x] Refresh automatique du token JWT dans le callback `jwt()` d'Auth.js (30s de marge)
**Labels :** `auth` `frontend`

### 🃏 [AUTH-05] Authentification mobile (Parent) ⏳
**Priorité :** 🟠 Haute
> ⏳ **Reporté à l'Épic 9** — dépend de SETUP-03 et des modules Élèves/Notes
- [ ] Écran de connexion React Native (téléphone + mot de passe ou OTP SMS)
- [ ] Stockage sécurisé des tokens (Expo SecureStore)
- [ ] Gestion du refresh automatique côté mobile
- [ ] Écran d'onboarding : association à un enfant via code fourni par l'école
**Labels :** `auth` `mobile`

---

## ÉPIC 2 — Multi-tenant & Super Administration

**Objectif :** l'équipe Eduguinée peut créer une école, celle-ci dispose immédiatement d'un espace isolé avec un compte directeur fonctionnel.
**Dépend de :** Épic 1.

### 🃏 [TENANT-01] Modèle Tenant et isolation applicative ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `Tenant` : id (UUID), name, slug (unique), code_minedu (optionnel), type, status (Active/Suspended/Trial/Cancelled), created_at, settings (JSONB)
- [x] Base `TenantScopedModel` prête pour héritage (avec FK `tenant`) et appliquée à `User` (les autres entités en hériteront à leur création en Épics 3/4/7)
- [x] Filtrage systématique par tenant dans chaque `get_queryset()` des ViewSets
- [x] Tests d'isolation : vérifier qu'aucune requête ne peut retourner des données d'un autre tenant
**Labels :** `multi-tenant` `backend` `priorité-haute`

### 🃏 [TENANT-02] Modèle Plan (simplifié V1) ✅
**Priorité :** 🟠 Haute
- [x] Modèle `Plan` : name, max_students, max_staff, price_monthly (2 plans suffisent en V1 : Starter / Pro, pas de logique de facturation SaaS automatisée)
- [x] Association `Tenant.plan` (FK)
- [ ] Middleware de contrôle de limite : blocage de création d'élève au-delà de `max_students` (utilitaire prêt, intégration en Épic 4)
**Labels :** `multi-tenant` `plans` `backend`

### 🃏 [TENANT-03] Création d'une école — workflow complet ✅
**Priorité :** 🔴 Bloquant
- [x] `POST /superadmin/schools/` : validations (nom unique, sous-domaine disponible, email non utilisé, téléphone valide)
- [x] Génération automatique du slug/sous-domaine
- [x] Attribution automatique du plan par défaut (essai 30 jours)
- [x] Création automatique du compte Directeur (mot de passe temporaire, changement obligatoire au premier login)
- [x] Service métier dédié `tenant_service.py` (pas de logique dans les vues)
**Labels :** `multi-tenant` `superadmin` `backend` `priorité-haute`

### 🃏 [TENANT-04] Gestion des écoles côté Super Admin ✅
**Priorité :** 🟠 Haute
- [x] `GET /superadmin/schools/` (filtres statut/plan/recherche)
- [x] `GET /superadmin/schools/{id}/`
- [x] `PATCH /superadmin/schools/{id}/suspend/` (soft uniquement en V1, hard en V2)
- [x] `PATCH /superadmin/schools/{id}/reactivate/`
- [x] Notification email/SMS au contact principal à chaque changement de statut (Celery async)
**Labels :** `multi-tenant` `superadmin` `backend`

### 🃏 [TENANT-05] Interface Super Admin ✅
**Priorité :** 🟠 Haute
- [x] Page `/superadmin/dashboard` : KPI cards (nb écoles, actives/suspendues/trial), liste des dernières écoles créées
- [x] Page `/superadmin/schools` : `DataTable` avec filtres, `StatusBadge`, actions (voir/suspendre/réactiver)
- [x] Page `/superadmin/schools/new` : formulaire de création avec affichage des identifiants temporaires générés
- [x] Page `/superadmin/schools/[id]` : détail (infos générales, plan, quotas d'utilisation, actions de statut)
**Labels :** `multi-tenant` `superadmin` `frontend`


---
## ÉPIC 3 — Années scolaires, Classes, Niveaux, Matières ✅

**Objectif :** l'école peut définir sa structure pédagogique (quand, quoi, dans quelle classe) avant d'y rattacher des élèves.
**Dépend de :** Épic 2.

### 🃏 [STRUCT-01] Année scolaire et périodes ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `SchoolYear` : tenant, label (ex. `2025-2026`), start_date, end_date, status (Préparation/Active/Clôturée), is_current
- [x] Modèle `AcademicPeriod` (trimestres) : school_year, nom, dates, statut, ordre — validation anti-chevauchement
- [x] `GET/POST /pedagogy/schoolyears/`, `GET/POST /pedagogy/school-years/{id}/periods/`
- [x] Une seule année "courante" par tenant (contrainte applicative)
- [ ] Blocage de toute saisie (note, présence, inscription) si l'année/la période est clôturée — utilitaires prêts, branchement reporté Épic 4+
**Labels :** `pédagogie` `backend` `priorité-haute`

### 🃏 [STRUCT-02] Niveaux et catalogue standard ✅
**Priorité :** 🟠 Haute
- [x] Modèle `Level` : tenant, cycle (Primaire/Collège/Lycée), name, order_index
- [x] 13 niveaux standards guinéens seedés automatiquement à la création de l'école
- [x] `GET /pedagogy/levels/` avec filtre par cycle
**Labels :** `pédagogie` `backend`

### 🃏 [STRUCT-03] Classes ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `SchoolClass` : tenant, school_year, level, name, capacity, room, main_teacher (FK nullable)
- [x] `GET/POST /pedagogy/classes/`, `GET /pedagogy/classes/{id}/`
- [ ] Alerte de capacité à 90 %, blocage à 100 % (dérogation directeur non prioritaire en V1 — simple blocage acceptable) — TODO Épic 4+
**Labels :** `pédagogie` `backend`

### 🃏 [STRUCT-04] Matières et coefficients ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `Subject` : tenant, code, name, category, is_official
- [x] Modèle `ClassSubject` : class, subject, coefficient, weekly_hours, teacher (FK nullable)
- [x] `GET/POST /pedagogy/subjects/`, `GET/POST /pedagogy/classes/{id}/subjects/`
- [x] Fixture d'un catalogue de matières standard (français, maths, etc.) pour démarrer rapidement
**Labels :** `pédagogie` `backend`

### 🃏 [STRUCT-05] Interface Admin École — structure pédagogique ✅
**Priorité :** 🟠 Haute
- [x] Page `/pedagogy/school-years` : liste, création, badge "année courante"
- [x] Page `/pedagogy/classes` : vue grille/liste par niveau, `Sheet` de création/édition
- [x] Section "Matières" dans le détail d'une classe (coefficient, enseignant)
**Labels :** `pédagogie` `frontend`

### 🃏 [STRUCT-06] Endpoint liste des enseignants (support formulaires) ✅
**Priorité :** 🟠 Haute
- [x] `GET /auth/teachers/` — liste des enseignants du tenant (id, first_name, last_name, email) pour alimenter les sélecteurs `main_teacher_id` (classe) et `teacher_id` (matière)
- [x] Nouvelle permission `authentication:read:teachers`, restreinte à `DIRECTOR` et `STUDENT_STUDIES` (migration `0002_add_read_teachers_permission`)
- [x] `TEACHER` exclu de l'accès à la liste
**Labels :** `pédagogie` `auth` `backend`

---

## ÉPIC 4 — Élèves (fiche, inscription, réinscription) ✅

**Objectif :** un élève peut être inscrit et rattaché à une classe, avec son responsable légal, prêt à être suivi pédagogiquement et financièrement.
**Statut :** ✅ **TERMINÉ**
**Dépend de :** Épic 3.

### 🃏 [STUDENT-MVP-01] Modèle Student et Enrollment ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `Student` : tenant, matricule (généré, format `{ANNEE}-{SEQ:05d}`), nom, prénom, date/lieu de naissance, sexe, photo, classe_actuelle (FK nullable), statut (ACTIF/SUSPENDU/TRANSFERE/SORTI/ARCHIVE), created_by
- [x] Modèle `Enrollment` : eleve, classe, annee_scolaire, type_inscription (NOUVELLE/REINSCRIPTION/TRANSFERT), date_inscription, inscrit_par
- [x] Génération automatique et unique du matricule par école/année (`MatriculeSequence`, SELECT FOR UPDATE)
- [x] Validation anti-doublon (nom + prénom + date de naissance) avec alerte, blocage si matricule identique
**Labels :** `élèves` `backend` `priorité-haute`

### 🃏 [STUDENT-MVP-02] Responsable légal (simplifié) ✅
**Priorité :** 🔴 Bloquant
- [x] Modèle `Guardian` : student (FK), type (Père/Mère/Tuteur/Autre), nom, téléphone (+224, regex validée), email (optionnel), lien de parenté
- [x] Minimum 1 responsable obligatoire à la création de l'élève (imposé dans la transaction `POST /students/`)
- [x] `GET/POST /students/{id}/guardians/`
- [x] *(Différé V2 : multi-responsables avancés, données médicales séparées, documents légaux)*
**Labels :** `élèves` `backend`

### 🃏 [STUDENT-MVP-03] Inscription (formulaire simple, pas le wizard 5 étapes) ✅
**Priorité :** 🔴 Bloquant
- [x] `POST /students/` : création élève + responsable + enrollment initial en une seule transaction
- [x] Validations métier : capacité classe, doublon (`?force=true` pour contourner), téléphone tuteur, année scolaire active
- [x] Génération du matricule et création de la fiche
- [x] Notification SMS au responsable (confirmation d'inscription) — stub Celery non bloquant, intégration réelle Épic 8
**Labels :** `élèves` `inscription` `backend` `priorité-haute`

### 🃏 [STUDENT-MVP-04] Consultation, modification, réinscription ✅
**Priorité :** 🟠 Haute
- [x] `GET /students/` (filtres classe/statut/année/recherche texte), pagination
- [x] `GET /students/{id}/`, `PATCH /students/{id}/`
- [x] `POST /students/{id}/reinscription/` : conditions (statut ACTIF, année cible OUVERTE ; décision ADMIS/REDOUBLE = TODO Épic 6)
- [x] `POST /students/{id}/archiver/` (jamais de suppression physique)

> **Permissions hors contrat (décision explicite du PO) :** le contrat d'API ne définit
> que `eleves:create`. Sur demande explicite, deux permissions supplémentaires ont été
> créées en Épic 4 pour distinguer lecture et écriture (migration `pedagogy.0010`) :
> - `eleves:read` → `GET /students/` + `GET /students/{id}/`
> - `eleves:update` → `PATCH /students/{id}/` + `POST /students/{id}/reinscription/` + `POST /students/{id}/archiver/`
>
> **Attribution (fixtures) :** `eleves:create`, `eleves:read` et `eleves:update` sont
> attribuées à **DIRECTOR** et **STUDENT_STUDIES** uniquement.
> **TEACHER n'a AUCUNE permission `eleves:*`** (ni lecture ni écriture) — pas d'accès
> à la liste ni à la fiche élève via ces endpoints.
>
> ⚠️ Ces codenames n'existent volontairement dans aucun des 4 documents de référence :
> c'est une extension assumée, tracée ici pour mémoire.

**Labels :** `élèves` `backend`

### 🃏 [STUDENT-MVP-05] Interface Admin École — Élèves ✅
**Priorité :** 🟠 Haute
- [x] Page `/students` : `DataTable` paginée (matricule, nom, classe, statut, tuteur), filtres, export CSV
- [x] Page `/students/new` : formulaire simple en une page (identité + tuteur + classe), validation Zod
- [x] Page `/students/[id]` : fiche élève avec tabs (Profil / Notes / Finances / Historique)
**Labels :** `élèves` `frontend` `priorité-haute`

---

## ÉPIC 5 — Présences ✅ **TERMINÉ**

**Objectif :** l'enseignant peut faire l'appel, et un parent est notifié en cas d'absence.
**Dépend de :** Épic 4.

### 🃏 [ATT-01] Modèle et saisie des présences ✅
**Priorité :** 🟠 Haute · **Commit :** `ATT-01`
- [x] Modèle `Attendance` : tenant, student, classe, date, status (PRESENT/ABSENT/ABSENT_JUSTIFIE/RETARD), minutes_late, justification_text, created_by, is_locked ; `UniqueConstraint(student, date)`, index `(classe, date)` + `(tenant, created_at)`
- [x] `POST /pedagogy/attendances/` — **saisie batch uniquement** (`classe_id` + `date` + `records[]`) ; `409` si présences déjà saisies, `422` si élève hors classe ; réponse `sms_queued_for` (élèves ABSENT joignables, calcul synchrone)
- [x] `GET /pedagogy/attendances/` (filtres classe_id/student_id/date/date_from/date_to, lecture ouverte à tout rôle authentifié)
- [x] `PATCH /pedagogy/attendances/{id}/` — correction générique ⚠️ **hors contrat** (résout l'incohérence du message 409, cf. contrat §5/§10) ; `422` si verrouillé
- [x] Verrouillage 24h via tâche **Celery Beat** `lock_stale_attendances` (`PeriodicTask` horaire) — déverrouillage V1 = **Django Admin uniquement**
- [x] Permission `attendance:create` → DIRECTOR / STUDENT_STUDIES / TEACHER
- [x] Stub SMS absence (envoi réel différé à l'Épic 8)
**Labels :** `présences` `backend`

### 🃏 [ATT-02] Justification d'absence (simplifiée V1) ✅
**Priorité :** 🟡 Moyenne · **Commit :** `ATT-02`
- [x] `PATCH /pedagogy/attendances/{id}/justify/` (texte `justification_text`, sans upload de document en V1) → statut `ABSENT_JUSTIFIE`, `422` si verrouillé
- [x] Permission `attendance:justify` → DIRECTOR / STUDENT_STUDIES **uniquement** (TEACHER exclu)
- [x] *(Différé V2 : upload de certificat médical, mode QR code, statistiques avancées)*
**Labels :** `présences` `backend`

### 🃏 [ATT-03] Interface de saisie des présences ✅
**Priorité :** 🟠 Haute · **Commit :** `ATT-03`
- [x] Page `/attendance` : sélection classe + date, liste des élèves avec statut en ligne (select inline) — mode saisie (batch) et mode correction (PATCH / justify) selon présence de données
- [x] Bouton "Enregistrer tout" (soumission batch) + raccourcis "Marquer tous"
- [x] Indicateur d'assiduité par élève dans sa fiche (onglet Présences : taux, présences/absences/retards + historique)
- [x] Entrée "Présences" dans la barre latérale
**Labels :** `présences` `frontend`

---
## ÉPIC 6 — Notes, Évaluations, Bulletins

**Objectif :** l'enseignant saisit des notes, le directeur valide, un bulletin PDF est généré.
**Dépend de :** Épic 4 (élèves rattachés à une classe et des matières).

### 🃏 [GRADE-MVP-01] Modèle Evaluation et Grade ✅
**Priorité :** 🔴 Bloquant · **Commit :** `GRADE-MVP-01`
- [x] Modèle `Evaluation` : tenant, class_obj, subject, period, teacher, type (CC/DS), title, max_score, coefficient, date, is_locked, is_published *(schéma §3.4 — noms réels : `class_obj`/`max_score`, + `period`/`is_locked` ; pas de `school_year`, dérivé via period)*
- [x] Modèle `Grade` : tenant, student, evaluation, score, is_absent, note_convertie (calculée), comment, created_by, is_validated (bool), validated_by, validated_at *(schéma §3.4 — diviseur = `Evaluation.max_score`, pas de champ `note_sur` ; `is_validated` et non `valide`)*
- [x] Conversion automatique : `note_convertie = (score / max_score) × 20` (dans `Grade.save()`)
- [x] Rejet de toute note convertie hors de l'intervalle [0, 20] (`CheckConstraint` + `unique(student, evaluation)`)
- [x] Isolation multi-tenant + index `(tenant, created_at)` (table à forte croissance, schéma §perf)
- [x] Tests modèle (12) : conversion barèmes 20/40/10, borne [0,20], unicité, ABS → note_convertie null
**Labels :** `notes` `backend` `priorité-haute`

### 🃏 [GRADE-MVP-02] Saisie et validation ✅
**Priorité :** 🔴 Bloquant · **Commit :** `GRADE-MVP-02`
- [x] `POST /pedagogy/evaluations/` — création (TEACHER scoped, DIRECTOR, STUDENT_STUDIES)
- [x] `POST /pedagogy/grades/bulk/` — saisie en masse, rejet individuel avec `warnings`, ABS→score null, 422 si verrouillé
- [x] `PATCH /pedagogy/evaluations/{id}/lock/` — hard-block 422 si notes manquantes, 422 si déjà verrouillé
- [x] `POST /grades/{id}/valider/` — DIRECTOR seul, verrouillage requis, audit_log ; `is_published` auto quand toutes validées
- [x] `PATCH /grades/{id}/modifier-apres-validation/` — DIRECTOR + justification obligatoire, reset validation + is_published
- [x] Permissions seedées (`notes:create:evaluation`, `notes:read`, `notes:lock`, `notes:validate`) + mapping rôles (DIRECTOR, STUDENT_STUDIES, TEACHER, PARENT)
- [x] Tests endpoint (21) : création, scope TEACHER, tenant isolation, verrouillage, bulk, validation, modification
**Labels :** `notes` `backend` `priorité-haute`

### 🃏 [GRADE-MVP-03] Calcul des moyennes et bulletin
**Priorité :** 🔴 Bloquant
- [ ] `GET /students/{id}/moyenne/` : **formule à deux niveaux** (arbitrage CDC §749 + glossaire §1479, cf. `docs/Eduguinee_Epic6_Analyse.md` §6), jamais stockée, toujours recalculée :
  - Niveau 1 (par matière) : `Σ(note_convertie × Evaluation.coefficient) / Σ(Evaluation.coefficient)`
  - Niveau 2 (générale) : `Σ(moyenne_matière × ClassSubject.coefficient) / Σ(ClassSubject.coefficient)`
  - **Arrondi académique (CDC §751)** appliqué **uniquement à l'affichage final** (sérialisation JSON), jamais sur les valeurs intermédiaires (voir note ⚠️ ci-dessous)
- [ ] Matières sans note saisie exclues du calcul
- [ ] `GET /classes/{id}/classement/` : classement de classe (règle de départage simplifiée en V1 : moyenne générale puis ordre alphabétique)
  - **⚠️ Dette V2 explicite** — départage complet CDC §752 (moyenne générale → nb mentions Très Bien → nb mentions Bien → moyenne Français → moyenne Maths → ordre alphabétique) reporté en V2 ; le MVP s'arrête à « moyenne générale → ordre alphabétique »
  - **⚠️ Précision de calcul (arbitrage 2026-07-20)** — la moyenne par matière est calculée en pleine précision décimale et réutilisée telle quelle (non arrondie) au niveau 2 ; l'arrondi CDC §751 n'intervient qu'à la sérialisation des valeurs `moyenne` renvoyées. Redonner la formule complète avec arrondi au PO **avant** de coder le service (calcul le plus sensible du MVP, impact passage/redoublement)
- [ ] Génération PDF du bulletin trimestriel (template HTML → PDF, tâche Celery asynchrone) : identité élève/école, tableau matières/notes/coefficients, moyenne générale, rang, mentions automatiques (Excellent/TB/Bien/AB/Passable/Insuffisant)
- [ ] `GET /students/{id}/bulletin/{period_id}/`
**Labels :** `notes` `bulletins` `backend` `priorité-haute`

### 🃏 [GRADE-MVP-04] Décision de fin de trimestre/année (simplifiée)
**Priorité :** 🟡 Moyenne — ✅ Terminé (backend)
- [x] Modèle `YearEndDecision` : eleve, annee_scolaire, classe_origine, classe_destination, decision (Admis/Redouble/Exclu), moyenne_annuelle (snapshot), prise_par, date_decision
- [x] `POST /year-end-decisions/` (saisie manuelle par le Directeur, pas d'algorithme de suggestion automatique en V1)
- [x] `POST /promotions/bulk/` (traitement groupé simple : appliquer la classe destination à tous les élèves Admis d'une classe)
- [x] `GET /year-end-decisions/` (liste avec filtres school_year, student — permission notes:read)
**Dette V2 explicite :** Règle de calcul de `moyenne_annuelle` (moyenne simple des moyennes générales par période) non confirmée par un expert pédagogique guinéen — à valider avec un directeur d'école.
**Labels :** `notes` `fin-année` `backend`

### 🃏 [GRADE-MVP-05] Interface de saisie et consultation des notes
**Priorité :** 🟠 Haute
- [x] Page `/app/grades` : sélecteurs en cascade (année → classe → matière → période → type), tableau de saisie avec note convertie calculée en temps réel
- [x] Boutons "Enregistrer" et "Verrouiller" (selon permission : TEACHER/DIRECTOR/STUDENT_STUDIES)
- [x] Création inline d'évaluation si aucune n'existe pour la combinaison
- [x] Distinction visuelle note provisoire vs validée (badge)
- [x] Affichage des warnings de notes rejetées par l'API
- [x] Filtrage matière par enseignant (TEACHER) ou complet (DIRECTOR/STUDENT_STUDIES)
- [x] Page `/app/students/[id]/notes` : moyennes par matière, moyenne générale, mention
- [x] Bouton de téléchargement du bulletin PDF depuis la fiche élève (async + polling)
- [x] Page `/app/year-end-decisions` : promotion groupée
- [x] Décision individuelle dans l'onglet Notes de la fiche élève
**Labels :** `notes` `frontend` `priorité-haute`

---

## ÉPIC 7 — Finance (frais, paiements, Orange Money)

**Objectif :** l'école peut définir des frais, encaisser un paiement (espèces ou Orange Money), et générer une facture.
**Dépend de :** Épic 4 (élève existant pour lui associer des frais).

### 🃏 [FIN-MVP-01] Catégories de frais et frais élève
**Priorité :** 🔴 Bloquant
- [ ] Modèle `FeeCategory` : tenant, name, type (Inscription/Scolarité — les autres catégories type Cantine/Transport différées V2), amount, is_mandatory
- [ ] Modèle `StudentFee` : tenant, student, fee_category, total_amount, discount_amount, balance_due
- [ ] `GET/POST /finance/feecategories/`, `GET /finance/students/{id}/fees/`
**Labels :** `finance` `backend` `priorité-haute`

### 🃏 [FIN-MVP-02] Paiement en espèces
**Priorité :** 🔴 Bloquant
- [ ] Modèle `Payment` : tenant, student, amount, payment_date, method (Cash/Orange_Money), reference, received_by, status, receipt_number (unique, idempotence)
- [ ] `POST /finance/payments/` : mise à jour automatique du solde de l'élève
- [ ] Génération automatique du numéro de reçu et du PDF de reçu
- [ ] `GET /finance/payments/` (filtres méthode/statut/dates)
**Labels :** `finance` `backend` `priorité-haute`

### 🃏 [FIN-MVP-03] Intégration Orange Money
**Priorité :** 🔴 Bloquant
- [ ] Interface abstraite `PaymentProvider` (`initiate_payment()`, `check_status()`, `webhook_verify()`) — même si un seul opérateur en V1, prévoir l'abstraction pour ajouter MTN/Wave sans réécrire
- [ ] Implémentation `OrangeMoneyProvider` (API REST Orange Money Guinée)
- [ ] `POST /webhooks/orange-money/` : réception de la confirmation de paiement
- [ ] Génération de référence unique par transaction (idempotence), retry avec backoff en cas d'échec (3 tentatives)
- [ ] Réconciliation nocturne simple (tâche Celery) : comparaison transactions Orange vs base interne
- [ ] Chiffrement de la clé API Orange (variables d'environnement sécurisées, pas en clair dans le repo)
**Labels :** `finance` `mobile-money` `intégrations` `priorité-haute`

### 🃏 [FIN-MVP-04] Factures
**Priorité :** 🟠 Haute
- [ ] Modèle `Invoice` : tenant, student, school_year, total_due, total_paid, balance, status (Pending/Paid/Overdue), pdf_url
- [ ] `GET /finance/invoices/`
- [ ] `POST /finance/invoices/{id}/generate-pdf/` (tâche Celery)
**Labels :** `finance` `backend`

### 🃏 [FIN-MVP-05] Interface Finance
**Priorité :** 🟠 Haute
- [ ] Page `/app/finance/fees` : liste des catégories de frais, création/édition
- [ ] Page `/app/finance/payments` : formulaire d'enregistrement (élève en autocomplete, montant, méthode, référence), impression du reçu
- [ ] Liste des paiements avec filtres et totaux
- [ ] Page `/app/finance/invoices` : liste, génération PDF, vue détail (dû/payé/solde)
**Labels :** `finance` `frontend` `priorité-haute`

---

## ÉPIC 8 — Communication SMS

**Objectif :** les parents reçoivent une notification SMS pour les événements clés, sans intervention manuelle.
**Dépend de :** Épics 5, 6, 7 (les événements déclencheurs doivent exister).

### 🃏 [COMM-MVP-01] Intégration Africa's Talking (SMS)
**Priorité :** 🟠 Haute
- [ ] Service d'envoi SMS (Africa's Talking API), sender ID "EDUGUINEE"
- [ ] Tâche Celery asynchrone pour l'envoi (ne jamais bloquer une requête utilisateur sur l'envoi SMS)
- [ ] Gestion des échecs (retry limité, log si échec définitif)
**Labels :** `communication` `sms` `intégrations`

### 🃏 [COMM-MVP-02] Déclencheurs automatiques
**Priorité :** 🟠 Haute
- [ ] Signal Django post-save : absence enregistrée → SMS immédiat au responsable
- [ ] Signal : paiement reçu → SMS de confirmation avec référence du reçu
- [ ] Signal : note validée / bulletin publié → SMS de notification
- [ ] Signal : nouvelle inscription confirmée → SMS de bienvenue avec identifiants de l'app parent
- [ ] Throttling simple : max 3 SMS/jour par famille (protection budget)
**Labels :** `communication` `sms` `celery`

---
## ÉPIC 9 — Application Parent (React Native)

**Objectif :** un parent peut consulter les notes/absences/finances de son enfant et payer directement depuis son téléphone.
**Dépend de :** Épics 4, 6, 7, 8 (les données à afficher doivent déjà exister côté backend).

### 🃏 [PARENT-01] Onboarding et authentification
**Priorité :** 🟠 Haute
- [ ] Écran de connexion (téléphone + mot de passe)
- [ ] Association à un enfant via code fourni par l'école à l'inscription
- [ ] Gestion multi-enfants (bascule rapide entre profils si plusieurs enfants dans l'école)
**Labels :** `mobile` `parent` `auth`

### 🃏 [PARENT-02] Vue synthétique enfant
**Priorité :** 🟠 Haute
- [ ] Écran d'accueil : photo, classe, moyenne générale actuelle, taux de présence, solde financier
- [ ] Liste des dernières notifications
**Labels :** `mobile` `parent`

### 🃏 [PARENT-03] Consultation notes et absences
**Priorité :** 🟠 Haute
- [ ] Écran "Notes" : détail par matière et par période
- [ ] Écran "Absences" : historique avec statut (justifiée/non justifiée)
**Labels :** `mobile` `parent`

### 🃏 [PARENT-04] Paiement Mobile Money in-app
**Priorité :** 🔴 Bloquant
- [ ] Écran "Finances" : solde dû, historique des paiements
- [ ] Déclenchement d'un paiement Orange Money depuis l'app (redirection app opérateur ou saisie de code)
- [ ] Suivi du statut de paiement en temps réel (polling après initiation)
- [ ] Téléchargement du reçu PDF après confirmation
**Labels :** `mobile` `parent` `finance` `priorité-haute`

### 🃏 [PARENT-05] Notifications push
**Priorité :** 🟡 Moyenne
- [ ] Intégration Expo Notifications / Firebase Cloud Messaging
- [ ] Réception des mêmes événements que les SMS (absence, paiement, note) en push si l'app est installée
**Labels :** `mobile` `parent` `notifications`

### 🃏 [PARENT-06] Publication sur les stores
**Priorité :** 🟡 Moyenne
- [ ] Build EAS Android (prioritaire), soumission Play Store (interne/fermé pour le pilote)
- [ ] Build iOS en parallèle si ressources suffisantes (App Store optionnel en V1 stricte)
**Labels :** `mobile` `déploiement`

---

## ÉPIC 10 — Application Enseignant (web responsive)

**Objectif :** un enseignant peut saisir présences et notes depuis un navigateur mobile, sans architecture offline complète.
**Dépend de :** Épics 5, 6.

### 🃏 [TEACH-01] Dashboard enseignant simplifié
**Priorité :** 🟠 Haute
- [ ] Page `/app/teacher/dashboard` : liste des cours du jour, accès rapide "Présences" et "Notes" pour chaque classe
- [ ] Filtrage automatique : l'enseignant ne voit que ses propres classes/matières
**Labels :** `frontend` `enseignant`

### 🃏 [TEACH-02] Résilience réseau basique (sans offline complet)
**Priorité :** 🟠 Haute
- [ ] Sauvegarde de brouillon en `localStorage` pendant la saisie (pas de vraie synchronisation offline, juste une protection contre la perte de saisie en cas de coupure de page)
- [ ] Message d'erreur clair et bouton "Réessayer" en cas d'échec réseau à la soumission
- [ ] Indicateur visuel de statut réseau (connecté/déconnecté)
- [ ] *(Différé V2 : architecture offline complète avec IndexedDB, Service Worker, sync queue — voir CDC §23.6)*
**Labels :** `frontend` `enseignant` `résilience`

### 🃏 [TEACH-03] Accès aux interfaces Présences et Notes
**Priorité :** 🟠 Haute
- [ ] Réutilisation des interfaces `/app/pedagogy/attendance` et `/app/grades` (épics 5 et 6) avec permissions restreintes à l'enseignant connecté
**Labels :** `frontend` `enseignant`

---

## ÉPIC 11 — QA, durcissement, déploiement pilote

**Objectif :** le MVP est fiable, sécurisé et prêt pour 1 à 3 écoles réelles.
**Dépend de :** tous les épics précédents.

### 🃏 [QA-01] Tests automatisés critiques
**Priorité :** 🔴 Bloquant
- [ ] Tests d'isolation multi-tenant (aucune fuite de données entre écoles)
- [ ] Tests RBAC : chaque rôle sur chaque endpoint sensible
- [ ] Tests de calcul des moyennes et conversions de notes
- [ ] Tests du flux de paiement Orange Money (mock du webhook)
- [ ] Couverture cible : 70 %+ sur les services métier critiques
**Labels :** `tests` `qualité`

### 🃏 [QA-02] Scénarios de bout en bout
**Priorité :** 🔴 Bloquant
- [ ] Scénario : inscription élève → paiement → reçu généré
- [ ] Scénario : appel de présences → SMS envoyé au parent
- [ ] Scénario : saisie notes → validation → bulletin PDF généré → consultable côté parent
- [ ] Scénario : paiement Orange Money → webhook → solde mis à jour → notification
**Labels :** `tests` `e2e`

### 🃏 [QA-03] Sécurité et conformité minimale
**Priorité :** 🔴 Bloquant
- [ ] Audit rapide OWASP Top 10 (pas de pentest complet en V1, mais vérification des bases : injections, XSS, CSRF)
- [ ] Vérification : aucun token en localStorage côté web, cookies httpOnly uniquement
- [ ] Sauvegarde PostgreSQL quotidienne automatisée + test de restauration
**Labels :** `sécurité` `production`

### 🃏 [QA-04] Déploiement pilote
**Priorité :** 🔴 Bloquant
- [ ] Configuration Gunicorn + Nginx en production
- [ ] Monitoring basique : Sentry (erreurs) + alertes simples (uptime)
- [ ] Onboarding de la première école pilote (création tenant, formation de l'équipe école)
- [ ] Documentation utilisateur minimale (guide PDF pour Directeur/Secrétaire/Enseignant/Parent)
**Labels :** `déploiement` `production` `priorité-haute`

---

## Prochaine étape suggérée

Une fois ce backlog validé, l'ordre d'exécution recommandé pour une petite équipe (2 backend, 2 frontend, 1 mobile) est de dérouler les épics dans l'ordre ci-dessus, avec un chevauchement possible dès l'Épic 3 :

- **Semaines 1-2 :** Épic 0 + Épic 1
- **Semaines 3-4 :** Épic 2 + début Épic 3
- **Semaines 5-7 :** Épic 3 + Épic 4
- **Semaines 8-9 :** Épic 5 + Épic 6 (en parallèle backend/frontend)
- **Semaines 10-11 :** Épic 7 (Finance + Orange Money — prévoir une marge, c'est le point le plus risqué techniquement)
- **Semaine 12 :** Épic 8 (Communication)
- **Semaines 13-15 :** Épic 9 (App Parent) en parallèle de la finition web
- **Semaine 16 :** Épic 10 + Épic 11, durcissement, déploiement pilote

Soit environ **4 mois** pour une équipe de 5 personnes, POC Orange Money à sortir dès la semaine 5-6 en parallèle (avant l'épic 7) pour lever le risque technique le plus tôt possible.
