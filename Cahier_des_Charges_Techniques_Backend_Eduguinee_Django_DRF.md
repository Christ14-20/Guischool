# Cahier des Charges Techniques Backend - Eduguinée 3.0

## 1. Architecture Générale

### 1.1 Vue d'ensemble
La plateforme Eduguinée 3.0 exposera une API RESTful robuste, construite avec **Django** et **Django REST Framework (DRF)**. Cette architecture permettra une gestion complète du cycle de vie scolaire, des inscriptions aux finances, en passant par le suivi pédagogique. L'API sera sécurisée par des tokens JWT et organisée en modules fonctionnels distincts pour faciliter la maintenance et l'évolutivité. Les fichiers et médias seront stockés sur une solution compatible S3 (MinIO ou AWS S3), et la base de données principale sera **PostgreSQL**.

Le système est conçu pour être multi-tenant, avec une isolation des données gérée par schéma pour les clients Enterprise et par Row-Level Security (RLS) pour les plans Starter/Pro. Une API Gateway (non implémentée directement dans Django mais devant être devant l'application) gérera le *rate limiting*, l'authentification et le *routing*.

### 1.2 Conventions de l'API
L'API suivra les principes RESTful standards :

*   **Verbes HTTP :** Utilisation appropriée des verbes HTTP (GET, POST, PUT, PATCH, DELETE) pour les opérations CRUD.
*   **URLs :** Ressources identifiées par des URLs claires et prévisibles (ex: `/api/v1/schools/{id}/students`).
*   **Format des données :** Toutes les requêtes et réponses utiliseront le format JSON.
*   **Pagination :** Utilisation de la pagination basée sur le curseur ou l'offset pour les listes de ressources volumineuses.
*   **Filtrage et tri :** Possibilité de filtrer et trier les collections de ressources via des paramètres de requête (ex: `?status=active&ordering=-created_at`).
*   **Versionning :** L'API sera versionnée (ex: `/api/v1/`) pour permettre des évolutions futures sans casser la compatibilité ascendante.

### 1.3 Réponses standard
Les réponses de l'API respecteront les codes de statut HTTP standards et incluront des messages d'erreur clairs en cas de problème.

| Code HTTP | Description | Exemple de Réponse JSON |
| :-------- | :---------- | :---------------------- |
| `200 OK` | Succès de la requête. | `{"status": "success", "data": {...}}` |
| `201 Created` | Ressource créée avec succès. | `{"status": "success", "data": {...}}` |
| `204 No Content` | Requête traitée avec succès, aucune donnée à retourner. | (Aucun corps de réponse) |
| `400 Bad Request` | Requête invalide (ex: validation échouée). | `{"status": "error", "message": "Données invalides", "errors": {...}}` |
| `401 Unauthorized` | Authentification requise ou échouée. | `{"status": "error", "message": "Authentification requise"}` |
| `403 Forbidden` | Accès refusé (permissions insuffisantes). | `{"status": "error", "message": "Accès refusé"}` |
| `404 Not Found` | Ressource non trouvée. | `{"status": "error", "message": "Ressource non trouvée"}` |
| `500 Internal Server Error` | Erreur serveur inattendue. | `{"status": "error", "message": "Erreur interne du serveur"}` |

## 2. Module Authentification & RBAC

### 2.1 Modèles de données
L'authentification sera gérée par le système d'authentification de Django, étendu pour supporter les rôles et permissions spécifiques à Eduguinée 3.0.

*   **`User` (Modèle étendu de `AbstractUser`) :**
    *   Champs : `email` (unique), `password` (haché), `first_name`, `last_name`, `phone`, `tenant` (ForeignKey vers `Tenant`), `role` (ForeignKey vers `Role`), `custom_permissions` (JSONField pour permissions granulaires si `role` est 'Custom'), `is_active`, `last_login`, `email_verified`, `phone_verified`.
    *   Méthodes : Gestion des mots de passe, vérification d'email/téléphone.
*   **`Role` :**
    *   Champs : `name` (ex: 'ADMIN_SCHOOL', 'TEACHER', 'PARENT'), `description`.
    *   Relations : Many-to-Many avec `Permission`.
*   **`Permission` :**
    *   Champs : `codename` (ex: 'can_create_student', 'can_view_grades'), `name`, `description`.

### 2.2 Endpoints
| Méthode | Endpoint | Description | Authentification | Permissions requises |
| :------ | :------- | :---------- | :--------------- | :------------------- |
| `POST` | `/auth/register/` | Inscription d'un nouvel utilisateur. | Aucune | Aucune |
| `POST` | `/auth/login/` | Connexion et obtention des tokens JWT. | Aucune | Aucune |
| `POST` | `/auth/refresh/` | Rafraîchissement des tokens JWT. | Token de rafraîchissement | Aucune |
| `POST` | `/auth/logout/` | Déconnexion et invalidation du token. | JWT | Aucune |
| `GET` | `/users/me/` | Récupération du profil de l'utilisateur connecté. | JWT | `is_authenticated` |
| `PATCH` | `/users/me/` | Mise à jour du profil de l'utilisateur connecté. | JWT | `is_authenticated` |
| `GET` | `/users/` | Lister les utilisateurs (Super Admin). | JWT | `can_view_users` |
| `POST` | `/users/` | Créer un utilisateur (Super Admin/Admin École). | JWT | `can_create_user` |
| `PUT` | `/users/{id}/` | Mettre à jour un utilisateur. | JWT | `can_edit_user` |
| `DELETE` | `/users/{id}/` | Supprimer un utilisateur. | JWT | `can_delete_user` |

## 3. Module Super Administration (Gestion des Écoles)

Ce module gère le cycle de vie des établissements scolaires (tenants) sur la plateforme SaaS.

### 3.1 Modèles de données
*   **`Tenant` (École) :**
    *   Champs : `id` (UUID), `name`, `slug` (pour sous-domaine), `code_minedu`, `type`, `status` (Active, Suspended, Trial, Cancelled), `plan` (ForeignKey vers `Plan`), `created_at`, `settings` (JSONField pour configurations spécifiques à l'école).
    *   Méthodes : Génération automatique du slug, gestion du statut.
*   **`Plan` :**
    *   Champs : `name` (Starter, Pro, Enterprise), `max_students`, `max_staff`, `modules_activated` (JSONField), `storage_max`, `price_monthly`, `price_annual`.
*   **`Subscription` :**
    *   Champs : `tenant` (ForeignKey vers `Tenant`), `plan` (ForeignKey vers `Plan`), `start_date`, `end_date`, `status` (TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED), `last_payment_date`.

### 3.2 Endpoints
| Méthode | Endpoint | Description | Authentification | Permissions requises |
| :------ | :------- | :---------- | :--------------- | :------------------- |
| `POST` | `/superadmin/schools/` | Créer une nouvelle école (tenant). | JWT | `can_create_school` |
| `GET` | `/superadmin/schools/` | Lister toutes les écoles. | JWT | `can_view_schools` |
| `GET` | `/superadmin/schools/{id}/` | Obtenir les détails d'une école. | JWT | `can_view_school_detail` |
| `PATCH` | `/superadmin/schools/{id}/suspend/` | Suspendre une école (soft/hard). | JWT | `can_suspend_school` |
| `PATCH` | `/superadmin/schools/{id}/reactivate/` | Réactiver une école. | JWT | `can_reactivate_school` |
| `POST` | `/superadmin/plans/` | Créer un nouveau plan d'abonnement. | JWT | `can_create_plan` |
| `GET` | `/superadmin/plans/` | Lister les plans d'abonnement. | JWT | `can_view_plans` |
| `PUT` | `/superadmin/plans/{id}/` | Mettre à jour un plan. | JWT | `can_edit_plan` |

## 4. Module Pédagogie

Ce module gère toutes les fonctionnalités liées à l'enseignement et au suivi des élèves.

### 4.1 Modèles de données
*   **`SchoolYear` :**
    *   Champs : `tenant` (ForeignKey), `label` (ex: 
2025-2026), `start_date`, `end_date`, `status` (Preparation, Active, Closed), `is_current` (Boolean).
*   **`Level` :**
    *   Champs : `tenant` (ForeignKey), `cycle` (ENUM: Primaire, College, Lycee, Superieur), `name` (ex: "6ème", "Terminale"), `order_index`.
*   **`Class` :**
    *   Champs : `tenant` (ForeignKey), `school_year` (ForeignKey), `level` (ForeignKey), `name` (ex: "6ème A"), `capacity`, `room`, `main_teacher` (ForeignKey vers `User`, NULLable).
*   **`Subject` :**
    *   Champs : `tenant` (ForeignKey), `code`, `name`, `category` (ENUM: Scientific, Literary, Artistic, Physical, Civic), `is_official`.
*   **`ClassSubject` (Table intermédiaire Many-to-Many) :**
    *   Champs : `class` (ForeignKey), `subject` (ForeignKey), `coefficient`, `weekly_hours`, `teacher` (ForeignKey vers `User`, NULLable).
*   **`TimetableSlot` :**
    *   Champs : `tenant` (ForeignKey), `class` (ForeignKey), `teacher` (ForeignKey), `subject` (ForeignKey), `room`, `day_of_week`, `start_time`, `end_time`, `is_recurring`, `specific_date` (Date, NULLable).
*   **`Attendance` :**
    *   Champs : `tenant` (ForeignKey), `student` (ForeignKey), `class` (ForeignKey), `subject` (ForeignKey, NULLable), `date`, `status` (ENUM: Present, Absent, Absent_Justified, Late, Excluded), `minutes_late`, `justification`, `justified_by` (ForeignKey vers `User`, NULLable), `created_by` (ForeignKey vers `User`), `created_at`.
*   **`Evaluation` :**
    *   Champs : `tenant` (ForeignKey), `class` (ForeignKey), `subject` (ForeignKey), `teacher` (ForeignKey), `type` (ENUM: Cc, Ds, Tp, Participation, Oral), `title`, `max_score`, `coefficient`, `date`, `deadline` (Date, NULLable), `is_published`.
*   **`Grade` :**
    *   Champs : `tenant` (ForeignKey), `student` (ForeignKey), `evaluation` (ForeignKey), `score`, `comment`, `created_by` (ForeignKey), `created_at`, `updated_at`, `version` (pour audit trail).

### 4.2 Endpoints
| Méthode | Endpoint | Description | Authentification | Permissions requises |
| :------ | :------- | :---------- | :--------------- | :------------------- |
| `GET` | `/pedagogy/schoolyears/` | Lister les années scolaires. | JWT | `can_view_schoolyears` |
| `POST` | `/pedagogy/schoolyears/` | Créer une nouvelle année scolaire. | JWT | `can_create_schoolyear` |
| `GET` | `/pedagogy/classes/` | Lister les classes. | JWT | `can_view_classes` |
| `POST` | `/pedagogy/classes/` | Créer une nouvelle classe. | JWT | `can_create_class` |
| `GET` | `/pedagogy/students/` | Lister les élèves. | JWT | `can_view_students` |
| `POST` | `/pedagogy/students/` | Inscrire un nouvel élève. | JWT | `can_create_student` |
| `GET` | `/pedagogy/students/{id}/grades/` | Obtenir les notes d'un élève. | JWT | `can_view_student_grades` |
| `POST` | `/pedagogy/evaluations/` | Créer une nouvelle évaluation. | JWT | `can_create_evaluation` |
| `PATCH` | `/pedagogy/evaluations/{id}/lock/` | Verrouiller une évaluation. | JWT | `can_lock_evaluation` |
| `POST` | `/pedagogy/grades/bulk/` | Saisir les notes en masse. | JWT | `can_bulk_add_grades` |
| `GET` | `/pedagogy/attendances/` | Lister les présences. | JWT | `can_view_attendances` |
| `POST` | `/pedagogy/attendances/` | Enregistrer une présence/absence. | JWT | `can_record_attendance` |

## 4.5. Module Gestion des Élèves et des Notes

Ce module couvre le cycle de vie complet d'un élève sur la plateforme Eduguinée : de son inscription initiale à sa sortie (diplômé, transféré ou exclu), en passant par la gestion de ses notes, son passage en classe supérieure et son éventuel redoublement.

Il est conçu pour fonctionner dans l'architecture multi-tenant d'Eduguinée : chaque école dispose d'un schéma isolé, et toutes les données élèves sont strictement cloisonnées par établissement.

Périmètre : ce module ne couvre PAS les bulletins de notes (module séparé) ni la gestion des absences/présences (roadmap). Le système de notation est mixte : note sur 20 pour la majorité des matières, coefficient variable selon les disciplines.

### 1. Acteurs et Rôles

| Rôle | Permissions dans ce module |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_SCHOOL` | Directeur ou admin de l'école. Accès complet : inscription, modification, décision de passage/redoublement, archivage. |
| `SECRETAIRE` | Agent administratif délégué. Peut inscrire, modifier le profil et saisir les notes. Ne peut pas valider les décisions de fin d'année. |
| `ENSEIGNANT` | Rôle hors périmètre de ce module. Interaction via le module Notes uniquement. |
| `SUPER_ADMIN` | Admin plateforme. Peut consulter sans restriction mais n'intervient pas dans la gestion quotidienne des élèves. |

### 2. Modèle de Données

### 2.1 Modèle Élève (Student)

| Champ | Description / Contraintes |
| --------------------- | ---------------------------------------------------------------------------- |
| `id` | UUID - clé primaire générée automatiquement |
| `matricule` | Identifiant unique dans l'école. Format : {ANNEE}-{SEQ:05d}. Ex : 2025-00042 |
| `nom` | Nom de famille - obligatoire, max 100 caractères |
| `prenom` | Prénom(s) - obligatoire, max 150 caractères |
| `date_naissance` | Date de naissance - obligatoire (DateField) |
| `lieu_naissance` | Lieu de naissance - texte libre, max 150 caractères |
| `sexe` | Enum : M / F |
| `photo` | Chemin fichier image - optionnel, formats acceptés : JPG, PNG, max 2 Mo |
| `tuteur_nom` | Nom complet du parent ou tuteur légal - obligatoire |
| `tuteur_telephone` | Téléphone tuteur - format Guinée (+224), obligatoire |
| `tuteur_email` | Email tuteur - optionnel, unique si renseigné |
| `tuteur_lien` | Lien de parenté - Enum : Père / Mère / Tuteur / Autre |
| `classe_actuelle` | ForeignKey → Classe (null si archivé) |
| `annee_inscription` | Année scolaire d'inscription initiale. Ex : 2024-2025 |
| `statut` | Enum : ACTIF / SUSPENDU / TRANSFERE / SORTI / ARCHIVE |
| `created_by` | ForeignKey → User (qui a créé la fiche) |
| `created_at` | DateTimeField - auto |
| `updated_at` | DateTimeField - auto |

### 2.2 Modèle Inscription / Réinscription (Enrollment)

| Champ | Description / Contraintes |
| -------------------- | ---------------------------------------------------------------- |
| `id` | UUID |
| `eleve` | ForeignKey → Student |
| `classe` | ForeignKey → Classe |
| `annee_scolaire` | Ex : 2024-2025 - ForeignKey → AnneeScolaire |
| `type_inscription` | Enum : NOUVELLE_INSCRIPTION / REINSCRIPTION / TRANSFERT_ENTRANT |
| `date_inscription` | DateField - auto |
| `inscrit_par` | ForeignKey → User |
| `frais_payes` | BooleanField - indique si les frais d'inscription ont été réglés |
| `observations` | TextField optionnel - notes administratives |

### 2.3 Modèle Note (Grade)

| Champ | Description / Contraintes |
| ------------------ | --------------------------------------------------------------------------------- |
| `id` | UUID |
| `eleve` | ForeignKey → Student |
| `matiere` | ForeignKey → Matière |
| `annee_scolaire` | ForeignKey → AnneeScolaire |
| `periode` | Enum : TRIMESTRE_1 / TRIMESTRE_2 / TRIMESTRE_3 / SEMESTRE_1 / SEMESTRE_2 / ANNUEL |
| `type_note` | Enum : DEVOIR / COMPOSITION / EXAMEN / ORAL - configurable par école |
| `note` | DecimalField(max_digits=5, decimal_places=2) - valeur brute saisie |
| `note_sur` | IntegerField - barème de la note saisie (ex : 20, 40, 100) |
| `note_convertie` | DecimalField calculé - toujours ramenée sur 20 |
| `coefficient` | DecimalField - coefficient de la matière pour cette période |
| `saisie_par` | ForeignKey → User |
| `valide` | BooleanField - note validée par l'admin (False = brouillon) |
| `created_at` | DateTimeField - auto |

Règle de conversion : `note_convertie = (note / note_sur) × 20`. La moyenne générale est calculée dynamiquement : `Σ(note_convertie × coefficient) / Σ(coefficients)`. Elle n'est jamais stockée en base - toujours recalculée à la demande.

### 2.4 Modèle Décision de Fin d'Année (YearEndDecision)

| Champ | Description / Contraintes |
| ---------------------- | --------------------------------------------------------------------------------- |
| `id` | UUID |
| `eleve` | ForeignKey → Student |
| `annee_scolaire` | ForeignKey → AnneeScolaire |
| `classe_origine` | ForeignKey → Classe |
| `decision` | Enum : ADMIS / REDOUBLE / ORIENTE / TRANSFERE / EXCLU |
| `classe_destination` | ForeignKey → Classe - null si non admis ou transféré externe |
| `moyenne_annuelle` | DecimalField - moyenne calculée et archivée au moment de la décision |
| `mention` | Enum calculé : EXCELLENT / TRES_BIEN / BIEN / ASSEZ_BIEN / PASSABLE / INSUFFISANT |
| `prise_par` | ForeignKey → User (ADMIN_SCHOOL uniquement) |
| `date_decision` | DateField - auto |
| `commentaire` | TextField optionnel |

### 3. Inscription d'un Nouvel Élève

#### 3.1 Workflow

- L'`ADMIN_SCHOOL` ou le `SECRETAIRE` accède au formulaire d'inscription.
- Saisie des informations personnelles de l'élève (obligatoires et optionnelles).
- Saisie des informations du tuteur légal.
- Sélection de la classe et de l'année scolaire.
- Validation backend : vérifications métier (voir 3.2).
- Si succès : génération automatique du matricule, création de la fiche élève, création de l'enregistrement Enrollment, notification optionnelle au tuteur.

#### 3.2 Validations Métier - Inscription

| Règle | Détail |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Unicité matricule | Le matricule généré doit être unique dans l'école pour l'année scolaire. |
| Capacité classe | Vérifier que la classe n'a pas atteint sa capacité maximale (configurable par l'école). |
| Doublon élève | Alerter si un élève avec le même nom, prénom et date de naissance existe déjà dans l'école. Bloquer si même matricule. |
| Téléphone tuteur | Format `+224 XXXXXXXXX` - validation regex obligatoire. |
| Email tuteur | Format email valide si renseigné. Unicité non obligatoire (un tuteur peut avoir plusieurs enfants). |
| Année scolaire active | L'inscription n'est possible que sur une année scolaire en statut `OUVERTE` ou `EN_COURS`. |

#### 3.3 Génération du Matricule

Format : `{ANNEE_DEBUT}-{SEQUENCE}`

- `ANNEE_DEBUT` : les 4 chiffres de l'année de début de l'année scolaire. Ex : 2025 pour 2025-2026.
- `SEQUENCE` : numéro séquentiel sur 5 chiffres, remis à zéro chaque année scolaire. Ex : 00001, 00042.
- Exemple complet : 2025-00042
- Généré côté backend uniquement - jamais saisi manuellement sauf import legacy.

### 4. Réinscription

La réinscription est le processus par lequel un élève déjà dans le système est rattaché à une nouvelle année scolaire, après validation de la décision de fin d'année.

#### 4.1 Conditions

- L'élève doit avoir le statut `ACTIF` ou avoir fait l'objet d'une décision `ADMIS` ou `REDOUBLE`.
- L'année scolaire cible doit être en statut `OUVERTE`.
- La décision de fin d'année de l'année précédente doit être validée.

#### 4.2 Workflow

- L'admin sélectionne l'élève et l'année scolaire.
- Le système pré-remplit la classe destination issue de la décision de fin d'année (modifiable si besoin).
- Création d'un nouvel enregistrement `Enrollment` avec type `REINSCRIPTION`.
- La classe_actuelle de l'élève est mise à jour.
- Un log est tracé.

### 5. Gestion des Notes

#### 5.1 Saisie des Notes

- Accessible à : `ADMIN_SCHOOL`, `SECRETAIRE`.
- La note est saisie dans le barème original (ex : `/40`, `/100`) - le système convertit automatiquement sur 20.
- Une note non validée (`valide=False`) est un brouillon visible uniquement par les admins.
- Une note validée ne peut plus être modifiée sauf par `ADMIN_SCHOOL` avec justification obligatoire (tracée en log).

#### 5.2 Système de Notation Mixte

Eduguinée supporte un système de notation mixte par matière, configurable par l'école :

| Barème | Règle |
| --------------- | --------------------------------------------------------------------------------------------- |
| Sur 20 | Standard guinéen. Note saisie directement sur 20. |
| Sur 40 | Utilisé pour certaines compositions. Converti : `(note/40)×20`. |
| Sur 100 | Utilisé pour certains examens techniques. Converti : `(note/100)×20`. |
| Coefficient | Chaque matière a un coefficient (ex : Maths = 4, EPS = 1). Configurable par niveau de classe. |

#### 5.3 Calcul de la Moyenne

- La moyenne générale n'est jamais stockée - elle est toujours calculée à la demande.
- Formule : `Moyenne = Σ(note_convertie × coefficient) / Σ(coefficients)`.
- Les matières sans note saisie sont exclues du calcul (pas de zéro automatique).
- Une API dédiée retourne la moyenne calculée par élève, par période, par année scolaire.

#### 5.4 Règles de Passage - Seuils par Défaut

Les seuils sont configurables par l'école (voir section 10). Les valeurs par défaut sont :

| Décision / Mention | Condition |
| ----------------------- | ------------------------ |
| Admis | Moyenne générale ≥ 10/20 |
| Redoublant | Moyenne générale < 10/20 |
| Mention Excellent | Moyenne ≥ 18/20 |
| Mention Très Bien | 16/20 ≤ Moyenne < 18/20 |
| Mention Bien | 14/20 ≤ Moyenne < 16/20 |
| Mention Assez Bien | 12/20 ≤ Moyenne < 14/20 |
| Mention Passable | 10/20 ≤ Moyenne < 12/20 |
| Mention Insuffisant | Moyenne < 10/20 |

### 6. Décision de Fin d'Année

#### 6.1 Déclenchement

- Disponible uniquement quand l'année scolaire est en statut `CLOTURE_EN_COURS`.
- Seul l'`ADMIN_SCHOOL` peut valider la décision (le `SECRETAIRE` peut préparer mais pas valider).

#### 6.2 Décisions Possibles

| Décision | Effets |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ADMIS` | L'élève passe en classe supérieure. La classe_destination est pré-remplie automatiquement selon le parcours défini. |
| `REDOUBLE` | L'élève reste dans la même classe l'année suivante. La classe_destination = classe_origine. |
| `ORIENTE` | L'élève est orienté vers un autre cycle ou filière (ex : vers le technique). Classe_destination dans la même école. |
| `TRANSFERE` | L'élève quitte l'école. Son statut passe à `TRANSFERE`. Un document de transfert peut être généré. |
| `EXCLU` | L'élève est exclu définitivement. Son statut passe à `SORTI`. |

#### 6.3 Effets Automatiques après Validation

- La moyenne annuelle est calculée et archivée dans `YearEndDecision` (snapshot immuable).
- Le statut de l'élève reste `ACTIF` (`ADMIS`/`REDOUBLE`/`ORIENTE`) ou change (`TRANSFERE`/`SORTI`).
- La classe_actuelle n'est PAS encore mise à jour - elle le sera lors de la réinscription.
- Un log est créé : décision, moyenne archivée, acteur, date.
- Notification optionnelle envoyée au tuteur (canal : SMS prioritaire, email en secondaire).

#### 6.4 Redoublement

- Un élève peut redoubler au maximum 2 fois dans le même niveau (configurable).
- Si le nombre maximum de redoublements est atteint, l'admin est alerté mais peut forcer la décision avec justification.
- L'historique des redoublements est tracé et consultable.

### 7. Archivage et Historique

- Un élève n'est jamais supprimé - il est archivé (statut `ARCHIVE`).
- L'historique complet (inscriptions, notes, décisions) est consultable même pour un élève archivé.
- L'archivage manuel est réservé à l'ADMIN_SCHOOL.
- Après résiliation de l'école : cf. politique de Data Retention du Module Établissements (12 mois de conservation).

### 8. API Backend

#### 8.1 Endpoints Élèves

| Méthode + Route | Description |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `POST /students/` | Créer un nouvel élève + enrollment initial |
| `GET /students/` | Lister les élèves de l'école (filtres : classe, statut, année scolaire) |
| `GET /students/{id}/` | Détail d'un élève |
| `PATCH /students/{id}/` | Modifier les informations d'un élève |
| `POST /students/{id}/reinscription/` | Réinscrire un élève pour une nouvelle année scolaire |
| `GET /students/{id}/historique/` | Historique complet : inscriptions, notes, décisions |
| `POST /students/{id}/archiver/` | Archiver un élève (ADMIN_SCHOOL uniquement) |

#### 8.2 Endpoints Notes

| Méthode + Route | Description |
| --------------------------------- | ------------------------------------------------------------ |
| `POST /grades/` | Saisir une note (brouillon par défaut) |
| `GET /grades/` | Lister les notes (filtres : élève, matière, période, année) |
| `PATCH /grades/{id}/` | Modifier une note brouillon |
| `POST /grades/{id}/valider/` | Valider une note (ADMIN_SCHOOL) |
| `GET /students/{id}/moyenne/` | Calculer et retourner la moyenne d'un élève pour une période |
| `GET /classes/{id}/classement/` | Classement des élèves d'une classe pour une période |

#### 8.3 Endpoints Fin d'Année

| Méthode + Route | Description |
| --------------------------------- | ----------------------------------------------------------- |
| `POST /year-end-decisions/` | Créer une décision de fin d'année (ADMIN_SCHOOL) |
| `GET /year-end-decisions/` | Lister les décisions (filtres : classe, année, décision) |
| `GET /year-end-decisions/{id}/` | Détail d'une décision |
| `POST /promotions/bulk/` | Traitement groupé : passer/faire redoubler toute une classe |

### 9. Configuration par École

Les paramètres suivants sont configurables par école (stockés dans le modèle `SchoolConfig`) :

| Paramètre | Description / Valeur par défaut |
| ---------------------------- | ------------------------------------------------------------------ |
| `seuil_passage` | Moyenne minimale pour être admis. Défaut : 10/20. |
| `nb_redoublements_max` | Nombre maximum de redoublements par niveau. Défaut : 2. |
| `capacite_max_classe` | Nombre maximum d'élèves par classe. Défaut : 60. |
| `periodes_notation` | Trimestres ou semestres. Enum : `TRIMESTRIEL` / `SEMESTRIEL`. |
| `notification_tuteur` | Activer les notifications SMS/email aux tuteurs. Défaut : true. |
| `validation_notes_requise` | Les notes doivent-elles être validées par l'admin ? Défaut : true. |

### 10. Sécurité et Journalisation

#### 10.1 Isolation des Données

- Toutes les données élèves sont strictement cloisonnées par schéma d'école.
- Aucune requête cross-school n'est possible depuis les endpoints publics.

#### 10.2 Actions Journalisées (Logs)

| Action | Données tracées |
| ----------------------------- | ----------------------------------------------------------- |
| Inscription | Acteur, date, classe, année scolaire |
| Modification profil | Acteur, date, champs modifiés (avant/après) |
| Saisie note | Acteur, date, matière, valeur |
| Modification note validée | Acteur, date, justification obligatoire, valeur avant/après |
| Décision fin d'année | Acteur, date, décision, moyenne archivée |
| Archivage élève | Acteur, date, motif optionnel |

### 11. Cas Particuliers

| Cas | Comportement attendu |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Élève sans tuteur joignable | Le champ `tuteur_telephone` reste obligatoire. Si introuvable, un numéro de l'école peut être utilisé temporairement avec flag `contact_provisoire`. |
| Élève transféré entrant | Créer une inscription avec type `TRANSFERT_ENTRANT`. Les notes de l'ancienne école ne sont pas importées automatiquement. |
| Double inscription | Impossible : un élève ne peut être inscrit qu'une seule fois dans une même année scolaire. |
| Note hors barème | Le backend rejette toute note_convertie > 20 ou < 0 avec message d'erreur explicite. |
| Année scolaire fermée | Aucune saisie de note ni inscription n'est possible sur une année scolaire clôturée. |
| École suspendue (soft) | L'ajout d'élèves est bloqué. Consultation et export restent accessibles. |

## 5. Module Finance

Ce module gère la facturation, les paiements et le suivi financier des élèves.

### 5.1 Modèles de données
*   **`FeeCategory` :**
    *   Champs : `tenant` (ForeignKey), `name` (ex: "Scolarité 2025-2026"), `type` (ENUM: Tuition, Registration, Canteen, Transport, Uniform, Supplies, Trip), `amount`, `installments` (JSONField pour échéancier), `is_mandatory`.
*   **`StudentFee` :**
    *   Champs : `tenant` (ForeignKey), `student` (ForeignKey), `fee_category` (ForeignKey), `total_amount`, `discount_amount`, `discount_reason`, `balance_due`.
*   **`Payment` :**
    *   Champs : `tenant` (ForeignKey), `student` (ForeignKey), `amount`, `payment_date`, `method` (ENUM: Cash, Orange_Money, Mtn_Money, Wave, Bank_Transfer, Check), `reference`, `received_by` (ForeignKey vers `User`), `status` (Pending, Completed, Failed, Cancelled), `receipt_number` (unique), `receipt_url`, `sms_notification_sent`.
*   **`Invoice` :**
    *   Champs : `tenant` (ForeignKey), `student` (ForeignKey), `school_year` (ForeignKey), `total_due`, `total_paid`, `balance`, `status` (Pending, Paid, Overdue), `pdf_url`, `generated_at`.

### 5.2 Endpoints
| Méthode | Endpoint | Description | Authentification | Permissions requises |
| :------ | :------- | :---------- | :--------------- | :------------------- |
| `GET` | `/finance/feecategories/` | Lister les catégories de frais. | JWT | `can_view_feecategories` |
| `POST` | `/finance/feecategories/` | Créer une catégorie de frais. | JWT | `can_create_feecategory` |
| `GET` | `/finance/students/{id}/fees/` | Obtenir les frais d'un élève. | JWT | `can_view_student_fees` |
| `POST` | `/finance/payments/` | Enregistrer un paiement. | JWT | `can_record_payment` |
| `GET` | `/finance/payments/` | Lister les paiements. | JWT | `can_view_payments` |
| `GET` | `/finance/invoices/` | Lister les factures. | JWT | `can_view_invoices` |
| `POST` | `/finance/invoices/{id}/generate-pdf/` | Générer le PDF d'une facture. | JWT | `can_generate_invoice_pdf` |

## 6. Module Monitoring et Support

Ce module fournit des outils pour la surveillance du système, la gestion des logs et le support utilisateur.

### 6.1 Modèles de données
*   **`AuditLog` :**
    *   Champs : `tenant` (ForeignKey, NULLable pour actions Super Admin), `user` (ForeignKey), `action` (VARCHAR), `entity_type`, `entity_id`, `old_value` (JSONField), `new_value` (JSONField), `ip_address`, `timestamp`.
*   **`SystemAlert` :**
    *   Champs : `tenant` (ForeignKey, NULLable pour alertes globales), `type` (ENUM: Error_500, Sync_Failure, High_Response_Time, Storage_Full, Backup_Failed, Subscription_Expired), `level` (ENUM: INFO, WARNING, CRITICAL), `message`, `timestamp`, `is_resolved`.
*   **`SupportTicket` :**
    *   Champs : `tenant` (ForeignKey), `user` (ForeignKey), `category` (ENUM: Technical, Billing, Functional, Feature_Request, Account_Blocked, Payment_Issue), `priority` (ENUM: Blocking, Major, Minor, Question), `description`, `screenshot_url`, `status` (Open, In_Progress, Waiting_Customer, Resolved, Closed), `assigned_to` (ForeignKey vers `User`, NULLable), `created_at`, `updated_at`.
*   **`TicketMessage` :**
    *   Champs : `ticket` (ForeignKey), `sender` (ForeignKey vers `User`), `message`, `timestamp`.

### 6.2 Endpoints
| Méthode | Endpoint | Description | Authentification | Permissions requises |
| :------ | :------- | :---------- | :--------------- | :------------------- |
| `GET` | `/monitoring/auditlogs/` | Lister les logs d'audit. | JWT | `can_view_auditlogs` |
| `GET` | `/monitoring/systemalerts/` | Lister les alertes système. | JWT | `can_view_systemalerts` |
| `POST` | `/support/tickets/` | Créer un nouveau ticket de support. | JWT | `is_authenticated` |
| `GET` | `/support/tickets/` | Lister les tickets de support. | JWT | `can_view_tickets` |
| `GET` | `/support/tickets/{id}/` | Obtenir les détails d'un ticket. | JWT | `can_view_ticket_detail` |
| `POST` | `/support/tickets/{id}/messages/` | Ajouter un message à un ticket. | JWT | `can_add_ticket_message` |
| `PATCH` | `/support/tickets/{id}/assign/` | Assigner un ticket à un agent. | JWT | `can_assign_ticket` |
| `PATCH` | `/support/tickets/{id}/status/` | Mettre à jour le statut d'un ticket. | JWT | `can_update_ticket_status` |

## 7. Intégrations Tierces

Le backend s'intégrera avec plusieurs services externes pour les communications et les paiements.

### 7.1 Paiements Mobile Money
*   **Orange Money Guinée / MTN MoMo :** Intégration via leurs APIs REST respectives.
    *   **Implémentation :** Utilisation de bibliothèques Python dédiées ou de requêtes HTTP directes. Gestion de l'idempotence, de la logique de retry (3 tentatives avec backoff exponentiel) et de la réconciliation nocturne des transactions.
    *   **Webhooks :** Mise en place de endpoints pour recevoir les notifications de paiement en temps réel.

### 7.2 Communication
*   **Africastalking (SMS) :** Envoi de SMS transactionnels (absences, paiements, rappels).
    *   **Implémentation :** Utilisation du SDK Python d'Africastalking. Gestion des files d'attente pour l'envoi asynchrone.
*   **Sendgrid (Email) :** Envoi d'emails (bulletins, reçus, notifications).
    *   **Implémentation :** Utilisation du SDK Python de Sendgrid. Intégration de templates pour les différents types d'emails.
*   **Firebase Cloud Messaging (Push) :** Notifications push pour les applications mobiles.
    *   **Implémentation :** Utilisation du SDK Admin Firebase pour Python. Fallback SMS si la notification push n'est pas délivrée.

### 7.3 Stockage de Fichiers
*   **MinIO / AWS S3 :** Stockage des documents (photos d'élèves, bulletins PDF, pièces d'identité).
    *   **Implémentation :** Utilisation de `django-storages` avec un backend S3 compatible. Génération d'URLs pré-signées pour l'upload et le téléchargement sécurisé.
    *   **Organisation :** Buckets distincts ou préfixes par type de fichier (ex: `eduguinee-prod/schools/{tenant_id}/students/{student_id}/photos/`).

## 8. Exigences Non-Fonctionnelles

### 8.1 Performance
*   **Temps de Réponse API :** Moins de 200 ms pour 95% des requêtes (hors rapports lourds).
*   **Utilisateurs Concurrents :** Support de 1000 utilisateurs simultanés par tenant (école de grande taille).
*   **Upload de Fichiers :** Photos max 2 Mo, documents PDF max 10 Mo, timeout 30s.
*   **Génération de Rapports :** Génération de bulletins PDF pour une classe de 50 élèves en moins de 5 secondes.

### 8.2 Disponibilité et Fiabilité
*   **SLA :** 99.9% d'uptime (maximum 8.76 heures d'indisponibilité par an).
*   **Sauvegardes :** Quotidiennes à 3h GMT, rétention de 30 jours. Fichiers synchronisés en temps réel vers un stockage secondaire.
*   **Disaster Recovery :** RTO (Recovery Time Objective) < 4h, RPO (Recovery Point Objective) < 1h.

### 8.3 Sécurité
*   **Authentification :** JWT avec rotation des refresh tokens, expiration de 15 minutes pour les access tokens et 7 jours pour les refresh tokens.
*   **Autorisation :** RBAC (Role-Based Access Control) et ABAC (Attribute-Based Access Control) pour les cas complexes, implémentés via les permissions de Django.
*   **Chiffrement :** Données sensibles (mots de passe, informations financières) chiffrées au repos et en transit (TLS).
*   **Audit Trail :** Logs d'audit immuables pour toutes les actions critiques, conservés pendant au moins 1 an.
*   **Protection :** Contre les attaques par force brute, injections SQL, XSS, CSRF.

### 8.4 Scalabilité
*   **Horizontal Scaling :** L'architecture doit permettre l'ajout facile de nouvelles instances de serveurs d'applications et de bases de données.
*   **Multi-Tenant :** La conception multi-tenant doit garantir que l'ajout de nouvelles écoles n'impacte pas significativement les performances des écoles existantes.

## 9. Dépendances & Configuration

### 9.1 Packages Python requis
```python
Django==5.x
djangorestframework==3.x
djangorestframework-simplejwt==5.x
psycopg2-binary==2.x # PostgreSQL adapter
django-storages==1.x # For S3/MinIO integration
boto3==1.x # AWS SDK for S3
redis==5.x
django-celery-beat==2.x # For scheduled tasks
django-celery-results==2.x # For storing task results
celery==5.x # Asynchronous task queue
python-decouple==3.x # For environment variables
drf-spectacular==0.x # For API documentation
```

### 9.2 Variables d'environnement
Les configurations sensibles et spécifiques à l'environnement seront gérées via des variables d'environnement (`.env` file).

*   `DJANGO_SETTINGS_MODULE`
*   `SECRET_KEY`
*   `DEBUG`
*   `DATABASE_URL` (format `postgres://user:password@host:port/dbname`)
*   `REDIS_URL`
*   `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME` (ou équivalent AWS S3)
*   `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`
*   `SENDGRID_API_KEY`
*   `FIREBASE_CREDENTIALS_PATH`
*   `ORANGE_MONEY_API_KEY`, `ORANGE_MONEY_SECRET`
*   `MTN_MOMO_API_KEY`, `MTN_MOMO_SECRET`

### 9.3 Documentation API (drf-spectacular)
L'API sera auto-documentée en utilisant `drf-spectacular` pour générer une spécification OpenAPI (Swagger UI) interactive. Cela facilitera l'intégration pour les développeurs frontend et les partenaires externes.

## 10. Références

*   [Django Documentation](https://docs.djangoproject.com/en/stable/)
*   [Django REST Framework Documentation](https://www.django-rest-framework.org/)
*   [Django Simple JWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/en/latest/)
*   [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
*   [Africastalking Documentation](https://developers.africastalking.com/)
*   [SendGrid Documentation](https://docs.sendgrid.com/)
*   [Firebase Admin SDK for Python](https://firebase.google.com/docs/admin/setup/)
