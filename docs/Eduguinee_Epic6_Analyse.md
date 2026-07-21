# Épic 6 — Notes, Évaluations, Bulletins — Note d'analyse (à valider)

**Statut :** Étape 1 (analyse de périmètre) — soumis pour validation avant tout code.
**Sources croisées :** Schéma §3.4/§3.6, Contrat d'API §6/§8/§10, Backlog GRADE-MVP-01..05, CDC §14 (+ §749, glossaire §1479).

---

## 1. Périmètre et découpage des tickets

| Ticket | Contenu réel (backlog) | Priorité |
|---|---|---|
| **GRADE-MVP-01** | Modèles `Evaluation` + `Grade` seuls (conversion auto, rejet hors [0,20]) | 🔴 Bloquant |
| **GRADE-MVP-02** | `POST evaluations`, `POST grades/bulk`, `PATCH lock`, `POST valider`, `PATCH modifier-apres-validation` | 🔴 Bloquant |
| **GRADE-MVP-03** | `GET moyenne`, `GET classement`, bulletin PDF (Celery), `GET bulletin` | 🔴 Bloquant |
| **GRADE-MVP-04** | `YearEndDecision` + `POST year-end-decisions` + `POST promotions/bulk` | 🟡 Moyenne |
| **GRADE-MVP-05** | Frontend saisie/consultation notes + bulletin | 🟠 Haute |

Hors périmètre : Finance (Épic 7), Présences (Épic 5, clos), examens officiels (§15, hors MVP).

---

## 2. Corrections vs backlog — le **schéma §3.4/§3.6 fait foi**

Le backlog emploie des noms de champs différents du schéma. On code le schéma :

### `Evaluation` (§3.4)
`class_obj, subject, period, teacher, type (CC/DS), title, max_score, coefficient, date, is_locked, is_published`
- ❌ Pas de `school_year` (dérivé via `period → school_year`).
- Le créateur est **`teacher`** (pas `created_by`).
- Présence de **`coefficient`** (par évaluation) ET de **`is_published`**.

### `Grade` (§3.4)
`student, evaluation, score, is_absent, note_convertie, comment, created_by, is_validated, validated_by, validated_at`
- Backlog dit `note_sur`/`valide` → en réalité : diviseur = **`Evaluation.max_score`**, booléen = **`is_validated`**.
- Conversion `note_convertie = (score / max_score) × 20` dans `Grade.save()`.
- Contraintes : `unique(student, evaluation)` + `CheckConstraint note_convertie ∈ [0,20]` + index `(student, evaluation)`.

### `YearEndDecision` (§3.6)
`student, school_year, classe_origine, classe_destination, decision (ADMIS/REDOUBLE/EXCLU), moyenne_annuelle (snapshot immuable), prise_par, date_decision`
- ❌ Pas les noms FR abrégés `eleve`/`annee_scolaire` du backlog.

---

## 3. Règles de permission (contrat §6 + CDC §14.2)

- `notes:create:evaluation` → **TEACHER (scopé à ses matières)**, DIRECTOR, « SECRETAIRE » (= rôle réel **STUDENT_STUDIES**).
- `notes:validate` → **DIRECTOR uniquement** (⚠️ ne PAS élargir à STUDENT_STUDIES, contrairement à `attendance:justify` de l'Épic 5).
- `modifier-apres-validation` → **DIRECTOR uniquement**, justification obligatoire + entrée `AuditLog`.
- `notes:read` → lecture moyennes/classement/bulletin.
- **Contrôle objet TEACHER** : vérifier que `ClassSubject(class_obj, subject).teacher == user` (le champ existe déjà). Test dédié : un TEACHER ne peut pas créer d'évaluation sur une matière qu'il n'enseigne pas.
- Rôles réels du projet : `SUPER_ADMIN, DIRECTOR, STUDENT_STUDIES, TEACHER, PARENT`.

---

## 4. Constats techniques (code existant vérifié)

- `ClassSubject.teacher` existe → contrôle « TEACHER sur ses propres matières » faisable.
- **`/tasks/{task_id}/status/`** (contrat §10, ligne « Commun ») **n'existe pas encore** → à créer au ticket 03 (1er consommateur = bulletin).
- **Aucune librairie PDF installée** (ni WeasyPrint, ni ReportLab) → à ajouter au ticket 03.
- `AuditLog` (Épic 1) dispo via `apps/monitoring/services.py` → réutilisé pour `modifier-apres-validation`.
- Convention Celery async déjà en place (`shared_task` ; contrat §8 : `202 Accepted` + polling `/tasks/{id}/status/`).

---

## 5. Questions posées + décisions retenues (à valider)

| # | Question | Décision retenue | Fondement |
|---|---|---|---|
| **1** | `PATCH lock/` quand des élèves n'ont pas de note (contrat §6 : « à confirmer en équipe ») | **Hard-block 422** : refus tant que toutes les notes ne sont pas saisies | Aligné sur le verrou strict ATT-01 (Épic 5) |
| **2** | Quel coefficient pour la moyenne ? (`Evaluation.coefficient` ET `ClassSubject.coefficient` coexistent) | **Formule à deux niveaux** (voir §6) — les deux coefficients sont utilisés, aucun n'est mort | **CDC §749 + glossaire §1479** |
| **3** | `Evaluation.is_published` piloté par aucun endpoint du contrat | **Auto → True** quand tous les `Grade` de l'évaluation sont `is_validated=True` | Comportement ajouté au contrat (documenté au ticket 02) |
| **4** | Librairie PDF bulletin | **WeasyPrint** (HTML → PDF) | Conforme « template HTML → PDF » (backlog GRADE-MVP-03) |

---

## 6. Décision 2 — Formule de moyenne à deux niveaux (tranchée par le CDC)

**Fondement documentaire (pas une interprétation) :**
- **CDC §749** : « Moyenne par matière = `Σ(note_convertie × coefficient) / Σ(coefficients)` » → le coefficient *intra-matière* est celui de chaque évaluation = **`Evaluation.coefficient`**.
- **CDC glossaire §1479** : « Coef = Coefficient (**pondération d'une matière dans la moyenne générale**) » → le coefficient *inter-matières* = **`ClassSubject.coefficient`**.

**Niveau 1 — Moyenne par matière (période donnée) :**
```
moyenne_matière = Σ(note_convertie × Evaluation.coefficient) / Σ(Evaluation.coefficient)
```
calculée sur **toutes les évaluations notées** de cette matière dans la période.

**Niveau 2 — Moyenne générale :**
```
moyenne_générale = Σ(moyenne_matière × ClassSubject.coefficient) / Σ(ClassSubject.coefficient)
```
sur **toutes les matières ayant au moins une évaluation notée** dans la période (matières sans note exclues — §749 / backlog GRADE-MVP-03).

**Conséquences :**
- Les **deux** coefficients sont utilisés ; aucun champ mort.
- Le service de calcul est conçu à deux niveaux **dès GRADE-MVP-01** (modèles), même si le calcul lui-même n'arrive qu'en GRADE-MVP-03.
- **Action de documentation** (ticket 03) : expliciter cette formule à deux niveaux dans le contrat d'API `§GET /students/{id}/moyenne/`, qui ne montre aujourd'hui qu'un seul `coefficient` par matière dans sa réponse sans détailler le calcul intermédiaire.

---

## 7. Points d'attention / divergences — arbitrages validés (2026-07-20)

1. **Départage du classement** : suivre le backlog (V1 simplifié : moyenne générale → ordre alphabétique). La règle complète CDC §752 (moyenne générale → nb mentions Très Bien → nb mentions Bien → moyenne Français → moyenne Maths → ordre alphabétique) est documentée comme **dette V2 explicite** dans le backlog GRADE-MVP-03.

2. **Arrondi académique (CDC §751)** : **appliqué dès le MVP** (question d'équité : un arrondi peut faire basculer au-dessus/dessous du seuil de passage 10/20). Règle : arrondi au centième supérieur si le millième ≥ 5 (12,345 → 12,35).
   - **Précision technique critique (validée) :** n'arrondir **qu'à l'affichage final** (sérialisation JSON des valeurs `moyenne`), **jamais** en cours de calcul intermédiaire. La moyenne par matière est calculée en pleine précision décimale et réutilisée non arrondie au niveau 2 ; sinon erreurs d'arrondi accumulées et divergence de la moyenne générale.

3. **Types d'évaluation** : `CC`/`DS` uniquement (schéma fait foi) ; TP/Participation/Oral restent en V2.

4. **`GradeAuditLog` dédié (CDC §14.5)** vs `AuditLog` générique (Épic 1) : le MVP réutilise `AuditLog` générique pour `modifier-apres-validation` (backlog GRADE-MVP-02 : « log simple, pas de versioning complet en V1 »). Versioning complet = V2.

> **Rappel de process** (PO) : pour GRADE-MVP-03 (implémentation réelle du calcul), redonner la formule à deux niveaux **avec l'arrondi intégré** au PO avant de la coder — calcul le plus sensible du MVP (impact direct passage/redoublement).

---

## 8. Rappel des conventions de livraison

- **1 commit par ticket** ; **chaque** commit met à jour en-tête + tableau backlog.
- Tout endpoint / permission / comportement hors contrat → documenté **dans le contrat** (comme le PATCH générique ATT-01), pas seulement au backlog.
- Isolation multi-tenant stricte (`TenantScopedModel`) + test 404 pour ressource d'un autre tenant.
- Tests backend écrits avec le code (référence : 259 tests verts après GRADE-MVP-01).

---

## 9. Avancement

| Ticket | Statut | Commit |
|---|---|---|
| **GRADE-MVP-01** | ✅ **Livré** | `GRADE-MVP-01` — modèles `Evaluation`+`Grade` (schéma §3.4), migration `0015`, 12 tests modèle |
| **GRADE-MVP-02** | ✅ **Livré** | `GRADE-MVP-02` — endpoints saisie/validation, permissions, 21 tests endpoint |
| GRADE-MVP-03 | ⏳ En attente | — |
| GRADE-MVP-04 | ⏳ En attente | — |
| GRADE-MVP-05 | ⏳ En attente | — |
