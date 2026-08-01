# Eduguinée — Backlog V2 : Administration (Super Admin + École) & Chantiers Transversaux

> **Statut :** en cours — Chantier année scolaire terminé : SCHOOLYEAR-V2-01 livré (2026-07-29), SCHOOLYEAR-V2-02 livré (2026-07-30, sous-tickets A→F). Module A (Super Admin) terminé : SUPERADMIN-V2-01 livré (2026-07-30), SUPERADMIN-V2-02 livré (2026-07-31), SUPERADMIN-V2-03 livré (2026-07-31), SUPERADMIN-V2-03B (nettoyage résidus statut) livré (2026-07-31), SUPERADMIN-V2-05 (facturation SaaS) livré (2026-07-31), SUPERADMIN-V2-04 (gestion des impayés) livré (2026-08-01). Prochain : Module B (Personnel).
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

### 🃏 [SCHOOLYEAR-V2-02] Application automatique de l'année courante (refactor transversal) — ✅ Livré 2026-07-30
**Priorité :** 🔴 Bloquant, gros chantier — à découper en sous-tickets par module lors du cadrage
- [x] **Principe** : partout où `school_year`/`school_year_id` est un champ **obligatoire** saisi manuellement, il devient **optionnel**, avec comme valeur par défaut `SchoolYear.objects.get(tenant=tenant, is_current=True)`. Possibilité de le surcharger explicitement, réservée à `DIRECTOR`.
- [x] **Un seul point de résolution centralisé** : fonction `get_current_school_year(tenant)` unique (`apps/pedagogy/services/school_year_service.py`, à côté de `assert_school_year_open`), importée partout où l'année courante est nécessaire — **jamais** de logique de résolution dupliquée à plusieurs endroits (rappel direct des trois bugs de résolution d'année trouvés en Épic 7). *(Sous-ticket A — livré.)*
- [ ] **Endpoints à auditer et corriger un par un** (vérifier chacun, ne pas supposer) :
  - [x] `POST /students/` (Épic 4) — `school_year_id` actuellement obligatoire. *(Sous-ticket B — livré.)*
  - [x] `POST /pedagogy/classes/` (Épic 3) — `school_year` actuellement un champ du payload. *(Sous-ticket C — livré.)*
  - [x] `POST /students/{id}/reinscription/` (Épic 4) — `school_year_id` obligatoire. *(Sous-ticket B — livré.)*
  - [x] `POST /pedagogy/evaluations/` (Épic 6) — indirect via `period` ; le sélecteur de période côté frontend doit filtrer sur l'année courante par défaut. Audit confirmé : aucun champ `school_year` en payload, rien à rendre optionnel côté backend — traitement 100% frontend. *(Sous-ticket E — livré, aucun changement de contrat.)*
  - [x] `POST /finance/feecategories/` (Épic 7) — `school_year` actuellement un champ obligatoire du payload. *(Sous-ticket D — livré.)*
  - [x] `POST /pedagogy/year-end-decisions/` et `POST /pedagogy/promotions/bulk/` — ajoutés au périmètre (hors liste initiale, trouvés à l'audit, confirmés par le PO). *(Sous-ticket F — livré.)*
- [x] **Cas limite à traiter explicitement** : aucune année n'a `is_current=True` au moment de l'appel → `422` avec message clair ("Aucune année scolaire courante n'est définie — contactez votre Directeur"), jamais un crash ou un comportement silencieux. *(Sous-ticket A — livré, `SchoolYearError` réutilisée.)*
- [x] **Documentation** : chaque endpoint dont le payload change (champ obligatoire → optionnel) doit être mis à jour dans le contrat d'API avec une note explicite de migration.
- [x] Frontend : les formulaires concernés perdent leur sélecteur d'année scolaire par défaut (ou le masquent en mode "avancé", visible seulement pour `DIRECTOR`).
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
**Sous-ticket D — notes de livraison (2026-07-30) :**
- Même piège que le sous-ticket C : `FeeCategory` a une contrainte unique `(tenant, school_year, name)` — résolution défaut/override faite dans la vue avant construction du serializer, valeur injectée dans le payload.
- Verrouillage étendu à la modification (décision PO) : `perform_update` refuse (`403`) toute réattribution de `school_year` différente de la valeur existante sans `pedagogy:override:schoolyear` ; les autres champs restent librement modifiables.
- Incohérence contrat/code corrigée (même nature qu'en C) : `school_year_id` documenté → `school_year` réel.
- Frontend : `FeesClient.tsx` — sélecteur masqué pour non-`DIRECTOR` en création **et** en modification (`role` propagé depuis `finance/fees/page.tsx`) ; `formData.school_year` reste pré-rempli en édition même masqué, donc aucune régression sur la resoumission normale du formulaire.
**Sous-ticket E — notes de livraison (2026-07-30) :**
- Frontend seul, aucun changement backend/contrat (confirmé à l'audit : `POST /pedagogy/evaluations/` n'a pas de champ `school_year`, seulement `period_id`).
- `GradeEntryClient.tsx` : le sélecteur `syId` (filtre de classes/périodes, pas un champ d'écriture) est désormais pré-rempli sur l'année `is_current` au montage, via le même flux que la sélection manuelle (`handleFilterChange`) pour charger les périodes correspondantes. Reste librement changeable par tous les rôles — c'est un filtre de consultation, pas une écriture (distinction appliquée telle que validée par le PO).
**Sous-ticket F — notes de livraison (2026-07-30) :**
- Même piège UniqueTogetherValidator que C/D : `YearEndDecision` a une contrainte unique `(student, school_year)` — résolution faite dans la vue avant construction du serializer.
- `promotions_bulk` (`school_year_cible_id`) : même traitement défaut/override, **mais sans `assert_school_year_open`** — décision délibérée, documentée en commentaire et dans le contrat : cet endpoint ne fait aucune écriture rattachée à l'année (il modifie `Student.classe_actuelle`, non scopé à une année), et le flux normal l'appelle typiquement après clôture de l'année dont on traite les décisions.
- `PromotionsBulkSerializer.school_year_cible_id` : nom **non renommé** (décision actée), clarifié par docstring dans le code, note de contrat, et texte d'aide dans `YearEndDecisionsClient.tsx`.
- Corrections de contrat (2026-07-30) : chemins documentés `/year-end-decisions/` et `/promotions/bulk/` → réels `/pedagogy/year-end-decisions/` et `/pedagogy/promotions/bulk/` ; champs `student_id`/`school_year_id`/`classe_destination_id` du formulaire de décision individuelle → réels `student`/`school_year`/`classe_destination`.
- **Signalé sans être corrigé, hors périmètre SCHOOLYEAR-V2-02** — bug pré-existant découvert en marge, à traiter séparément :
  - `YearEndDecisionsClient.tsx`, formulaire "Nouvelle décision" : envoie `student_id`/`school_year_id`/`classe_destination_id` alors que l'API attend `student`/`school_year`/`classe_destination` (désaccord contrat/frontend pré-existant, pas introduit par ce ticket) ; le sélecteur "Élève" du même formulaire n'a par ailleurs aucune option (non alimenté).
- **Correctif appliqué (2026-07-30, sur demande PO au clos de ticket)** : `pedagogy/classes/` (sous-ticket C) — `level_id` n'était pas vérifié comme appartenant au tenant avant `Level.objects.get(...)`, provoquant un `500` (`Level.DoesNotExist` non catché) au lieu d'un `404` pour un `level_id` d'un autre tenant. `ClassSerializer.create()` fait désormais `Level.objects.filter(id=level_id, tenant=...).first()` et lève `NotFound` (404) explicitement. Test dédié `test_explicit_level_from_other_tenant_returns_404` ajouté et vérifié (562/562 tests backend passants).
- `finance/fees` : le champ `school_year` est verrouillé pour non-`DIRECTOR` en création **et** en modification (une réattribution a posteriori désynchroniserait des `Invoice` déjà calculées).
- Sélecteurs de **consultation** (ex. `syId` dans `GradeEntryClient`) : seule leur valeur par défaut est pré-remplie sur l'année courante, ils restent librement changeables pour tous les rôles (lecture ≠ écriture).

---

## Module A — Super Administration (plateforme)

**Déjà construit (Épic 2, V1) :** CRUD `Tenant`, `Plan` simplifié, `suspend`/`reactivate` (binaire), création automatique du compte Directeur, `AuditLog` de base.

### 🃏 [SUPERADMIN-V2-01] Distinction suspension soft/hard — ✅ Livré 2026-07-30
**Priorité :** 🔴 Bloquant
- [x] `Tenant.status` : ajoute `SUSPENDED_SOFT`/`SUSPENDED_HARD`, **remplaçant** `SUSPENDED` (5 valeurs au total) — énumération auto-cohérente plutôt qu'un champ `suspension_type` séparé (décision PO 2026-07-30, cf. notes de livraison). Migration de données : les tenants `SUSPENDED` existants (dev/staging) remappés vers `SUSPENDED_HARD`, réversible.
- [x] Soft : lecture seule (aucune création via API), consultation/export toujours accessibles. Connexion autorisée (nécessaire pour obtenir un token de lecture).
- [x] Hard : blocage total, y compris lecture, sauf pour `SUPER_ADMIN`. Connexion refusée (comportement inchangé de l'ancien `SUSPENDED`).
- [x] `TenantMiddleware` adapté pour appliquer la restriction soft (bloquer uniquement les méthodes d'écriture) — **et réellement actif désormais** (cf. correctif de sécurité ci-dessous).
- [x] Notification email/SMS au contact principal à chaque changement (soft, hard, réactivation) — le SMS est un ajout réel, le pattern existant (TENANT-04) n'envoyait jusqu'ici qu'un email.
**Labels :** `superadmin` `backend` `priorité-haute`
**Notes de livraison :**
- **Correctif de sécurité découvert et corrigé en marge du ticket** (même traitement que les failles de permission de SCHOOLYEAR-V2-01) : `TenantMiddleware` ne bloquait auparavant **aucune** requête — il posait `request._tenant_suspended = True` sans que rien ne lise ce flag ailleurs dans le code, malgré sa docstring qui affirmait le contraire. Un utilisateur déjà authentifié (JWT émis avant la suspension de son tenant) pouvait continuer à appeler n'importe quel endpoint, y compris en écriture. Le middleware applique désormais réellement la règle soft/hard à chaque requête. Test de régression dédié : `apps/superadmin/tests/test_tenant_middleware.py::TestSecurityRegression::test_hard_suspended_blocks_already_issued_token_regression` (connexion pendant que le tenant est `ACTIVE`, suspension après coup, réutilisation du même token → `403` désormais).
- Décisions PO actées sans ambiguïté à l'implémentation : restriction applicable à tous les rôles du tenant (`DIRECTOR` compris, `SUPER_ADMIN` seul exempté — naturellement, il n'a pas de `tenant_id` dans son JWT) ; aucune mise en pause des tâches Celery Beat existantes (réconciliation Orange Money, verrouillage présences, factures en retard) ni pour SOFT ni pour HARD — ce sont des processus système, pas des écritures initiées par l'école, décision documentée dans le code (`apps/finance/tasks.py`, `apps/pedagogy/tasks.py` non modifiés intentionnellement).
- `PATCH /superadmin/schools/{id}/suspend/` : nouveau champ **requis** `type` (`"SOFT"`/`"HARD"`) — conséquence mécanique du remplacement de `SUSPENDED`, `400` si absent/invalide. Contrat d'API mis à jour.
- SMS : nouvelle valeur `TENANT_STATUS` sur `SMSLog.TriggerType` (migration `communication` dédiée, ne touchant que ce champ — la drift de migration pré-existante et non liée sur ce même modèle, déjà signalée en SCHOOLYEAR-V2-01, reste hors périmètre) ; nouvelle fonction `apps.communication.services.notify_tenant_status()` sur le modèle de `notify_payment()`.

### 🃏 [SUPERADMIN-V2-02] Tableau de bord Super Admin — ✅ Livré 2026-07-31
**Priorité :** 🟠 Haute
- [x] `GET /superadmin/dashboard/` : nb écoles totales/actives/`TRIAL`/`SUSPENDED_SOFT`/`SUSPENDED_HARD`/`CANCELLED`, MRR estimé (Σ `Plan.price_monthly` des tenants `ACTIVE` uniquement).
- [x] Graphique d'évolution des créations d'écoles dans le temps — 12 mois glissants, zero-paddé, toutes créations comptées indépendamment du statut actuel (historique d'événements, pas un indicateur d'actifs nets).
- [x] Liste des dernières écoles créées — 5, réutilise `TenantListSerializer` (même forme que `GET /superadmin/schools/`, pas de format dupliqué).
- [x] Frontend : `/app/superadmin/dashboard` — reconstruit pour consommer le nouvel endpoint en un seul appel (au lieu de 4 appels vers `/superadmin/schools/` précédemment) ; graphique via `recharts` (nouvelle dépendance).
- [ ] Cartographie interactive — **hors périmètre**, reportée en V3.
- [ ] Churn — explicitement laissé de côté pour ce ticket (dette V3), signalé plutôt qu'ajouté silencieusement.
**Labels :** `superadmin` `backend` `frontend`
**Notes de livraison :**
- Pas de cache pour cette version (décision PO 2026-07-31) : agrégats `COUNT`/`SUM` bon marché à l'échelle actuelle. Documenté explicitement en commentaire dans `apps/superadmin/services/dashboard_service.py` (Redis déjà configuré au niveau infra, non utilisé ici — point d'extension prévu via `cache.get_or_set()` si le besoin apparaît, fonction d'agrégation volontairement isolée pour ça).
- **Résidu corrigé en marge** : le frontend affichait encore `STATUS_STYLES` limité à 3 statuts (`ACTIVE`/`SUSPENDED`/`TRIAL`) depuis `SUPERADMIN-V2-01` (qui a introduit `SUSPENDED_SOFT`/`SUSPENDED_HARD`) sans que l'UI soit mise à jour — corrigé ici pour les 5 vrais statuts. Le tableau "Dernières écoles créées" affichait aussi des tendances (`trend`) codées en dur et fictives (`"+1 ce mois"`, `"8 jours restants"`) — supprimées plutôt que conservées comme fausses données.
- **Signalé sans être corrigé (hors périmètre de ce ticket, page différente)** : `app/(superadmin)/superadmin/schools/page.tsx` a le même résidu (filtre/affichage encore sur `SUSPENDED` seul, pas `SUSPENDED_SOFT`/`HARD`) — à corriger séparément.
- Vérifié en conditions réelles (navigateur headless, serveurs dev existants, compte Super Admin temporaire créé puis supprimé après vérification) : agrégats corrects sur données réelles, tooltip du graphique fonctionnel. Au passage, le serveur frontend déjà en écoute sur le port 3000 s'est avéré être un build de production figé de deux jours (`next start`, antérieur à ce ticket et au précédent), déjà en erreur 500 — remplacé par un `next dev` à jour pour la vérification.

### 🃏 [SUPERADMIN-V2-03] Gestion des plans (UI complète) — ✅ Livré 2026-07-31
**Priorité :** 🟠 Haute
- [x] `POST /superadmin/plans/` (existait déjà), `PUT/PATCH /superadmin/plans/{id}/` (nouveau).
- [x] `PATCH /superadmin/schools/{id}/change-plan/` — changer le plan d'une école a posteriori, effet immédiat sur `max_students`/`max_staff` (`Plan` est une référence live, rien à propager).
- [x] Frontend : `/app/superadmin/plans` (liste, création, édition) — page construite de zéro, plus déclencheur « Changer de plan » sur `schools/[id]/page.tsx` (non explicitement listé dans le ticket mais nécessaire : sans ça le nouvel endpoint `change-plan` n'avait aucun point d'entrée UI).
- [x] Suppression de plan : **volontairement non construite** (décision PO 2026-07-30/31, cf. notes de livraison) — `Plan.is_active` (déjà existant, déjà appliqué à la création d'école) et `Tenant.plan` en `on_delete=PROTECT` couvrent le besoin sans endpoint dédié.
**Labels :** `superadmin` `backend` `frontend`
**Notes de livraison :**
- **Correctif de sécurité découvert et corrigé en marge du ticket** (même traitement que `TenantMiddleware` en SUPERADMIN-V2-01) : `TenantViewSet` héritait de `viewsets.ModelViewSet`, exposant silencieusement des routes génériques `PUT`/`PATCH`/`DELETE /superadmin/schools/{id}/` jamais documentées. Le `PATCH` générique retombait sur `TenantListSerializer`, dont le champ `status` est directement inscriptible — `PATCH {"status": "SUSPENDED_HARD"}` contournait tout le workflow `suspend`/`reactivate` (pas de raison, pas d'`AuditLog`, pas de notification). Le `DELETE` générique supprimait purement et simplement le `Tenant` (cascade). Passage à des mixins explicites (`List`/`Create`/`Retrieve` uniquement) : toute mutation passe désormais par une action nommée — même principe que STAFF-V2-02 (« actions sensibles = endpoint nommé »). Test de régression dédié demandé explicitement par le PO : `apps/superadmin/tests/test_tenant_generic_mutations_removed.py` (PATCH/PUT/DELETE génériques → `405` désormais, `200` avant).
- **4 décisions PO actées avant l'implémentation** (toutes confirmées sans changement à la conception initialement proposée) : (1) pas de `DELETE` sur `Plan` — `is_active` + `Tenant.plan` `PROTECT` suffisent ; (2) réduction de plan mettant un effectif en dépassement → bloqué en `422`, pas de mode « forcer quand même » ; comparaison `count > limite` (pile à la limite = valide, pas une violation), distincte de `tenant_limits.check_student_limit`/`check_staff_limit` qui répondent à une question différente (« puis-je ajouter un de plus ? », `>=`) ; (3) édition de `Plan` rétroactive par nature (référence live, pas un instantané) — étendue symétriquement : `PlanViewSet.update` vérifie **tous** les tenants déjà rattachés au plan avant de sauvegarder une réduction de limites, liste lesquels seraient affectés (`errors.affected_tenants`) plutôt qu'un refus générique ; (4) permissions `IsSuperAdmin` uniquement, pas de nouveau codename `module:action:scope` — vérifié empiriquement que 100% des endpoints existants d'`apps/superadmin` suivent déjà ce pattern (un seul rôle, `SUPER_ADMIN`, peut jamais atteindre ces endpoints ; la granularité `HasPermission(codename)` a sa place dans les apps tenant-scopées à rôles multiples, pas ici).
- Logique de comparaison centralisée dans `apps/superadmin/services/plan_service.py` (`exceeds_limits`/`find_tenants_exceeding_limits`), réutilisée à l'identique par `change_plan` (un seul tenant, plan cible) et `PlanViewSet.update` (potentiellement plusieurs tenants, limites réduites) — une seule implémentation plutôt que deux qui pourraient diverger.
- **2 bugs (non sécurité) trouvés en vérification navigateur et corrigés dans ce même ticket, après validation explicite du PO** (la carte concernée est celle que ce ticket modifie déjà, en y ajoutant le déclencheur « Changer de plan ») :
  1. `TenantPlanNestedSerializer` (utilisé par `GET /superadmin/schools/{id}/`) n'exposait que `id`/`name` du plan, alors que `schools/[id]/page.tsx` affiche déjà `price_monthly`/`max_students`/`max_staff` — résultat : « Tarif mensuel : NaN GNF », limites vides, barres « Utilisation actuelle » toujours `X / 0`, sur **toute** page de détail école, préexistant à ce ticket. Nouveau serializer dédié `TenantPlanDetailNestedSerializer` (`id, name, price_monthly, max_students, max_staff`), utilisé uniquement par `TenantDetailSerializer` — le `plan` imbriqué de la liste (`TenantListSerializer`) reste `{id, name}`, contrat inchangé pour cet endpoint. Test étendu : `test_superadmin_can_get_school_detail`.
  2. Le nouveau composant `ChangePlanButton` (frontend) rendait sa modale (`position: fixed`) à l'intérieur de la carte « Plan d'abonnement », qui a `backdrop-blur-md` — `backdrop-filter` établit un nouveau bloc de confinement pour les descendants `fixed` (même effet que `filter`/`transform`), donc la modale s'affichait confinée à la carte au lieu de couvrir l'écran. Corrigé via `createPortal(..., document.body)`. Repéré uniquement grâce à la vérification en navigateur réel (capture d'écran) — invisible en `tsc`/`eslint`/build.
- Vérifié en conditions réelles (navigateur headless, serveurs dev existants relancés après nettoyage de processus `next dev`/`next build` obsolètes qui bloquaient `.next`, compte Super Admin temporaire créé puis supprimé après vérification, plan de test créé puis supprimé) : création/édition/désactivation de plan, blocage `422` sur réduction de limites avec `affected_tenants`, changement de plan réussi et bloqué (`422`), aucune erreur console.

### 🃏 [SUPERADMIN-V2-03B] Nettoyage résidus statut à 3 valeurs — ✅ Livré 2026-07-31
**Priorité :** 🟠 Haute (dette laissée volontairement de côté en V2-01/V2-02/V2-03, signalée à chaque fois plutôt que corrigée par réflexe)
- [x] `schools/page.tsx` : filtre statut (`SUSPENDED` → `SUSPENDED_SOFT`/`SUSPENDED_HARD` séparés) + badge du tableau sur les 5 valeurs réelles (couleurs/libellés identiques au dashboard).
- [x] `SchoolActions.tsx` : type de la prop `status` élargi ; bascule Suspendre/Réactiver corrigée (ne matchait jamais `SUSPENDED_SOFT`/`HARD`, affichait toujours "Suspendre" même sur une école déjà suspendue) ; sélecteur SOFT/HARD ajouté au formulaire de suspension.
- [x] `schools/[id]/page.tsx`, carte « Utilisation actuelle » : **vérifiée, non concernée** — ne dépend que de `student_count`/`staff_count` vs les limites du plan, aucune référence au statut. Confirmé plutôt que corrigé par réflexe (demande explicite du PO).
**Labels :** `superadmin` `frontend` `dette-technique`
**Notes de livraison :**
- **Bug fonctionnel (pas seulement visuel) découvert dans `SchoolActions.tsx`** : le formulaire de suspension n'envoyait jamais le champ `type` (`SOFT`/`HARD`), obligatoire côté API depuis SUPERADMIN-V2-01 (`400` sinon). **Le bouton "Suspendre" était donc intégralement cassé depuis le 2026-07-30** — chaque tentative échouait silencieusement en 400. Corrigé avec le même changement qui ajoute le sélecteur SOFT/HARD.
- Même bug par conséquence sur la bascule Suspendre/Réactiver : comme `status === "SUSPENDED"` ne matchait jamais une vraie valeur, une école suspendue affichait toujours "Suspendre" (jamais "Réactiver"). Nouveau helper `isSuspendedStatus()`.
- **2 résidus supplémentaires trouvés sur `schools/[id]/page.tsx` en marge du périmètre nommé par le PO, mais même famille de bug, sur le fichier explicitement à relire — inclus après validation** : la pastille de statut en haut de page (même ternaire à 3 branches) et `isSuspended = school.status === "SUSPENDED"` (ne matchait jamais → le bandeau d'alerte "Établissement suspendu" avec la raison n'apparaissait **jamais**, même sur une école réellement suspendue).
- Nouveau module partagé `frontend/app/(superadmin)/superadmin/statusStyles.ts` (`STATUS_STYLES`, `isSuspendedStatus()`) — remplace la définition dupliquée en dur dans `dashboard/page.tsx` (SUPERADMIN-V2-02) et alimente désormais les 4 endroits concernés (dashboard, liste, détail, `SchoolActions`) depuis une seule source, pour éviter qu'un 4ᵉ résidu du même type ne réapparaisse.
- **Bug de positionnement trouvé et corrigé en marge** (même cause que `ChangePlanButton` en SUPERADMIN-V2-03) : le modal de suspension de `SchoolActions.tsx` (`position: fixed`) se retrouve, sur la page de détail uniquement, imbriqué dans la carte d'en-tête `backdrop-blur-md` — `backdrop-filter` crée un bloc de confinement pour les descendants `fixed`, donc le modal s'affichait confiné et ses boutons devenaient inatteignables au clic (repéré par un timeout Playwright réel, pas par `tsc`/`eslint`). Corrigé via `createPortal(..., document.body)`, identique au correctif précédent.
- Pas d'infra de test frontend dans ce projet (comme pour V2-02/03) : vérifié en navigateur réel (suspension SOFT puis HARD sur deux tenants distincts, bascule Suspendre/Réactiver, bandeau d'alerte, filtre par statut, badges sur liste/détail/dashboard) — aucune erreur console, comportement conforme sur les 5 valeurs. Compte Super Admin temporaire créé puis supprimé après vérification ; statuts des tenants de test restaurés à leur valeur d'origine.

### 🃏 [SUPERADMIN-V2-04] Gestion des impayés côté plateforme — ✅ Livré 2026-08-01
**Priorité :** 🟡 Moyenne — **dépend de SUPERADMIN-V2-01 et SUPERADMIN-V2-05**
- [x] Détection automatique (tâche Celery Beat quotidienne `flag_overdue_platform_invoices`, même pattern que `flag_overdue_invoices` Épic 7 — un niveau au-dessus : facture SaaS, pas facture élève).
- [x] Relances automatiques (email + SMS, réutilise l'infra Épic 8) — paliers `OVERDUE` (J+1) et `D7`, garde anti-doublon par facture (`PlatformInvoice.last_reminder_stage`).
- [x] Escalade progressive : `ACTIVE` → `SUSPENDED_SOFT` (J+15) → `SUSPENDED_HARD` (J+30), basée sur la facture impayée la plus ancienne du tenant, jamais de downgrade si le tenant est déjà à un palier plus sévère pour une autre raison.
**Labels :** `superadmin` `backend` `priorité-moyenne`
**Notes de livraison :**
- **Refactor demandé explicitement par le PO** : la logique de transition de statut (auparavant dupliquée dans `TenantViewSet.suspend`/`reactivate`, SUPERADMIN-V2-01/05) est désormais centralisée dans `apps/superadmin/services/tenant_status_service.transition_tenant_status()` — status, `settings.suspend_reason`, `billing_cycle_start`, notification, `AuditLog` — réutilisée par les deux actions manuelles **et** par l'escalade automatique, pas une troisième implémentation. Comportement HTTP inchangé (les 139 tests `apps/superadmin`+`apps/communication` existants passent sans modification après refactor).
- **Comportement nouveau introduit par la centralisation, appliqué uniformément** (pas seulement à l'escalade automatique) : `transition_tenant_status` est no-op si le tenant est déjà dans le statut cible (aucune mutation, aucune notification, aucun `AuditLog`) — décision PO explicite pour ne jamais écraser un `suspend_reason` existant. Un second appel manuel « suspendre en HARD » sur un tenant déjà HARD n'a donc plus d'effet ni de notification redondante ; aucun test existant ne dépendait de l'ancien comportement.
- **6 décisions PO actées avant codage** : (1) `flag_overdue_platform_invoices`, tâche Beat quotidienne distincte de `generate_platform_invoices` ; (2) palier déterminé par la facture impayée **la plus ancienne** du tenant (pas le nombre de factures) ; (3) seuils assumés (J+7/J+15/J+30), isolés dans `platform_invoice_service.REMINDER_MILESTONES`, même traitement que `PAYMENT_TERM_DAYS` (V2-05) ; (4) relance par palier avec garde anti-doublon (`PlatformInvoice.last_reminder_stage`, vit sur la facture, pas le tenant — confirmé par le PO : payer l'arriéré le plus ancien fait repartir l'horloge sur la facture suivante) ; (5) pas de réactivation automatique au paiement, `mark-paid` et `reactivate` restent deux actions manuelles distinctes ; (6) extraction de `transition_tenant_status()` en service partagé.
- **Point signalé par le PO avant codage, tranché avant d'écrire le code** : un tenant déjà `SUSPENDED_HARD` pour une raison sans lien avec un impayé (ex. CGU) ne doit jamais être rétrogradé à `SUSPENDED_SOFT` par l'escalade automatique, ni voir son `suspend_reason` existant écrasé — implémenté via une comparaison de sévérité (`STATUS_SEVERITY`) avant tout appel à `transition_tenant_status`, avec test de régression dédié (`test_no_downgrade_when_already_more_severe_for_unrelated_reason`), **vérifié en désactivant temporairement la garde** pour confirmer que le test échoue bien sans elle.
- **2 décisions d'implémentation mineures, présentées et confirmées avant codage** : (a) à J+15/J+30, la notification de changement de statut déjà envoyée par `transition_tenant_status` fait office de relance — pas de message distinct le même jour pour le même événement (seuls J+1/J+7, qui ne changent pas le statut, ont leur propre message via `send_overdue_invoice_reminder`) ; (b) `PlatformInvoice.last_reminder_stage` vit sur la facture, pas sur le tenant — payer la facture la plus ancienne fait repartir l'horloge d'escalade sur la nouvelle plus ancienne facture impayée, avec son propre `due_date`.
- Nouveau `SMSLog.TriggerType.INVOICE_REMINDER` — valeur choisie plus courte que le nom initialement envisagé (`PLATFORM_INVOICE_REMINDER`) pour tenir dans `max_length=20` sans élargir la colonne. Migration ne touchant que ce champ, même précédent que `TENANT_STATUS` (SUPERADMIN-V2-01) — la drift de migration pré-existante sur ce modèle (déjà signalée à deux reprises) reste hors périmètre.
- **Anomalie environnementale trouvée en marge, non liée à ce ticket, non corrigée** : `apps/finance/tests/test_invoice.py::TestSyncInvoiceSchoolYearResolution` (2 tests) échoue déjà sur l'état `main` avant tout changement de ce ticket (vérifié en isolant les changements via `git stash` sur une base de données de test propre) — semble sensible à la date du jour (résolution d'année scolaire courante). Aucun fichier de `apps/finance` n'a été touché par ce ticket ; signalé plutôt que corrigé, hors périmètre d'un ticket Super Admin.
- Vérifié en désactivant temporairement la garde anti-downgrade pour confirmer qu'elle est bien testée (pas un test qui passerait de toute façon). Suite complète du projet : 655 tests passants (+23 nouveaux pour ce ticket), seuls les 2 tests `finance` pré-existants et sans lien ci-dessus échouent (confirmé identique sur `main` avant ce ticket).
- **Relecture PO post-livraison, corrigée dans ce même ticket** : le message de suspension automatique à D15/D30 réutilisait le corps générique de `send_tenant_status_notification`/`notify_tenant_status` (déjà utilisé pour une suspension manuelle), sans jamais mentionner le motif impayé. `transition_tenant_status` propage désormais `reason`/`action` jusqu'à la notification (email + SMS) ; quand `action == "tenant:auto-suspend-overdue"`, le sujet et le corps sont entièrement distincts (motif, numéro de facture, montant cités explicitement) — une suspension manuelle continue d'utiliser le message générique inchangé (non-régression testée explicitement). Garde vérifiée en la désactivant temporairement pour confirmer que le test dédié échoue bien sans elle.

### 🃏 [SUPERADMIN-V2-05] Facturation SaaS écoles → plateforme — ✅ Livré 2026-07-31
**Priorité :** 🟡 Moyenne
- [x] Nouveau modèle **`PlatformInvoice`** — bien distinct de `apps.finance.Invoice` (celui-ci facture les parents ; `PlatformInvoice` facture l'établissement pour son abonnement).
- [x] Génération automatique à chaque échéance d'abonnement (tâche Celery Beat quotidienne `generate_platform_invoices`, basé sur `Plan.price_monthly`, snapshot figé à l'émission).
- [x] `GET /superadmin/schools/{id}/invoices/` (paginé).
- [x] `PATCH /superadmin/schools/{id}/invoices/{invoice_id}/mark-paid/` — ajouté explicitement au périmètre (décision PO 2026-07-31) : sans lui, SUPERADMIN-V2-04 n'aurait aucun moyen de distinguer une facture payée d'une impayée.
- [x] Frontend : carte « Facturation » sur `schools/[id]/page.tsx` (liste, lecture seule + bouton « Marquer payée »).
**Labels :** `superadmin` `backend` `frontend`
**Notes de livraison :**
- **Nommage des champs** : incohérence relevée avant codage — le cadrage initial utilisait des noms français (`montant`, `periode_debut/fin`, `statut`, `numero`) ; alignés sur la convention 100% anglaise déjà en place partout ailleurs (`amount`, `period_start`/`period_end`, `status`, `invoice_number`), le français restant réservé aux labels/choices.
- **Numérotation** : séquence **globale** par année (`PINV-{année}-{seq:06d}`), pas par tenant — décision PO après comparaison explicite avec `apps.finance.ReceiptSequence` (scopée par tenant parce que chaque école est sa propre entité émettrice de reçus ; ici Eduguinée est l'émetteur unique facturant plusieurs écoles, ce qui correspond à une séquence continue par émetteur). Même verrouillage (`select_for_update()` + transaction atomique) que `generate_receipt_for_payment`.
- **Ancre de facturation** : `dateutil.relativedelta` pour gérer les mois de longueur variable (aucune nouvelle dépendance — déjà présente en transitif). Point clarifié avec le PO en cours de cadrage : le premier cycle de facturation démarre le jour où le tenant est vu pour la première fois en statut éligible (`ACTIVE`/`SUSPENDED_SOFT`/`SUSPENDED_HARD`), **pas** `Tenant.created_at` littéralement — un tenant resté plusieurs mois en `TRIAL` avant de passer `ACTIVE` n'est jamais facturé rétroactivement pour ses mois d'essai. Chaque facture suivante repart de `period_end` de la précédente (pas de rattrapage multi-mois en une seule exécution si la tâche a manqué plusieurs jours — remise à niveau progressive, un cycle par exécution).
- **Délai de paiement** (`due_date`) : 15 jours après émission — valeur assumée en l'absence de chiffre contractuel communiqué, isolée dans une seule constante (`PAYMENT_TERM_DAYS`, `platform_invoice_service.py`) pour rester facilement ajustable.
- **Isolation cross-tenant sur `mark-paid`** : point de sécurité soulevé explicitement par le PO avant codage (`PlatformInvoice` n'étant pas `TenantScopedModel`, rien n'empêche par construction qu'un `invoice_id` valide mais rattaché à un autre tenant que `{id}` dans l'URL soit accepté) — filtrage explicite `tenant_id={id}` implémenté dès la première version, avec test de régression dédié (`test_mark_invoice_paid_cross_tenant_returns_404`), pas une correction après coup.
- **Frontière de périmètre avec SUPERADMIN-V2-04, actée explicitement** : `OVERDUE` existe dans l'enum `PlatformInvoice.Status` mais **aucune tâche de ce ticket n'y assigne jamais une facture** — la transition `PENDING` → `OVERDUE` est entièrement du ressort de SUPERADMIN-V2-04, pas encore implémenté. À ne pas considérer comme « fait » par erreur en abordant 04.
- Routage `GET/PATCH .../invoices/{invoice_id}/mark-paid/` via deux `@action` sur `TenantViewSet` (dont une avec `url_path` regex capturant `invoice_id`) plutôt qu'un routeur imbriqué — pas de dépendance `drf-nested-routers` ajoutée, cohérent avec `change_plan` (SUPERADMIN-V2-03).
- Doc API et récapitulatif §10 mis à jour — au passage, corrigé un retard déjà présent sur ce tableau récapitulatif (`change-plan` et `PUT/PATCH /superadmin/plans/{id}/` de SUPERADMIN-V2-03 n'y avaient jamais été ajoutés).
- **Trou fonctionnel trouvé par le PO après relecture, corrigé dans ce même ticket** : `get_next_billing_date` traitait le cas TRIAL → ACTIVE (décision PO ci-dessus) mais pas le cas symétrique ACTIVE → CANCELLED → réactivé des mois plus tard — la fonction repartait alors de l'ancien `period_end` d'une facture antérieure au passage `CANCELLED`, facturant rétroactivement la période où le tenant ne payait rien et n'utilisait pas le service (et comme la génération ne produit qu'un cycle par exécution, les runs suivants auraient continué à produire des factures rétroactives une par une jusqu'à rattraper la date du jour). Corrigé via un nouveau champ interne `Tenant.billing_cycle_start` (non exposé par les serializers), repositionné à aujourd'hui par `TenantViewSet.suspend`/`reactivate` **uniquement** lors d'une rentrée en éligibilité (ancien statut `TRIAL` ou `CANCELLED`) — jamais lors d'une transition entre deux statuts déjà éligibles (`SUSPENDED_HARD` → `ACTIVE` par exemple, testé explicitement pour éviter une régression inverse). Correctif validé en le désactivant temporairement : les deux nouveaux tests de régression (`test_no_retroactive_billing_after_cancellation_and_reactivation`, `test_full_flow_cancelled_reactivation_generates_no_retroactive_invoice`) échouent bien sans le correctif, confirmant qu'ils testent réellement le bug et non un simple happy path.
- Vérifié en conditions réelles (navigateur headless, compte Super Admin temporaire créé puis supprimé, factures de test générées via le service puis supprimées après vérification) : génération, listing, marquage payé, aucune erreur console. 634 tests backend passants (+6 sur la relecture du PO, +24 au total pour ce ticket), aucune régression.

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
