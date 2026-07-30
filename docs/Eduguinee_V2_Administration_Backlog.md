# Eduguinée — Backlog V2 : Administration (Super Admin + École) & Chantiers Transversaux

> **Statut :** en cours — SCHOOLYEAR-V2-01 livré (2026-07-29), SCHOOLYEAR-V2-02 en cours (fondation livrée, découpée en sous-tickets A→F).
> **Périmètre :** ce backlog complète le MVP V1 (Épics 0 à 8, terminés) sur deux axes d'administration, plus deux chantiers transversaux indispensables à leur bon fonctionnement.
> **Ordre de traitement validé (PO) :** Chantier année scolaire → Module A (Super Admin) → Module B (Personnel) → Infra MinIO. L'ordre ci-dessous reflète cette priorité, pas l'ordre de rédaction.
> **Sources :** `Eduguinee_CDC_Complet.md` §4.4-4.6, §5, §6, §10, §21.1, §21.3 ; retour d'expérience V1 (Épics 2, 6.1, 7).

---

## 📍 Décisions actées avant le cadrage détaillé

| # | Question | Décision |
|---|---|---|
| 1 | `GUEST_TEACHER` : nouveau rôle RBAC ou attribut temporel ? | **Attribut temporel sur `TEACHER` existant** (`access_start_date`/`access_end_date`, vérifiés au login) — pas de 7ᵉ rôle ajouté pour une simple contrainte de fenêtre d'accès. |
| 2 | Ordre de traitement | Chantier année scolaire (le plus structurant et le plus risqué à laisser de côté) → Module A → Module B → Infra MinIO. |

**Reporté explicitement en V3 (hors périmètre de cette phase) :**
- Module A : multi-campus, 2FA (TOTP) `SUPER_ADMIN`/`DIRECTOR`, coupons/codes promo, politique de rétention post-résiliation, tickets de support, alertes système, cartographie interactive.
- Module B : historique complet des affectations, `TeacherContext`/School Switcher multi-établissement, enseignant remplaçant avec transfert temporaire de droits.

---

## Chantier transversal — Année scolaire courante appliquée automatiquement

**Objectif :** une fois une année scolaire ouverte, elle s'applique par défaut à la création de tout élément de l'établissement (élève, classe, note, frais...) jusqu'à sa clôture — plus de sélection manuelle systématique de l'année.

**Dépend de :** rien (peut démarrer immédiatement) — mais touche potentiellement les Épics 3, 4, 6 et 7 déjà livrés.

### 🃏 [SCHOOLYEAR-V2-01] Formaliser le workflow ouverture/clôture — ✅ Livré 2026-07-29
**Priorité :** 🔴 Bloquant (prérequis à SCHOOLYEAR-V2-02)
- [x] `PATCH /pedagogy/schoolyears/{id}/close/` — n'existe pas actuellement (seuls `set-current` et la clôture de périodes individuelles existent). Passe `SchoolYear.status = CLOSED`.
- [x] Validation avant clôture : toutes les `AcademicPeriod` de l'année doivent être `is_closed=True`, sinon `422`. Étendu (décision PO) : refuse aussi une année sans aucune période (`422`), et une clôture déjà effectuée (`422`, pas de no-op silencieux).
- [x] Clôturer une année ne rend **jamais** automatiquement une autre année "courante" — `set-current` reste une action explicite et distincte du Directeur. Aucune contrainte `is_current` sur la clôture (décision PO explicite).
- [x] Une fois `CLOSED`, aucune écriture ne doit plus être possible dessus, nulle part dans l'application. Tests systématiques sur : création de classe, ajout de matière à une classe, création/clôture de période, présences (saisie/correction/justification), évaluations (création/verrouillage), notes (saisie en masse/validation/modification), décision de fin d'année, catégories de frais (création/modification/suppression), assignation de frais élève — chacun refuse une écriture sur une année clôturée (`422`). Exception actée (décision PO) : les paiements (`POST /finance/payments/`, `orange-money/initiate`) restent autorisés même sur une année clôturée (encaissement d'arriérés).
**Labels :** `schoolyear` `backend` `priorité-critique`
**Notes de livraison :**
- Point d'entrée central unique : `assert_school_year_open()` / `close_school_year()` (`apps/pedagogy/services/school_year_service.py`), appelé à chaque point d'écriture concerné plutôt que dupliqué.
- Codenames de permission ajoutés : `pedagogy:update:schoolyear` (set-current) et `pedagogy:close:schoolyear` (close), `DIRECTOR` uniquement. `PeriodViewSet.close` réutilise `pedagogy:create:period`.
- Corrections de sécurité découvertes en marge (hors périmètre initial, corrigées dans ce même ticket) : `set-current` et la clôture de période n'avaient auparavant aucune permission au-delà d'`IsAuthenticated`.
- `StudentFeeViewSet` n'a pas de route update/destroy (l'API n'expose que `list`/`create`/`retrieve`) : aucune garde ajoutée à cet endroit, il n'y a rien à protéger.

### 🃏 [SCHOOLYEAR-V2-02] Application automatique de l'année courante (refactor transversal)
**Priorité :** 🔴 Bloquant, gros chantier — à découper en sous-tickets par module lors du cadrage
- [ ] **Principe** : partout où `school_year`/`school_year_id` est un champ **obligatoire** saisi manuellement, il devient **optionnel**, avec comme valeur par défaut `SchoolYear.objects.get(tenant=tenant, is_current=True)`. Possibilité de le surcharger explicitement, réservée à `DIRECTOR`.
- [x] **Un seul point de résolution centralisé** : fonction `get_current_school_year(tenant)` unique (`apps/pedagogy/services/school_year_service.py`, à côté de `assert_school_year_open`), importée partout où l'année courante est nécessaire — **jamais** de logique de résolution dupliquée à plusieurs endroits (rappel direct des trois bugs de résolution d'année trouvés en Épic 7). *(Sous-ticket A — livré.)*
- [ ] **Endpoints à auditer et corriger un par un** (vérifier chacun, ne pas supposer) :
  - [x] `POST /students/` (Épic 4) — `school_year_id` actuellement obligatoire. *(Sous-ticket B — livré.)*
  - [x] `POST /pedagogy/classes/` (Épic 3) — `school_year` actuellement un champ du payload. *(Sous-ticket C — livré.)*
  - [x] `POST /students/{id}/reinscription/` (Épic 4) — `school_year_id` obligatoire. *(Sous-ticket B — livré.)*
  - [ ] `POST /pedagogy/evaluations/` (Épic 6) — indirect via `period` ; le sélecteur de période côté frontend doit filtrer sur l'année courante par défaut. Audit confirmé : aucun champ `school_year` en payload, rien à rendre optionnel côté backend — traitement 100% frontend. *(Sous-ticket E)*
  - [ ] `POST /finance/feecategories/` (Épic 7) — `school_year` actuellement un champ obligatoire du payload. *(Sous-ticket D)*
  - [ ] `POST /pedagogy/year-end-decisions/` et `POST /pedagogy/promotions/bulk/` — ajoutés au périmètre (hors liste initiale, trouvés à l'audit, confirmés par le PO). *(Sous-ticket F)*
- [x] **Cas limite à traiter explicitement** : aucune année n'a `is_current=True` au moment de l'appel → `422` avec message clair ("Aucune année scolaire courante n'est définie — contactez votre Directeur"), jamais un crash ou un comportement silencieux. *(Sous-ticket A — livré, `SchoolYearError` réutilisée.)*
- [ ] **Documentation** : chaque endpoint dont le payload change (champ obligatoire → optionnel) doit être mis à jour dans le contrat d'API avec une note explicite de migration.
- [ ] Frontend : les formulaires concernés perdent leur sélecteur d'année scolaire par défaut (ou le masquent en mode "avancé", visible seulement pour `DIRECTOR`).
**Labels :** `schoolyear` `backend` `frontend` `priorité-critique` `refactor`
**Découpage validé (PO, 2026-07-29) :** A. `get_current_school_year()` + tests service (fondation) → B. Élèves (enroll + réinscription) → C. Classes (pedagogy) → D. Frais (finance feecategories) → E. Évaluations (frontend seul) → F. Décisions de fin d'année + promotions en masse. Un commit par lettre.
**Décisions complémentaires (PO, 2026-07-29) :**
- Permission d'override : nouveau codename `pedagogy:override:schoolyear` (`DIRECTOR` uniquement), plutôt qu'un check de rôle en dur — cohérent avec `custom_permissions` (STAFF-V2-03).
- Un non-`DIRECTOR` envoyant explicitement une valeur **identique** à l'année courante résolue n'est pas bloqué (pas un vrai contournement) ; seul un écart réel déclenche `403`.
- `PromotionsBulkSerializer.school_year_cible_id` : nom du champ **non renommé** dans ce ticket malgré la confusion sémantique identifiée (désigne en réalité l'année dont on traite les décisions, pas une "cible" d'inscription) — clarifié par docstring/contrat uniquement.
**Sous-ticket B — notes de livraison (2026-07-30) :**
- `resolve_school_year(*, tenant, user, explicit)` ajoutée à `school_year_service.py` (politique défaut/override, un seul point pour les sous-tickets B→F) ; migration `pedagogy:override:schoolyear` accordée à `DIRECTOR`.
- `StudentCreateSerializer.school_year_id` et `ReinscriptionSerializer.school_year_id` : `required=False, allow_null=True` + résolution dans `validate()`. `enroll_student()`/`reinscribe_student()` inchangés (reçoivent toujours une `SchoolYear` déjà résolue).
- Frontend : `EnrollStudentForm.tsx` et `StudentTabs.tsx` (`ReinscriptionForm`) — sélecteur d'année masqué pour non-`DIRECTOR`, visible avec défaut "Année courante" pour `DIRECTOR` ; `role` propagé depuis `students/new/page.tsx` et `students/[id]/page.tsx`.
- Contrat d'API mis à jour (`POST /students/`, `POST /students/{id}/reinscription/`) avec note de migration.
**Sous-ticket C — notes de livraison (2026-07-30) :**
- Piège découvert : `SchoolClass` a une contrainte unique `(school_year, name)` — DRF génère automatiquement un `UniqueTogetherValidator` qui exige que les deux champs soient déjà présents dans le payload **avant** `validate()`. Résoudre `school_year` après `serializer.is_valid()` (comme en sous-ticket B) échouait donc systématiquement avec « Ce champ est obligatoire. ». Fix : résolution défaut/override faite dans la vue **avant** la construction du serializer, valeur injectée dans le payload transmis.
- Isolation multi-tenant corrigée à cette occasion : un `school_year` explicite appartenant à un autre tenant renvoie désormais `404` (auparavant non vérifié explicitement — la validation du champ ne filtrait pas par tenant).
- Incohérence contrat/code corrigée : le contrat documentait `school_year_id`, le code et le frontend ont toujours utilisé `school_year`.
- Hors périmètre, signalé sans être corrigé : `level_id` sur ce même endpoint n'est pas vérifié comme appartenant au tenant avant `Level.objects.get(...)` dans `ClassSerializer.create()` — un `level_id` d'un autre tenant provoque un `500` (`Level.DoesNotExist` non catché), pas un `404`. Bug pré-existant, indépendant de `school_year`, à traiter séparément.
- Frontend : `ClassSheet.tsx` — sélecteur d'année masqué pour non-`DIRECTOR` ; `role` propagé depuis `pedagogy/classes/page.tsx`.
- `finance/fees` : le champ `school_year` est verrouillé pour non-`DIRECTOR` en création **et** en modification (une réattribution a posteriori désynchroniserait des `Invoice` déjà calculées).
- Sélecteurs de **consultation** (ex. `syId` dans `GradeEntryClient`) : seule leur valeur par défaut est pré-remplie sur l'année courante, ils restent librement changeables pour tous les rôles (lecture ≠ écriture).

---

## Module A — Super Administration (plateforme)

**Déjà construit (Épic 2, V1) :** CRUD `Tenant`, `Plan` simplifié, `suspend`/`reactivate` (binaire), création automatique du compte Directeur, `AuditLog` de base.

### 🃏 [SUPERADMIN-V2-01] Distinction suspension soft/hard
**Priorité :** 🔴 Bloquant
- [ ] `Tenant.status` : ajoute `SUSPENDED_SOFT`/`SUSPENDED_HARD` (ou champ `suspension_type` séparé si `SUSPENDED` générique est conservé — décision à signaler par l'agent avant de coder).
- [ ] Soft : lecture seule (aucune création via API), consultation/export toujours accessibles.
- [ ] Hard : blocage total, y compris lecture, sauf pour `SUPER_ADMIN`.
- [ ] `TenantMiddleware` adapté pour appliquer la restriction soft (bloquer uniquement les méthodes d'écriture).
- [ ] Notification email/SMS au contact principal à chaque changement (réutilise le pattern existant, Épic 2).
**Labels :** `superadmin` `backend` `priorité-haute`

### 🃏 [SUPERADMIN-V2-02] Tableau de bord Super Admin
**Priorité :** 🟠 Haute
- [ ] `GET /superadmin/dashboard/` : nb écoles totales/actives/suspendues/en essai, MRR estimé (Σ `Plan.price_monthly` des tenants actifs).
- [ ] Graphique d'évolution des créations d'écoles dans le temps.
- [ ] Liste des dernières écoles créées.
- [ ] Frontend : `/app/superadmin/dashboard`.
- [ ] Cartographie interactive — **hors périmètre**, reportée en V3.
**Labels :** `superadmin` `backend` `frontend`

### 🃏 [SUPERADMIN-V2-03] Gestion des plans (UI complète)
**Priorité :** 🟠 Haute
- [ ] `POST /superadmin/plans/`, `PUT/PATCH /superadmin/plans/{id}/`.
- [ ] `PATCH /superadmin/schools/{id}/change-plan/` — changer le plan d'une école a posteriori, effet immédiat sur `max_students`/`max_staff`.
- [ ] Frontend : `/app/superadmin/plans` (liste, création, édition).
- [ ] Vérifier avant suppression d'un plan qu'aucun tenant actif n'y est rattaché.
**Labels :** `superadmin` `backend` `frontend`

### 🃏 [SUPERADMIN-V2-04] Gestion des impayés côté plateforme
**Priorité :** 🟡 Moyenne — **dépend de SUPERADMIN-V2-01 et SUPERADMIN-V2-05**
- [ ] Détection automatique (tâche Celery Beat, même pattern que `flag_overdue_invoices`, Épic 7 — un niveau au-dessus : facture SaaS, pas facture élève).
- [ ] Relances automatiques (email + SMS, réutilise l'infra Épic 8).
- [ ] Escalade progressive paramétrable : `ACTIVE` → `SUSPENDED_SOFT` → `SUSPENDED_HARD`.
**Labels :** `superadmin` `backend` `priorité-moyenne`

### 🃏 [SUPERADMIN-V2-05] Facturation SaaS écoles → plateforme
**Priorité :** 🟡 Moyenne
- [ ] Nouveau modèle **`PlatformInvoice`** — bien distinct de `apps.finance.Invoice` (celui-ci facture les parents ; `PlatformInvoice` facture l'établissement pour son abonnement). Nom à choisir avec soin pour éviter toute confusion avec le modèle existant.
- [ ] Génération automatique à chaque échéance d'abonnement (mensuel, basé sur `Plan.price_monthly`).
- [ ] `GET /superadmin/schools/{id}/invoices/`.
**Labels :** `superadmin` `backend`

**Notes pour plus tard (V3) :** coupons/codes promo, politique de rétention post-résiliation (12 mois puis suppression), tickets de support, alertes système (500, stockage plein, sauvegarde), multi-campus, 2FA.

---

## Module B — Administration École : Personnel

**Déjà construit (Épic 6.1, V1) :** réutilisation `User`/`Role`, création `TEACHER`/`STUDENT_STUDIES`/`ACCOUNTANT`, `disable`/`enable`, `must_change_password`.

### 🃏 [STAFF-V2-01] Fiche personnel enrichie
**Priorité :** 🔴 Bloquant
- [ ] Ajout de champs (sur `User` ou modèle `StaffProfile` séparé — décision à trancher par l'agent selon la propreté du modèle actuel, à signaler) : `date_naissance`, `sexe`, `date_embauche`, `type_contrat`, `numero_cnss`, `compte_paie` (banque/mobile money), `statut` (`ACTIF`/`EN_CONGE`/`SUSPENDU`/`PARTI`).
- [ ] Clarifier la relation entre `statut` (métadonnée RH) et `is_active` (contrôle d'accès binaire existant) — les deux doivent coexister sans se contredire.
- [ ] `StaffCreateSerializer`/`StaffUpdateSerializer` étendus en conséquence.
- [ ] Frontend : `/app/staff/new` et `/app/staff/[id]` enrichis.
**Labels :** `personnel` `backend` `frontend` `priorité-haute`

### 🃏 [STAFF-V2-02] Changement de rôle d'un compte existant
**Priorité :** 🟠 Haute
- [ ] `PATCH /auth/staff/{id}/change-role/` — endpoint d'action dédié (cohérent avec le principe déjà établi : actions sensibles = endpoint nommé, pas un champ noyé dans un `PATCH` générique).
- [ ] Permission `staff:update` (`DIRECTOR` uniquement).
- [ ] `AuditLog` obligatoire (ancien rôle → nouveau rôle).
- [ ] Rôles autorisés en cible : mêmes que la création (`TEACHER`/`STUDENT_STUDIES`/`ACCOUNTANT`), jamais `DIRECTOR`.
**Labels :** `personnel` `backend`

### 🃏 [STAFF-V2-03] Rôles composites via `custom_permissions`
**Priorité :** 🟡 Moyenne
- [ ] Interface sur la fiche staff pour ajouter des permissions individuelles en plus du rôle de base (champ `custom_permissions` JSON existant depuis l'Épic 1, jamais exposé en UI).
- [ ] `GET /auth/permissions/catalog/` — liste de tous les codenames disponibles (à créer si absent), pour peupler un sélecteur.
- [ ] Pas de nouveau rôle composite en base (type `SECRETARY_ACCOUNTANT`) — le mécanisme `custom_permissions` suffit à simuler le cumul.
**Labels :** `personnel` `backend` `frontend`

### 🃏 [STAFF-V2-04] Spécificités enseignants
**Priorité :** 🟠 Haute
- [ ] Champs supplémentaires : `grade` (échelle guinéenne : instituteur adjoint / instituteur / professeur adjoint d'enseignement secondaire / professeur d'enseignement secondaire / professeur certifié), `statut_emploi` (`TITULAIRE`/`CONTRACTUEL`/`VACATAIRE`).
- [ ] **`GUEST_TEACHER` = attribut temporel sur `TEACHER`** (décision actée) : champs `access_start_date`/`access_end_date` sur le compte, vérifiés au login — un compte hors de cette fenêtre est inaccessible, sans créer de rôle RBAC distinct.
**Labels :** `personnel` `backend` `frontend`

### 🃏 [STAFF-V2-05] Tableau de bord personnel
**Priorité :** 🟡 Moyenne — **dépend de STAFF-V2-04** (ancienneté, taux de vacataires)
- [ ] `GET /auth/staff/dashboard/` : effectifs par rôle, ancienneté moyenne (basée sur `date_embauche`), taux de vacataires.
- [ ] Frontend : section dédiée sur `/app/staff`.
**Labels :** `personnel` `backend` `frontend`

**Notes pour plus tard (V3) :** historique complet des affectations, `TeacherContext`/School Switcher multi-établissement, enseignant remplaçant avec transfert temporaire de droits.

---

## Infrastructure — MinIO pour tous les médias

### 🃏 [INFRA-V2-01] Wiring MinIO complet
**Priorité :** 🟠 Haute
- [ ] **État des lieux d'abord, ne pas supposer** : SETUP-04 (Épic 0) prévoyait MinIO, mais plusieurs tickets ultérieurs (reçus de paiement, bulletins, factures) ont utilisé `default_storage` sans confirmation explicite qu'il pointe vers MinIO en environnement réel — certains tests locaux l'ont même explicitement surchargé vers `FileSystemStorage`. Demander à l'agent de vérifier quel backend `DEFAULT_FILE_STORAGE` est réellement configuré en dev/staging/prod aujourd'hui, avant toute action.
- [ ] Configurer `django-storages` avec le backend S3-compatible pointant vers MinIO, pour tous les médias existants : reçus de paiement (Épic 7), bulletins PDF (Épic 6), factures PDF (Épic 7), logos d'établissement (Épic 2), photos élèves (Épic 4) si utilisées.
- [ ] Vérifier que les URLs générées (`receipt_pdf_url`, `pdf_url`, etc.) restent valides et accessibles après le changement de backend — tester un cycle complet écriture/lecture, pas seulement la configuration.
- [ ] Test explicite : uploader un fichier, vérifier qu'il est bien accessible via l'URL retournée.
**Labels :** `infra` `backend` `priorité-haute`

---

## Rappel des conventions de livraison (inchangées depuis le V1)

- Schéma et contrat d'API au champ/payload près — signaler toute incohérence ou ajout, ne jamais modifier silencieusement.
- Isolation multi-tenant stricte (`TenantScopedModel`), test 404 exact pour toute ressource d'un autre tenant.
- Tests écrits **avec** le code, **exécutés réellement** avant toute déclaration de ticket "terminé" — sortie de test montrée, pas affirmée.
- Un commit par ticket ; en-tête et tableau récapitulatif du backlog mis à jour dans le même commit que le dernier ticket de chaque épic.
- Toute logique dupliquée entre plusieurs points d'entrée (ex. résolution de l'année scolaire) doit être centralisée en un seul point — pas de réinvention locale à chaque endroit.
- Avant de cocher une case comme livrée, vérifier qu'elle ne référence que des entités qui existent réellement à ce stade.
