# CONTRAT D'API DÉTAILLÉ — MVP EDUGUINÉE 3.0
## Spécification requête/réponse, endpoint par endpoint

**Périmètre :** épics 2 à 7 du backlog MVP, aligné sur `Eduguinee_MVP_Schema.md`. Chaque endpoint est spécifié avec sa méthode, son authentification requise, sa permission, le payload exact de requête et de réponse, et ses cas d'erreur spécifiques.

**Usage :** ce document permet au backend et au frontend de travailler en parallèle sans attendre que l'un ait fini pour que l'autre commence — le frontend peut mocker ces réponses exactes pendant que le backend les implémente.

---

## 0. Conventions générales

### 0.1 Base URL et versionning

```
https://api.eduguinee.gn/api/v1
```

### 0.2 Authentification

Toutes les requêtes (sauf `/auth/login/`, `/auth/refresh/`) portent un header :

```
Authorization: Bearer <access_token>
```

Le `tenant_id` n'est **jamais** passé en paramètre par le client — il est extrait du JWT côté serveur (claim `tenant_id`). Un utilisateur `SUPER_ADMIN` a un token sans `tenant_id` (accès plateforme uniquement, endpoints `/superadmin/*`).

**Claims JWT (access token) :**
```json
{
  "user_id": "3f1a2b4c-...",
  "tenant_id": "9c8d7e6f-...",
  "role": "DIRECTOR",
  "exp": 1735900000
}
```

### 0.3 Enveloppe de réponse standard

**Succès :**
```json
{
  "status": "success",
  "data": { }
}
```

**Erreur :**
```json
{
  "status": "error",
  "message": "Données invalides",
  "errors": {
    "telephone": ["Le format doit être +224XXXXXXXXX"]
  }
}
```

Le champ `errors` n'apparaît que pour les `400` (erreurs de validation champ par champ). Pour les `401/403/404/500`, seul `message` est présent.

### 0.4 Pagination (listes)

Toutes les listes sont paginées par défaut (`page_size` par défaut : 25, max : 100).

**Requête :** `GET /students/?page=2&page_size=25`

**Réponse :**
```json
{
  "status": "success",
  "data": {
    "count": 143,
    "next": "https://api.eduguinee.gn/api/v1/students/?page=3&page_size=25",
    "previous": "https://api.eduguinee.gn/api/v1/students/?page=1&page_size=25",
    "results": [ ]
  }
}
```

### 0.5 Filtrage et tri

Convention uniforme sur toutes les listes : `?champ=valeur` pour un filtre exact, `?ordering=champ` (croissant) ou `?ordering=-champ` (décroissant), `?search=texte` pour une recherche libre quand elle est supportée (indiqué endpoint par endpoint).

### 0.6 Sérialisation des types

| Type | Format JSON | Exemple |
|---|---|---|
| UUID | string | `"3f1a2b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c"` |
| Date | string ISO 8601 (`YYYY-MM-DD`) | `"2025-09-15"` |
| DateTime | string ISO 8601 avec fuseau | `"2025-09-15T08:30:00Z"` |
| Montant / décimal | **string** (jamais un float — évite les erreurs d'arrondi JS) | `"250000.00"` |
| Booléen | bool JSON | `true` |
| Enum | string (valeur du `TextChoices`) | `"ACTIF"` |

**Important pour le frontend :** parser les montants avec une librairie décimale (`decimal.js` ou équivalent) plutôt que `parseFloat()`, pour éviter les erreurs de précision sur des montants en GNF à 6-7 chiffres.

### 0.7 Codes d'erreur HTTP utilisés

| Code | Signification |
|---|---|
| `200` | Succès (GET, PATCH, POST sans création) |
| `201` | Ressource créée (POST) |
| `204` | Succès sans contenu (DELETE, actions type "lock") |
| `400` | Validation échouée |
| `401` | Non authentifié / token expiré |
| `403` | Authentifié mais permission insuffisante |
| `404` | Ressource introuvable ou hors du tenant courant (jamais de distinction — une ressource d'un autre tenant renvoie 404, pas 403, pour ne pas révéler son existence) |
| `409` | Conflit (ex. double inscription, capacité de classe atteinte) |
| `422` | Règle métier violée (ex. année scolaire clôturée) |
| `500` | Erreur serveur |

---

## 1. Authentification (Épic 1)

### `POST /auth/login/`
**Auth :** aucune

**Requête :**
```json
{
  "email": "directeur@ecole-exemple.gn",
  "password": "MotDePasse123!"
}
```

**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "user": {
      "id": "3f1a2b4c-...",
      "email": "directeur@ecole-exemple.gn",
      "first_name": "Mamadou",
      "last_name": "Diallo",
      "role": "DIRECTOR",
      "must_change_password": false,
      "tenant": {
        "id": "9c8d7e6f-...",
        "name": "Groupe Scolaire Les Palmiers",
        "slug": "les-palmiers"
      }
    }
  }
}
```

**Erreurs :**
- `401` : `{"status": "error", "message": "Identifiants incorrects"}`
- `403` : `{"status": "error", "message": "Compte suspendu"}` (si `Tenant.status = SUSPENDED_HARD`)

> **Changement de comportement (SUPERADMIN-V2-01, 2026-07-30) :** avant ce ticket, un seul statut `SUSPENDED` bloquait systématiquement la connexion. Il est remplacé par deux statuts distincts :
> - `SUSPENDED_HARD` : connexion refusée comme ci-dessus (message et code inchangés).
> - `SUSPENDED_SOFT` : **la connexion reste autorisée** (200) — la consultation/export doit rester accessible, ce qui exige un token. L'écriture (POST/PUT/PATCH/DELETE) est bloquée par `TenantMiddleware` sur chaque requête authentifiée, quel que soit l'endpoint, avec `403 {"message": "Cet établissement est en accès lecture seule — écriture non autorisée."}`.
>
> **Correctif de sécurité découvert en marge :** `TenantMiddleware` ne bloquait auparavant aucune requête (flag posé mais jamais lu) — un token émis avant la suspension du tenant restait utilisable indéfiniment, y compris en écriture. Le middleware applique désormais réellement la règle ci-dessus à chaque requête, pas seulement à la connexion.

### `POST /auth/refresh/`
**Auth :** aucune (refresh token dans le body)

**Requête :** `{"refresh_token": "eyJhbGciOi..."}`

**Réponse `200` :** `{"status": "success", "data": {"access_token": "eyJhbGciOi..."}}`

**Erreur `401` :** refresh token expiré ou blacklisté → le frontend redirige vers `/login`.

### `POST /auth/logout/`
**Auth :** JWT — **Requête :** `{"refresh_token": "eyJhbGciOi..."}` (mis en blacklist) — **Réponse `204`**

### `POST /auth/change-password/` ⚠️ *(AUTH-06 — ajout post-contrat)*
**Auth :** JWT
**Requête :**
```json
{
  "old_password": "SecurePass123!",
  "new_password": "NouveauMotDePasse456!",
  "new_password_confirm": "NouveauMotDePasse456!"
}
```
**Réponse `200` :**
```json
{"status": "success", "data": {"message": "Mot de passe modifié avec succès."}}
```
**Erreurs :**
- `400` : ancien mot de passe incorrect, nouveau trop court (< 12), confirm différent, ou nouveau identique à l'ancien.
- `403` : si le token est absent (IsAuthenticated) ou si le compte a `must_change_password=True` et que la requête n'est pas sur cet endpoint ou `/auth/logout/`.

**Note :** cet endpoint est le seul (avec `/auth/logout/`) accessible quand le flag `must_change_password=True` est actif. Le middleware `MustChangePasswordMiddleware` bloque tous les autres endpoints (y compris `/users/me/` et `/auth/permissions/me/`) avec un `403` explicite : `"Vous devez changer votre mot de passe."`.

### `GET /users/me/`
**Auth :** JWT

**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "id": "3f1a2b4c-...",
    "email": "directeur@ecole-exemple.gn",
    "phone": "+224620000000",
    "first_name": "Mamadou",
    "last_name": "Diallo",
    "role": "DIRECTOR",
    "is_email_verified": true,
    "is_phone_verified": false
  }
}
```

### `PATCH /users/me/`
**Requête (champs modifiables uniquement) :** `{"phone": "+224620000001", "first_name": "Mamadou"}`
**Réponse `200` :** objet utilisateur mis à jour, même forme que `GET /users/me/`

### `GET /auth/permissions/me/`
**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "role": "TEACHER",
    "permissions": ["notes:create:evaluation", "notes:read:own_subject", "attendance:create"]
  }
}
```

---

## 1b. Gestion du personnel (STAFF-MVP-01/02) ⚠️ *(ajout post-contrat — Épic 6.1)*

### `GET /auth/staff/`
**Auth :** JWT, permission `staff:read` (`DIRECTOR`/`STUDENT_STUDIES`).

**Query params :** `?role__name=TEACHER&is_active=true&search=Diallo&ordering=-first_name`

**Réponse `200` :** liste paginée (cf. §0.4), chaque élément :
```json
{
  "id": "3f1a2b4c-...",
  "email": "enseignant@ecole.gn",
  "first_name": "Aissatou",
  "last_name": "Bah",
  "phone": "+224620000010",
  "role": {"name": "TEACHER", "label": "Enseignant"},
  "is_active": true,
  "subjects_taught": ["MATH", "PC"],
  "date_joined": "2026-07-22T10:00:00Z"
}
```

### `POST /auth/staff/`
**Auth :** JWT, permission `staff:create` (`DIRECTOR` uniquement).

**Requête :**
```json
{
  "email": "enseignant@ecole.gn",
  "first_name": "Aissatou",
  "last_name": "Bah",
  "role": "TEACHER",
  "phone": "+224620000010",
  "subjects_taught": ["MATH"]
}
```
`role` accepte `TEACHER` ou `STUDENT_STUDIES`. `DIRECTOR` est refusé par ce service (réservé au Super Admin via TENANT-03).

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "3f1a2b4c-...",
    "email": "enseignant@ecole.gn",
    "first_name": "Aissatou",
    "last_name": "Bah",
    "role": {"name": "TEACHER", "label": "Enseignant"},
    "is_active": true,
    "must_change_password": true,
    "subjects_taught": ["MATH"],
    "temporary_password": "Xk9$mP2q@F3!",
    "date_joined": "2026-07-22T10:00:00Z"
  }
}
```

> Le `temporary_password` n'est renvoyé qu'une seule fois, dans cette réponse (comme TENANT-03).

**Erreur `400` :** email déjà utilisé, téléphone invalide, rôle non autorisé.

### `GET /auth/staff/{id}/`
**Auth :** JWT, permission `staff:read`.
**Réponse `200` :** même forme que la création sans `temporary_password`.

### `PATCH /auth/staff/{id}/`
**Auth :** JWT, permission `staff:update` (`DIRECTOR` uniquement).

**Champs modifiables en V1 :**
- `first_name`, `last_name`, `phone`, `subjects_taught`
- **Pas l'email** (identifiant de connexion, dette V2 avec reverification)
- **Pas le rôle** (fixé à la création, dette V2)

**Requête :**
```json
{"first_name": "NouveauPrenom", "phone": "+224620000011"}
```
**Réponse `200` :** objet complet mis à jour.

### `PATCH /auth/staff/{id}/disable/`
**Auth :** JWT, permission `staff:disable` (`DIRECTOR` uniquement).
**Réponse `200` :** `{"status": "success", "data": {"id": "...", "is_active": false}}`
**Erreur `400` :** si déjà désactivé.

### `PATCH /auth/staff/{id}/enable/`
**Auth :** JWT, permission `staff:disable` (`DIRECTOR` uniquement).
**Réponse `200` :** `{"status": "success", "data": {"id": "...", "is_active": true}}`
**Erreur `400` :** si déjà actif.

---

## 2. Super Administration (Épic 2)

### `POST /superadmin/schools/`
**Auth :** JWT, rôle `SUPER_ADMIN`

**Requête :**
```json
{
  "name": "Groupe Scolaire Les Palmiers",
  "school_type": "MIXTE",
  "code_minedu": "GN-CKY-00123",
  "contact_name": "Mamadou Diallo",
  "contact_phone": "+224620000000",
  "contact_email": "directeur@ecole-exemple.gn",
  "region": "Conakry",
  "prefecture": "Conakry",
  "commune": "Ratoma",
  "quartier": "Nongo",
  "plan_id": "7a1b2c3d-..."
}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "9c8d7e6f-...",
    "name": "Groupe Scolaire Les Palmiers",
    "slug": "les-palmiers",
    "status": "TRIAL",
    "trial_ends_at": "2025-10-15T00:00:00Z",
    "director_account": {
      "email": "directeur@ecole-exemple.gn",
      "temporary_password": "Xk9$mP2q"
    }
  }
}
```

> Le `temporary_password` n'est renvoyé **qu'une seule fois**, dans cette réponse — jamais récupérable ensuite via l'API (il est haché immédiatement). Le Super Admin doit le transmettre au client par un canal sécurisé.

**Erreurs `400` :** `name` déjà pris, `contact_email` déjà utilisé, `contact_phone` mal formaté.

### `GET /superadmin/schools/`
**Query params :** `?status=ACTIVE&plan_id=...&search=palmiers&ordering=-created_at`

**Réponse `200` :** liste paginée (voir §0.4), chaque élément :
```json
{
  "id": "9c8d7e6f-...",
  "name": "Groupe Scolaire Les Palmiers",
  "slug": "les-palmiers",
  "status": "ACTIVE",
  "plan": {"id": "7a1b2c3d-...", "name": "Pro"},
  "student_count": 342,
  "created_at": "2025-08-01T10:00:00Z"
}
```

### `GET /superadmin/schools/{id}/`
**Réponse `200` :** objet complet `Tenant` (tous les champs listés dans le schéma de données §1.1) + `student_count`, `staff_count`.

### `PATCH /superadmin/schools/{id}/suspend/`
**Requête :** `{"reason": "Impayé abonnement depuis 45 jours", "type": "SOFT"}` (`type` : `"SOFT"` ou `"HARD"`) — **Réponse `200` :** `{"status": "success", "data": {"id": "...", "status": "SUSPENDED_SOFT"}}`

> **Note de migration (SUPERADMIN-V2-01, 2026-07-30) :** `type` est un **nouveau champ requis** de ce payload, conséquence mécanique du remplacement de `SUSPENDED` par `SUSPENDED_SOFT`/`SUSPENDED_HARD` — il faut désormais préciser lequel des deux appliquer. `400` si absent ou différent de `"SOFT"`/`"HARD"` : `{"message": "Le type de suspension est requis et doit être 'SOFT' ou 'HARD'."}`.
>
> Notification (email + **SMS**, contact principal) envoyée à chaque changement de statut (suspension soft/hard, réactivation) — le SMS est nouveau, la tâche `send_tenant_status_notification` (TENANT-04) n'envoyait jusqu'ici qu'un email malgré son nom générique.

### `PATCH /superadmin/schools/{id}/reactivate/`
**Requête :** `{}` — **Réponse `200`** : `{"status": "success", "data": {"id": "...", "status": "ACTIVE"}}`

### `GET /superadmin/dashboard/` — SUPERADMIN-V2-02
**Auth :** JWT, `IsSuperAdmin` uniquement (403 sinon) — vue globale plateforme, aucune notion de tenant.

**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "totals": {
      "total": 12,
      "TRIAL": 3,
      "ACTIVE": 7,
      "SUSPENDED_SOFT": 1,
      "SUSPENDED_HARD": 0,
      "CANCELLED": 1
    },
    "mrr_estimated": "10500000.00",
    "monthly_creations": [
      {"month": "2025-08", "count": 0},
      {"month": "2025-09", "count": 1},
      "...",
      {"month": "2026-07", "count": 3}
    ],
    "recent_schools": [
      {
        "id": "9c8d7e6f-...",
        "name": "Groupe Scolaire Les Palmiers",
        "slug": "les-palmiers",
        "status": "ACTIVE",
        "plan": {"id": "7a1b2c3d-...", "name": "Pro"},
        "student_count": 342,
        "created_at": "2026-07-28T10:00:00Z"
      }
    ]
  }
}
```

**Détail des champs :**
- `totals` : décompte des tenants par statut (les 5 valeurs de `Tenant.Status`, toujours présentes même à 0) + `total`.
- `mrr_estimated` : `Σ Plan.price_monthly` des tenants **`ACTIVE` uniquement** — `TRIAL` ne facture rien, `SUSPENDED_SOFT`/`SUSPENDED_HARD` sont typiquement en défaut de paiement, ni l'un ni l'autre ne représente un revenu récurrent réellement comptable.
- `monthly_creations` : 12 mois glissants (mois courant inclus), **zero-paddés** (chaque mois de la fenêtre apparaît même à 0, pour un graphique sans trou silencieux). Compte **toutes** les créations de tenants du mois, quel que soit leur statut actuel — c'est un historique d'événements de création, pas un indicateur de tenants actifs nets (un tenant depuis résilié a bien été créé ce mois-là).
- `recent_schools` : les **5** dernières écoles créées (`-created_at`), même forme que `TenantListSerializer` (liste `GET /superadmin/schools/`) — pas de nouveau format dupliqué.

**Hors périmètre de ce ticket (dette V3 explicitement actée)** : churn, cartographie interactive.

**Performance :** pas de cache pour cette version (agrégats bon marché à l'échelle actuelle de la plateforme — `COUNT`/`SUM` sur colonne indexée). Redis est configuré au niveau infra mais non utilisé par ce endpoint ; voir `apps/superadmin/services/dashboard_service.py` pour la justification détaillée et le point d'extension prévu si le besoin apparaît.

### `GET /superadmin/plans/` / `POST /superadmin/plans/`
**Réponse `GET` (élément de liste) :**
```json
{"id": "7a1b2c3d-...", "name": "Pro", "max_students": 1000, "max_staff": 100, "price_monthly": "1500000.00", "is_active": true}
```
**Requête `POST` :** mêmes champs sans `id`.

---
## 3. Structure pédagogique (Épic 3)

### `GET /pedagogy/schoolyears/` / `POST /pedagogy/schoolyears/`
**Auth :** JWT, tenant école. Permissions : lecture ouverte à tous les rôles école, écriture `DIRECTOR`/`SECRETAIRE`.

**Requête `POST` :**
```json
{"label": "2025-2026", "start_date": "2025-09-15", "end_date": "2026-07-10"}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "1a2b3c4d-...",
    "label": "2025-2026",
    "start_date": "2025-09-15",
    "end_date": "2026-07-10",
    "status": "PREPARATION",
    "is_current": false
  }
}
```

**Erreur `400` :** `{"errors": {"label": ["Une année scolaire avec ce libellé existe déjà"]}}`

### `PATCH /pedagogy/schoolyears/{id}/set-current/`
**Requête :** `{}` — passe `is_current=true` sur cette année et `false` sur toutes les autres du tenant (transaction atomique côté service).
**Réponse `200`**

### `GET/POST /pedagogy/school-years/{id}/periods/`
**Requête `POST` :**
```json
{"name": "Trimestre 1", "type": "TRIMESTRE", "start_date": "2025-09-15", "end_date": "2025-12-20", "order": 1}
```
**Réponse `201` :** même forme + `"id"`, `"is_closed": false`.

**Erreur `422` :** `{"status": "error", "message": "Cette période chevauche le Trimestre 1 existant (15/09/2025 - 20/12/2025)"}`

### `PATCH /pedagogy/periods/{id}/close/`
**Requête :** `{}` — **Réponse `200` :** `{"data": {"id": "...", "is_closed": true}}`
**Erreur `422` :** si des évaluations sont encore non verrouillées sur cette période — `{"message": "3 évaluation(s) non verrouillée(s) empêchent la clôture"}`

### `GET /pedagogy/levels/`
**Query params :** `?cycle=COLLEGE`
**Réponse :** liste non paginée (catalogue fixe) : `[{"id": "...", "cycle": "COLLEGE", "name": "6ème", "order_index": 1}, ...]`

### `GET/POST /pedagogy/classes/`
**Query params (GET) :** `?school_year_id=...&level_id=...&search=6ème`

**Requête `POST` :**
```json
{
  "school_year": "1a2b3c4d-...",
  "level_id": "5e6f7a8b-...",
  "name": "6ème A",
  "capacity": 50,
  "room": "Salle 12",
  "main_teacher_id": "3f1a2b4c-..."
}
```
> **Correction (2026-07-30) :** le nom de champ documenté ici était `school_year_id` alors que le code (`ClassSerializer`, `ClassSheet.tsx`) utilise `school_year` depuis l'Épic 3 — incohérence pré-existante entre le contrat et l'implémentation, corrigée à l'occasion de cette note plutôt que perpétuée.
>
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-30) :** `school_year` est passé d'**obligatoire** à **optionnel**. Même politique de résolution défaut/année courante + override que `POST /students/` (`pedagogy:override:schoolyear`). Particularité : un `school_year` fourni appartenant à un autre tenant renvoie `404` (et non `400`), cohérent avec l'isolation multi-tenant stricte du reste de l'API.

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "8c7d6e5f-...",
    "name": "6ème A",
    "level": {"id": "5e6f7a8b-...", "name": "6ème"},
    "capacity": 50,
    "current_headcount": 0,
    "room": "Salle 12",
    "main_teacher": {"id": "3f1a2b4c-...", "first_name": "Aïssatou", "last_name": "Bah"}
  }
}
```
**Erreurs :**
- `404` (`school_year` fourni, hors tenant) : `{"message": "Ressource non trouvée"}`
- `422` (aucune année courante, `school_year` omis) : `{"message": "Aucune année scolaire courante n'est définie — contactez votre Directeur."}`
- `422` (année clôturée) : cf. SCHOOLYEAR-V2-01.
- `403` (`school_year` fourni, différent de l'année courante, sans `pedagogy:override:schoolyear`) : cf. `POST /students/`.

### `GET/POST /pedagogy/subjects/`
**Requête `POST` :** `{"code": "MATH", "name": "Mathématiques", "category": "Scientifique", "is_official": true}`
**Réponse `201` :** mêmes champs + `"id"`.

### `GET/POST /pedagogy/classes/{id}/subjects/`
**Requête `POST` (rattacher une matière à une classe) :**
```json
{"subject_id": "9a8b7c6d-...", "coefficient": "4.0", "weekly_hours": "5.0", "teacher_id": "3f1a2b4c-..."}
```
**Réponse `201` :**
```json
{
  "id": "2b3c4d5e-...",
  "subject": {"id": "9a8b7c6d-...", "code": "MATH", "name": "Mathématiques"},
  "coefficient": "4.0",
  "weekly_hours": "5.0",
  "teacher": {"id": "3f1a2b4c-...", "first_name": "Aïssatou", "last_name": "Bah"}
}
```

---

## 4. Élèves (Épic 4)

### `POST /students/`
**Auth :** JWT, permission `eleves:create` (`DIRECTOR`, `SECRETAIRE`).

**Requête :**
```json
{
  "nom": "Camara",
  "prenom": "Fatoumata",
  "date_naissance": "2013-03-22",
  "lieu_naissance": "Kindia",
  "sexe": "F",
  "classe_id": "8c7d6e5f-...",
  "school_year_id": "1a2b3c4d-...",
  "type_inscription": "NOUVELLE_INSCRIPTION",
  "guardian": {
    "lien": "MERE",
    "nom_complet": "Mariama Camara",
    "telephone": "+224655112233",
    "email": "",
    "is_contact_urgence": true
  }
}
```
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-29) :** `school_year_id` est passé d'**obligatoire** à **optionnel**. Omis, il résout automatiquement l'année `is_current=True` du tenant (`422` si aucune n'est courante). Fourni et identique à l'année courante : accepté sans restriction. Fourni et différent de l'année courante : réservé aux utilisateurs disposant de la permission `pedagogy:override:schoolyear` (`DIRECTOR` par défaut) — `403` sinon.

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "4d5e6f7a-...",
    "matricule": "2025-00042",
    "nom": "Camara",
    "prenom": "Fatoumata",
    "date_naissance": "2013-03-22",
    "sexe": "F",
    "statut": "ACTIF",
    "classe_actuelle": {"id": "8c7d6e5f-...", "name": "6ème A"},
    "guardians": [
      {"id": "6f7a8b9c-...", "lien": "MERE", "nom_complet": "Mariama Camara", "telephone": "+224655112233"}
    ]
  }
}
```

**Erreurs :**
- `409` (doublon probable) :
```json
{
  "status": "error",
  "message": "Un élève avec des informations similaires existe déjà",
  "errors": {"duplicate_candidate": {"id": "1f2e3d4c-...", "matricule": "2024-00187", "similarity": "nom+prenom+date_naissance identiques"}}
}
```
  *(Le frontend doit afficher ce candidat et proposer "Confirmer une nouvelle fiche quand même" via `?force=true` sur le même endpoint, ou "Voir la fiche existante".)*
- `422` (capacité classe atteinte) : `{"message": "La classe 6ème A a atteint sa capacité maximale (50/50)"}`
- `422` (année non ouverte) : `{"message": "L'inscription n'est possible que sur une année scolaire ouverte"}`
- `422` (aucune année courante, `school_year_id` omis) : `{"message": "Aucune année scolaire courante n'est définie — contactez votre Directeur."}`
- `403` (`school_year_id` fourni, différent de l'année courante, permission `pedagogy:override:schoolyear` manquante) : `{"message": "Seul un Directeur peut choisir une année scolaire différente de l'année scolaire courante."}`
- `400` (téléphone tuteur invalide) : `{"errors": {"guardian": {"telephone": ["Format attendu : +224XXXXXXXXX"]}}}`

### `GET /students/`
**Query params :** `?classe_id=...&statut=ACTIF&school_year_id=...&search=Camara`

**Réponse (élément de liste) :**
```json
{
  "id": "4d5e6f7a-...",
  "matricule": "2025-00042",
  "nom": "Camara",
  "prenom": "Fatoumata",
  "classe_actuelle": {"id": "8c7d6e5f-...", "name": "6ème A"},
  "statut": "ACTIF",
  "guardian_phone": "+224655112233"
}
```

### `GET /students/{id}/`
**Réponse `200` :** objet complet (mêmes champs que la création + `enrollments`, `created_at`, `photo`).

### `PATCH /students/{id}/`
**Requête :** champs modifiables uniquement, ex. `{"lieu_naissance": "Conakry"}` — **Réponse `200`** : objet mis à jour.

### `POST /students/{id}/reinscription/`
**Requête :**
```json
{"school_year_id": "9e8d7c6b-...", "classe_id": "3a4b5c6d-..."}
```
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-29) :** `school_year_id` est passé d'**obligatoire** à **optionnel**, même politique de résolution défaut/override que `POST /students/` ci-dessus (`pedagogy:override:schoolyear`).

**Réponse `201` :** nouvel `Enrollment` :
```json
{"id": "7b8c9d0e-...", "type_inscription": "REINSCRIPTION", "classe": {"id": "3a4b5c6d-...", "name": "5ème A"}, "school_year": {"id": "9e8d7c6b-...", "label": "2026-2027"}}
```
**Erreur `422` :** `{"message": "La décision de fin d'année précédente n'a pas encore été validée"}` (ou message d'année clôturée/absente, cf. `POST /students/`).
**Erreur `403` :** cf. `POST /students/` — surcharge de `school_year_id` sans permission `pedagogy:override:schoolyear`.

### `POST /students/{id}/archiver/`
**Requête :** `{"motif": "Fin de scolarité"}` — **Réponse `200` :** `{"data": {"id": "...", "statut": "ARCHIVE"}}`

### `GET/POST /students/{id}/guardians/`
**Requête `POST` :** mêmes champs que le sous-objet `guardian` de la création d'élève.
**Réponse `201`** : objet `Guardian` créé.

---

## 5. Présences (Épic 5)

### `POST /pedagogy/attendances/`
**Auth :** JWT, permission `attendance:create` — **saisie batch pour une classe/date**

**Requête :**
```json
{
  "classe_id": "8c7d6e5f-...",
  "date": "2025-10-06",
  "records": [
    {"student_id": "4d5e6f7a-...", "status": "PRESENT"},
    {"student_id": "5e6f7a8b-...", "status": "ABSENT"},
    {"student_id": "6f7a8b9c-...", "status": "RETARD", "minutes_late": 15}
  ]
}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "classe_id": "8c7d6e5f-...",
    "date": "2025-10-06",
    "created_count": 3,
    "sms_queued_for": ["5e6f7a8b-..."]
  }
}
```

**Erreur `409` :** présence déjà saisie pour cette classe/date → `{"message": "Les présences du 06/10/2025 pour cette classe ont déjà été enregistrées. Utilisez PATCH pour les modifier."}`

### `GET /pedagogy/attendances/`
**Query params :** `?classe_id=...&student_id=...&date=2025-10-06&date_from=...&date_to=...`

**Réponse (élément) :**
```json
{"id": "8a9b0c1d-...", "student_id": "5e6f7a8b-...", "date": "2025-10-06", "status": "ABSENT", "is_locked": false}
```

### `PATCH /pedagogy/attendances/{id}/justify/`
**Requête :** `{"justification_text": "Certificat médical remis au secrétariat le 07/10"}`
**Réponse `200` :** `{"data": {"id": "...", "status": "ABSENT_JUSTIFIE"}}`
**Erreur `422` :** `{"message": "Modification impossible : cet enregistrement est verrouillé (plus de 24h)"}`

### `PATCH /pedagogy/attendances/{id}/` ⚠️ *(ajout post-contrat — ATT-01)*
> **Note :** cet endpoint ne figurait pas dans le contrat original. Il a été ajouté pour lever l'incohérence du message d'erreur `409` de `POST /pedagogy/attendances/` qui invite explicitement à « **Utiliser PATCH pour les modifier** » alors qu'aucun PATCH générique n'existait (seul `.../justify/` était spécifié). Il permet de corriger le statut d'une présence déjà saisie.

**Auth :** JWT, permission `attendance:create`
**Requête :** `{"status": "RETARD", "minutes_late": 15}` (au moins un champ ; `status` ∈ PRESENT/ABSENT/ABSENT_JUSTIFIE/RETARD)
**Réponse `200` :** `{"data": {"id": "...", "student_id": "...", "date": "2025-10-06", "status": "RETARD", "is_locked": false}}`
**Erreur `422` :** enregistrement verrouillé (> 24h).

---
## 6. Notes, Évaluations, Bulletins (Épic 6)

### `POST /pedagogy/evaluations/`
**Auth :** JWT, permission `notes:create:evaluation` (`TEACHER` sur ses propres matières, `DIRECTOR`, `SECRETAIRE`).

**Requête :**
```json
{
  "class_id": "8c7d6e5f-...",
  "subject_id": "9a8b7c6d-...",
  "period_id": "2b3c4d5e-...",
  "type": "DS",
  "title": "Devoir surveillé n°1 — Fractions",
  "max_score": "20.00",
  "coefficient": "3.0",
  "date": "2025-10-20"
}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "5c6d7e8f-...",
    "title": "Devoir surveillé n°1 — Fractions",
    "type": "DS",
    "max_score": "20.00",
    "coefficient": "3.0",
    "date": "2025-10-20",
    "is_locked": false,
    "is_published": false,
    "student_count": 48
  }
}
```

### `POST /pedagogy/grades/bulk/`
**Requête :**
```json
{
  "evaluation_id": "5c6d7e8f-...",
  "grades": [
    {"student_id": "4d5e6f7a-...", "score": "14.50"},
    {"student_id": "5e6f7a8b-...", "is_absent": true},
    {"student_id": "6f7a8b9c-...", "score": "22.00"}
  ]
}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "created_count": 3,
    "warnings": [
      {"student_id": "6f7a8b9c-...", "message": "Note 22.00 supérieure au barème (20.00) — rejetée"}
    ],
    "stats": {"moyenne": "12.40", "mediane": "13.00", "ecart_type": "3.2"}
  }
}
```

> La note du 3ème élève (`22.00`) est **rejetée individuellement** (pas d'échec global de la requête batch) — le reste est enregistré, et le détail du rejet est renvoyé dans `warnings` pour affichage immédiat côté frontend.

### `PATCH /pedagogy/evaluations/{id}/lock/`
**Requête :** `{}` — **Réponse `200` :** `{"data": {"id": "...", "is_locked": true}}`
**Erreur `422` :** `{"message": "Impossible de verrouiller : 5 élève(s) n'ont pas encore de note saisie"}` *(avertissement bloquant configurable — à confirmer en équipe si on force le blocage ou juste un warning)*

### `POST /grades/{id}/valider/`
**Auth :** permission `notes:validate` (`DIRECTOR` uniquement en MVP)
**Requête :** `{}` — **Réponse `200` :** `{"data": {"id": "...", "is_validated": true, "validated_at": "2025-10-22T09:00:00Z"}}`
**Erreur `400` :** si l'évaluation n'est pas verrouillée → `{"message": "L'évaluation doit être verrouillée avant de pouvoir valider les notes."}`

### `PATCH /grades/{id}/modifier-apres-validation/`
**Requête (justification obligatoire) :**
```json
{"score": "15.00", "justification": "Erreur de saisie initiale, correction demandée par l'enseignant le 23/10"}
```
**Réponse `200` :** note mise à jour + entrée créée dans `AuditLog`.
**Erreur `403` :** si l'appelant n'est pas `DIRECTOR` → `{"message": "Seul le Directeur peut modifier une note déjà validée"}`

### `GET /students/{id}/moyenne/`
**Query params :** `?period_id=...`

**Formule de calcul (deux niveaux, arbitrage CDC §749 + glossaire §1479) :**

- **Niveau 1 — Moyenne par matière :** Pour chaque matière, Σ(note_convertie × coefficient de l'évaluation) / Σ(coefficient de l'évaluation). Les `note_convertie` sont normalisées sur 20 par `Grade.note_convertie = (score / max_score) × 20`. Les matières sans aucune note validée sont exclues. Seules les notes `is_validated=True` sont comptées.
- **Niveau 2 — Moyenne générale :** Σ(moyenne_matière × coefficient de la matière dans la classe) / Σ(coefficient de la matière dans la classe).
- **Arrondi :** L'arrondi académique (CDC §751) est appliqué uniquement à la sérialisation (jamais aux calculs intermédiaires).
- **Mention :** Attribuée automatiquement selon les seuils CDC §755.

**Permission requise :** `notes:read`

**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "student_id": "4d5e6f7a-...",
    "period_id": "2b3c4d5e-...",
    "moyenne_generale": "13.45",
    "mention": "Assez Bien",
    "par_matiere": [
      {"subject": "Mathématiques", "moyenne": "12.40", "coefficient": "4.0"},
      {"subject": "Français", "moyenne": "14.80", "coefficient": "4.0"}
    ]
  }
}
```
**Erreur `400` :** si `period_id` manquant → `{"message": "Le paramètre period_id est requis."}`
**Erreur `404` :** si l'étudiant ou la période n'existe pas → `{"message": "Ressource non trouvée"}`

### `GET /classes/{id}/classement/`
**Query params :** `?period_id=...`

**Réponse `200` :**
```json
{
  "status": "success",
  "data": {
    "classe_id": "8c7d6e5f-...",
    "period_id": "2b3c4d5e-...",
    "classement": [
      {"rang": 1, "student_id": "5e6f7a8b-...", "nom_complet": "Camara Ibrahima", "moyenne_generale": "16.20"},
      {"rang": 2, "student_id": "4d5e6f7a-...", "nom_complet": "Camara Fatoumata", "moyenne_generale": "13.45"}
    ]
  }
}
```

### `POST /students/{id}/bulletin/`
**Body (JSON) :** `{"period_id": "..."}`

**Réponse `202` :** la génération du PDF est asynchrone (tâche Celery) :
```json
{
  "status": "success",
  "data": {
    "task_id": "a1b2c3d4-...",
    "status": "processing"
  }
}
```
Le frontend fait un polling sur `GET /pedagogy/tasks/{task_id}/status/`.

**Réponse `200`** (quand le PDF est déjà disponible via le résultat de tâche) : voir §8.

**Permission requise :** `notes:read`

**Erreur `400` :** si `period_id` manquant → `{"message": "Le paramètre period_id est requis."}`
**Erreur `404` :** si l'étudiant ou la période n'existe pas → `{"message": "Ressource non trouvée"}`

### `POST /pedagogy/year-end-decisions/`
**Requête :**
```json
{
  "student": "4d5e6f7a-...",
  "school_year": "1a2b3c4d-...",
  "decision": "ADMIS",
  "classe_destination": "3a4b5c6d-..."
}
```
> **Corrections (2026-07-30) :** chemin documenté `/year-end-decisions/` → réel `/pedagogy/year-end-decisions/` ; champs documentés `student_id`/`school_year_id`/`classe_destination_id` → réels `student`/`school_year`/`classe_destination` (`YearEndDecisionSerializer`, `ModelSerializer` sans suffixe `_id`). Incohérences pré-existantes corrigées à l'occasion de cette note. **Signalé sans être corrigé (hors périmètre SCHOOLYEAR-V2-02)** : le formulaire "Nouvelle décision" de `YearEndDecisionsClient.tsx` envoie actuellement `student_id`/`school_year_id`/`classe_destination_id` — désaccord avec le contrat réel qui semble pré-dater ce ticket (le sélecteur "Élève" du même formulaire n'est d'ailleurs pas non plus alimenté). À traiter comme un ticket séparé.
>
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-30) :** `school_year` passe d'**obligatoire** à **optionnel** (même politique `resolve_school_year` que les endpoints précédents : défaut = année courante, override `pedagogy:override:schoolyear` sinon `403`, `404` hors tenant, `422` si aucune année courante).

**Réponse `201` :** objet `YearEndDecision` créé, avec `moyenne_annuelle` recalculée et gelée.

Champs en lecture seule (auto-remplis) :
- `classe_origine` (UUID) : snapshot de `student.classe_actuelle` au moment de la création
- `moyenne_annuelle` (Decimal) : moyenne annuelle calculée (voir note ci-dessous)
- `date_decision` (Date) : date de création, `auto_now_add`
- `prise_par` (UUID) : utilisateur connecté

> **Note — Règle de calcul de `moyenne_annuelle` (MVP, non confirmée par le CDC)**
> Hypothèse MVP : moyenne simple des `moyenne_generale` par période de l'année scolaire ayant au moins une note (évaluation verrouillée avec score saisi).
> À valider avec un directeur d'école avant la V2 — certaines écoles pourraient utiliser une pondération différente (ex. trimestre 3 plus lourd, ou pondération par nombre d'évaluations par période).
> Cette dette technique est explicitement tracée dans la docstring du service (`grade_service.py:compute_moyenne_annuelle`).

### `POST /pedagogy/promotions/bulk/`
**Requête :**
```json
{"classe_origine_id": "8c7d6e5f-...", "school_year_cible_id": "9e8d7c6b-...", "decisions_filter": "ADMIS"}
```
> **Correction de chemin (2026-07-30) :** documenté `/promotions/bulk/` → réel `/pedagogy/promotions/bulk/`.
>
> **Clarification sémantique (2026-07-30) :** `school_year_cible_id` ne désigne **pas** une année d'inscription cible malgré son nom — c'est l'année dont on traite les décisions déjà prises (`YearEndDecision.school_year`), généralement déjà clôturée au moment de l'appel (le nom n'a volontairement pas été changé dans SCHOOLYEAR-V2-02, décision distincte à part entière). Ce endpoint ne fait aucune écriture rattachée à cette année (il modifie `Student.classe_actuelle`, non scopé à une année) : **aucune vérification `assert_school_year_open` n'y est appliquée**, contrairement aux autres endpoints de ce contrat.
>
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-30) :** `school_year_cible_id` passe d'**obligatoire** à **optionnel** (défaut = année courante, override `pedagogy:override:schoolyear` sinon `403`, `404` hors tenant, `422` si aucune année courante).

**Réponse `200` :** `{"data": {"processed_count": 44, "skipped_count": 4, "skipped_reasons": [{"student_id": "...", "reason": "Décision non encore prise"}]}}`

---

## 7. Finance (Épic 7)

### `GET/POST /finance/feecategories/`
**Requête `POST` :**
```json
{"name": "Scolarité 2025-2026", "type": "SCOLARITE", "amount": "1200000.00", "is_mandatory": true, "school_year": "1a2b3c4d-..."}
```
> **Correction (2026-07-30) :** le champ documenté ici était `school_year_id`, le code (`FeeCategoryCreateSerializer`) a toujours utilisé `school_year` — incohérence pré-existante corrigée à l'occasion de cette note.
>
> **Note de migration (SCHOOLYEAR-V2-02, 2026-07-30) :** `school_year` passe d'**obligatoire** à **optionnel** en création (défaut = année courante, override `pedagogy:override:schoolyear` sinon `403`, `404` si l'année appartient à un autre tenant, `422` si aucune année courante). **`PUT/PATCH /finance/feecategories/{id}/`** : réattribuer `school_year` à une valeur différente de la valeur actuelle est verrouillé par la même permission — un `ACCOUNTANT` qui ne peut pas choisir l'année à la création ne peut pas non plus la changer après coup (risque de désynchronisation avec des `Invoice` déjà calculées).

**Réponse `201` :** mêmes champs + `"id"`.

### `GET /finance/students/{id}/fees/`
**Réponse `200` :**
```json
{
  "status": "success",
  "data": [
    {
      "id": "1d2e3f4a-...",
      "fee_category": {"id": "...", "name": "Scolarité 2025-2026"},
      "total_amount": "1200000.00",
      "discount_amount": "0.00",
      "balance_due": "700000.00"
    }
  ]
}
```

### `POST /finance/payments/` (espèces)
**Auth :** permission `finances:payment:record` (`ACCOUNTANT`/`SECRETAIRE`/`DIRECTOR`)

**Requête :**
```json
{
  "student_id": "4d5e6f7a-...",
  "student_fee_id": "1d2e3f4a-...",
  "amount": "500000.00",
  "method": "CASH",
  "idempotency_key": "cash-2025-10-06-4d5e6f7a-01"
}
```

**Réponse `201` :**
```json
{
  "status": "success",
  "data": {
    "id": "2e3f4a5b-...",
    "receipt_number": "REC-2025-000842",
    "receipt_pdf_url": "https://storage.eduguinee.gn/receipts/REC-2025-000842.pdf",
    "amount": "500000.00",
    "method": "CASH",
    "status": "COMPLETED",
    "new_balance_due": "200000.00"
  }
}
```
**Erreur `409` (idempotence) :** `{"message": "Ce paiement a déjà été enregistré (clé d'idempotence déjà utilisée)", "existing_payment_id": "2e3f4a5b-..."}`

### `POST /finance/payments/orange-money/initiate/`
**Requête :**
```json
{
  "student_id": "4d5e6f7a-...",
  "student_fee_id": "1d2e3f4a-...",
  "amount": "200000.00",
  "payer_phone": "+224655112233"
}
```

**Réponse `202 Accepted` :**
```json
{
  "status": "success",
  "data": {
    "payment_id": "3f4a5b6c-...",
    "status": "PENDING",
    "provider_transaction_id": "OM-TXN-889231",
    "message": "Une notification a été envoyée sur le téléphone +224655112233. Le parent doit valider le paiement dans son application Orange Money.",
    "poll_url": "/finance/payments/3f4a5b6c-.../status/"
  }
}
```

### `GET /finance/payments/{id}/status/`
**Réponse `200` (en attente) :** `{"data": {"id": "...", "status": "PENDING"}}`
**Réponse `200` (confirmé) :**
```json
{
  "data": {
    "id": "3f4a5b6c-...",
    "status": "COMPLETED",
    "receipt_number": "REC-2025-000843",
    "receipt_pdf_url": "https://storage.eduguinee.gn/receipts/REC-2025-000843.pdf",
    "new_balance_due": "0.00"
  }
}
```
**Réponse `200` (échoué) :** `{"data": {"id": "...", "status": "FAILED", "failure_reason": "Solde Orange Money insuffisant"}}`

### `POST /webhooks/orange-money/` *(appelé par Orange, pas par le frontend)*
**Auth :** signature HMAC vérifiée dans le header `X-Orange-Signature`, pas de JWT.

**Requête (payload envoyé par Orange) :**
```json
{
  "transaction_id": "OM-TXN-889231",
  "status": "SUCCESS",
  "amount": "200000.00",
  "payer_msisdn": "+224655112233",
  "timestamp": "2025-10-06T14:32:10Z"
}
```
**Réponse `200` :** `{"received": true}` *(Orange retente l'appel si la réponse n'est pas 200 sous 5 secondes)*

### `GET /finance/payments/`
**Query params :** `?student_id=...&method=ORANGE_MONEY&status=COMPLETED&date_from=...&date_to=...`

**Réponse (élément de liste) :**
```json
{"id": "3f4a5b6c-...", "student": {"id": "...", "nom_complet": "Camara Fatoumata"}, "amount": "200000.00", "method": "ORANGE_MONEY", "status": "COMPLETED", "payment_date": "2025-10-06T14:32:15Z", "receipt_number": "REC-2025-000843"}
```

### `GET /finance/invoices/` / `POST /finance/invoices/{id}/generate-pdf/`
**Réponse `GET` (élément) :**
```json
{"id": "4a5b6c7d-...", "student": {"id": "...", "nom_complet": "Camara Fatoumata"}, "total_due": "1200000.00", "total_paid": "1200000.00", "balance": "0.00", "status": "PAID"}
```
**Réponse `POST generate-pdf` `202` :** `{"data": {"task_id": "b2c3d4e5-...", "status": "processing"}}`

---
## 8. Tâches asynchrones — convention commune

Plusieurs endpoints (génération de bulletin, génération de facture PDF, promotions en masse si le volume est important) sont traités en tâche de fond. Ils suivent tous la même convention :

**Déclenchement :** réponse `202 Accepted` avec `{"data": {"task_id": "...", "status": "processing"}}`

**Polling :** `GET /pedagogy/tasks/{task_id}/status/` (cf. endpoint `task_status` dans `views.py`)
```json
{"status": "success", "data": {"task_id": "...", "status": "processing"}}
```
puis, une fois terminé :
```json
{"status": "success", "data": {"task_id": "...", "status": "done", "result": {"pdf_url": "https://..."}}}
```
ou en cas d'échec :
```json
{"status": "success", "data": {"task_id": "...", "status": "failed", "error": "Erreur de génération PDF : police manquante"}}
```

**Convention frontend :** polling toutes les 2 secondes, timeout d'affichage après 30 secondes avec message "La génération prend plus de temps que prévu, vous recevrez une notification".

---

## 9. Catalogue des messages d'erreur métier (à réutiliser tel quel)

Pour garder une expérience cohérente, le frontend doit afficher **exactement** ces messages (pas de reformulation locale) — ils sont déjà rédigés pour l'utilisateur final :

| Contexte | Message exact |
|---|---|
| Classe pleine | "La classe {nom} a atteint sa capacité maximale ({capacité}/{capacité})" |
| Doublon élève probable | "Un élève avec des informations similaires existe déjà" |
| Année non ouverte | "L'inscription n'est possible que sur une année scolaire ouverte" |
| Téléphone invalide | "Format attendu : +224XXXXXXXXX" |
| Note hors barème | "Note {valeur} supérieure au barème ({barème}) — rejetée" |
| Modification note validée refusée | "Seul le Directeur peut modifier une note déjà validée" |
| Présence verrouillée | "Modification impossible : cet enregistrement est verrouillé (plus de 24h)" |
| Idempotence paiement | "Ce paiement a déjà été enregistré (clé d'idempotence déjà utilisée)" |
| Compte suspendu | "Compte suspendu" |
| Limite de plan atteinte | "Votre plan actuel autorise {max} élèves maximum. Contactez le support pour une mise à niveau." |

---

## 10. Récapitulatif — tous les endpoints du MVP

| Domaine | Endpoint | Méthode |
|---|---|---|
| Auth | `/auth/login/`, `/auth/refresh/`, `/auth/logout/`, `/auth/change-password/` | POST |
| Auth | `/users/me/` | GET, PATCH |
| Auth | `/auth/permissions/me/` | GET |
| Auth (staff) | `/auth/staff/` | GET, POST |
| Auth (staff) | `/auth/staff/{id}/` | GET, PATCH |
| Auth (staff) | `/auth/staff/{id}/disable/`, `/auth/staff/{id}/enable/` | PATCH |
| Super Admin | `/superadmin/schools/` | GET, POST |
| Super Admin | `/superadmin/schools/{id}/` | GET |
| Super Admin | `/superadmin/schools/{id}/suspend/`, `/reactivate/` | PATCH |
| Super Admin | `/superadmin/dashboard/` | GET |
| Super Admin | `/superadmin/plans/` | GET, POST |
| Structure | `/pedagogy/schoolyears/` | GET, POST |
| Structure | `/pedagogy/schoolyears/{id}/set-current/` | PATCH |
| Structure | `/pedagogy/school-years/{id}/periods/` | GET, POST |
| Structure | `/pedagogy/periods/{id}/close/` | PATCH |
| Structure | `/pedagogy/levels/` | GET |
| Structure | `/pedagogy/classes/` | GET, POST |
| Structure | `/pedagogy/subjects/` | GET, POST |
| Structure | `/pedagogy/classes/{id}/subjects/` | GET, POST |
| Élèves | `/students/` | GET, POST |
| Élèves | `/students/{id}/` | GET, PATCH |
| Élèves | `/students/{id}/reinscription/` | POST |
| Élèves | `/students/{id}/archiver/` | POST |
| Élèves | `/students/{id}/guardians/` | GET, POST |
| Présences | `/pedagogy/attendances/` | GET, POST |
| Présences | `/pedagogy/attendances/{id}/` | PATCH ⚠️ (ajout post-contrat, cf. §5) |
| Présences | `/pedagogy/attendances/{id}/justify/` | PATCH |
| Notes | `/pedagogy/evaluations/` | POST |
| Notes | `/pedagogy/evaluations/{id}/lock/` | PATCH |
| Notes | `/pedagogy/grades/bulk/` | POST |
| Notes | `/grades/{id}/valider/` | POST |
| Notes | `/grades/{id}/modifier-apres-validation/` | PATCH |
| Notes | `/students/{id}/moyenne/` | GET |
| Notes | `/classes/{id}/classement/` | GET |
| Notes | `/students/{id}/bulletin/` | POST |
| Notes | `/pedagogy/year-end-decisions/` | POST |
| Notes | `/pedagogy/promotions/bulk/` | POST |
| Finance | `/finance/feecategories/` | GET, POST |
| Finance | `/finance/students/{id}/fees/` | GET |
| Finance | `/finance/payments/` | GET, POST |
| Finance | `/finance/payments/orange-money/initiate/` | POST |
| Finance | `/finance/payments/{id}/status/` | GET |
| Finance | `/webhooks/orange-money/` | POST |
| Finance | `/finance/invoices/` | GET |
| Finance | `/finance/invoices/{id}/generate-pdf/` | POST |
| Commun | `/pedagogy/tasks/{task_id}/status/` | GET |

---

*Ce contrat est la référence unique pour les payloads du MVP. Toute évolution (V2) doit être versionnée (`/api/v2/`) plutôt que de modifier silencieusement la forme d'un endpoint existant, pour ne jamais casser un client déjà en production (app mobile notamment, qui ne se met pas à jour instantanément chez tous les parents).*
