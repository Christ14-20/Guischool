# Eduguinée — Backlog V2 : Administration (Super Admin + École) & Chantiers Transversaux

> **Statut :** en cours — SCHOOLYEAR-V2-01 livré (2026-07-29), SCHOOLYEAR-V2-02 à cadrer.
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
- [ ] **Un seul point de résolution centralisé** : fonction `get_current_school_year(tenant)` unique (module `core` ou `pedagogy`), importée partout où l'année courante est nécessaire — **jamais** de logique de résolution dupliquée à plusieurs endroits (rappel direct des trois bugs de résolution d'année trouvés en Épic 7).
- [ ] **Endpoints à auditer et corriger un par un** (vérifier chacun, ne pas supposer) :
  - [ ] `POST /students/` (Épic 4) — `school_year_id` actuellement obligatoire.
  - [ ] `POST /pedagogy/classes/` (Épic 3) — `school_year` actuellement un champ du payload.
  - [ ] `POST /students/{id}/reinscription/` (Épic 4) — `school_year_id` obligatoire.
  - [ ] `POST /pedagogy/evaluations/` (Épic 6) — indirect via `period` ; le sélecteur de période côté frontend doit filtrer sur l'année courante par défaut.
  - [ ] `POST /finance/feecategories/` (Épic 7) — `school_year` actuellement un champ obligatoire du payload.
- [ ] **Cas limite à traiter explicitement** : aucune année n'a `is_current=True` au moment de l'appel → `422` avec message clair ("Aucune année scolaire courante n'est définie — contactez votre Directeur"), jamais un crash ou un comportement silencieux.
- [ ] **Documentation** : chaque endpoint dont le payload change (champ obligatoire → optionnel) doit être mis à jour dans le contrat d'API avec une note explicite de migration.
- [ ] Frontend : les formulaires concernés perdent leur sélecteur d'année scolaire par défaut (ou le masquent en mode "avancé", visible seulement pour `DIRECTOR`).
**Labels :** `schoolyear` `backend` `frontend` `priorité-critique` `refactor`

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
