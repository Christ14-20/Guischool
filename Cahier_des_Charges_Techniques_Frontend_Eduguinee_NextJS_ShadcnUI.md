# Cahier des Charges Techniques Frontend — Eduguinée 3.0

**Stack :** Next.js 15 (App Router) · shadcn/ui · TypeScript  
**Version du document :** 1.0  
**Basé sur :** Cahier des Charges Backend Eduguinée 3.0 (Django / DRF)

---

## Table des matières

1. [Architecture Générale](#1-architecture-générale)
2. [Stack Technique & Dépendances](#2-stack-technique--dépendances)
3. [Structure du Projet](#3-structure-du-projet)
4. [Authentification & Gestion de Session](#4-authentification--gestion-de-session)
5. [Gestion des Rôles & Permissions (RBAC)](#5-gestion-des-rôles--permissions-rbac)
6. [Modules Fonctionnels & Pages](#6-modules-fonctionnels--pages)
   - 6.1 [Super Administration](#61-super-administration)
   - 6.2 [Pédagogie](#62-pédagogie)
   - 6.3 [Gestion des Élèves & Notes](#63-gestion-des-élèves--notes)
   - 6.4 [Finance](#64-finance)
   - 6.5 [Monitoring & Support](#65-monitoring--support)
7. [Conventions UI/UX](#7-conventions-uiux)
8. [Gestion des Données & Appels API](#8-gestion-des-données--appels-api)
9. [Gestion des Erreurs & Feedback Utilisateur](#9-gestion-des-erreurs--feedback-utilisateur)
10. [Internationalisation](#10-internationalisation)
11. [Performance & Optimisations](#11-performance--optimisations)
12. [Sécurité Frontend](#12-sécurité-frontend)
13. [Tests](#13-tests)
14. [Exigences Non-Fonctionnelles](#14-exigences-non-fonctionnelles)
15. [Variables d'Environnement](#15-variables-denvironnement)
16. [Dépendances & Configuration](#16-dépendances--configuration)

---

## 1. Architecture Générale

### 1.1 Vue d'ensemble

Le frontend d'Eduguinée 3.0 est une **Single Page Application (SPA) rendue côté serveur**, construite avec **Next.js 15** et son App Router. Elle consomme exclusivement l'API RESTful du backend Django/DRF via HTTPS.

L'application est **multi-tenant** : chaque établissement scolaire (tenant) accède à une interface isolée. L'identification du tenant peut se faire via sous-domaine (`{slug}.eduguinee.gn`) ou via paramètre de session après connexion.

L'application comprend **deux espaces principaux** :

| Espace | Audience | Préfixe de route |
| :----- | :------- | :--------------- |
| **Super Admin** | Administrateurs de la plateforme Eduguinée | `/superadmin/...` |
| **Espace École** | Directeurs, Secrétaires, Enseignants, Parents | `/app/...` |

### 1.2 Modèle de rendu

| Type de page | Stratégie | Justification |
| :----------- | :-------- | :------------ |
| Pages d'authentification | Client Component | Pas de données sensibles initiales |
| Tableaux de bord | Server Component + fetch côté serveur | SEO, données fraîches |
| Listes paginées (élèves, paiements…) | Server Component + `searchParams` | URL persistable, crawlable |
| Formulaires (inscription, saisie notes) | Client Component | Interactions riches, validation temps réel |
| Données temps-réel (alertes, tickets) | Client Component + SWR/React Query | Polling ou WebSocket futur |

### 1.3 Communication avec le backend

- **Base URL** : `NEXT_PUBLIC_API_URL` (ex: `https://api.eduguinee.gn/api/v1`)
- **Format** : JSON pour toutes les requêtes/réponses
- **Authentification** : tokens JWT (access token 15 min, refresh token 7 jours)
- **Versionning API** : `/api/v1/` — prévu pour migration future vers `/api/v2/`

---

## 2. Stack Technique & Dépendances

### 2.1 Dépendances principales

```json
{
  "next": "^15.x",
  "react": "^19.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "@shadcn/ui": "latest",
  "lucide-react": "latest",
  "zod": "^3.x",
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "axios": "^1.x",
  "@tanstack/react-query": "^5.x",
  "next-auth": "^5.x (Auth.js v5)",
  "date-fns": "^3.x",
  "recharts": "^2.x",
  "react-pdf": "^7.x",
  "next-intl": "^3.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

### 2.2 Composants shadcn/ui utilisés

Les composants suivants seront installés via `npx shadcn-ui@latest add` :

`button` · `input` · `form` · `label` · `select` · `textarea` · `checkbox` · `radio-group` · `switch` · `badge` · `card` · `table` · `dialog` · `sheet` · `alert` · `alert-dialog` · `toast` (Sonner) · `tabs` · `dropdown-menu` · `popover` · `calendar` · `date-picker` · `command` · `pagination` · `skeleton` · `separator` · `avatar` · `progress` · `scroll-area` · `tooltip` · `breadcrumb` · `sidebar`

---

## 3. Structure du Projet

```
eduguinee-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (superadmin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── schools/
│   │   │   ├── page.tsx              # Liste des écoles
│   │   │   ├── [id]/page.tsx         # Détail d'une école
│   │   │   └── new/page.tsx          # Créer une école
│   │   ├── plans/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── users/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── pedagogy/
│   │   │   ├── school-years/page.tsx
│   │   │   ├── classes/page.tsx
│   │   │   ├── subjects/page.tsx
│   │   │   ├── timetable/page.tsx
│   │   │   └── attendance/page.tsx
│   │   ├── students/
│   │   │   ├── page.tsx              # Liste des élèves
│   │   │   ├── new/page.tsx          # Inscription élève
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Fiche élève
│   │   │       ├── grades/page.tsx
│   │   │       └── history/page.tsx
│   │   ├── grades/
│   │   │   ├── page.tsx
│   │   │   └── bulk/page.tsx         # Saisie en masse
│   │   ├── year-end/
│   │   │   └── page.tsx              # Décisions de fin d'année
│   │   ├── finance/
│   │   │   ├── fees/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   └── invoices/page.tsx
│   │   ├── support/
│   │   │   ├── tickets/page.tsx
│   │   │   └── tickets/[id]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                          # Route handlers Next.js (proxy JWT, webhooks)
│   │   └── auth/[...nextauth]/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # Composants shadcn/ui générés
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── BreadcrumbNav.tsx
│   │   └── PageHeader.tsx
│   ├── shared/
│   │   ├── DataTable.tsx             # Table générique avec pagination/filtre
│   │   ├── ConfirmDialog.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── FileUploader.tsx
│   ├── students/
│   ├── grades/
│   ├── finance/
│   └── charts/
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Instance Axios configurée
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   ├── grades.ts
│   │   ├── finance.ts
│   │   └── ...
│   ├── utils.ts                      # cn(), formatDate(), formatCurrency()
│   ├── validators/                   # Schémas Zod
│   │   ├── student.schema.ts
│   │   ├── grade.schema.ts
│   │   └── payment.schema.ts
│   └── constants.ts
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts
│   ├── useStudents.ts
│   └── ...
├── store/                            # Zustand (état global léger)
│   └── authStore.ts
├── types/
│   ├── api.types.ts                  # Types alignés sur les modèles backend
│   ├── student.types.ts
│   └── ...
├── middleware.ts                     # Protection des routes
├── next.config.ts
└── tailwind.config.ts
```

---

## 4. Authentification & Gestion de Session

### 4.1 Stratégie

L'authentification utilise **Auth.js v5 (next-auth)** avec un provider `Credentials` personnalisé. Les tokens JWT backend sont stockés de manière sécurisée dans des cookies httpOnly côté serveur.

### 4.2 Flux de connexion

```
1. Utilisateur soumet le formulaire /login (email + password)
2. Auth.js appelle POST /auth/login/ → obtient { access_token, refresh_token }
3. Les tokens sont chiffrés et stockés dans un cookie httpOnly sécurisé
4. L'utilisateur est redirigé selon son rôle :
   - SUPER_ADMIN → /superadmin/dashboard
   - ADMIN_SCHOOL / SECRETAIRE → /app/dashboard
   - ENSEIGNANT → /app/pedagogy/classes
   - PARENT → /app/students (vue restreinte)
```

### 4.3 Rafraîchissement du token

- Un intercepteur Axios intercepte les réponses `401 Unauthorized`
- Il appelle automatiquement `POST /auth/refresh/` avec le refresh token
- Si le refresh échoue, l'utilisateur est redirigé vers `/login`
- Implémentation dans `lib/api/client.ts` via `axios.interceptors.response`

### 4.4 Protection des routes (middleware.ts)

```typescript
// middleware.ts
// Routes protégées par rôle via next-auth session
export const config = {
  matcher: [
    '/app/:path*',
    '/superadmin/:path*',
  ],
}
```

| Route | Rôles autorisés |
| :---- | :-------------- |
| `/superadmin/*` | `SUPER_ADMIN` uniquement |
| `/app/students/new` | `ADMIN_SCHOOL`, `SECRETAIRE` |
| `/app/grades/bulk` | `ADMIN_SCHOOL`, `SECRETAIRE` |
| `/app/year-end/*` | `ADMIN_SCHOOL` uniquement |
| `/app/finance/*` | `ADMIN_SCHOOL`, `SECRETAIRE` |
| `/app/settings` | `ADMIN_SCHOOL` uniquement |

### 4.5 Pages d'authentification

**`/login`**
- Formulaire : champ email + mot de passe
- Validation côté client avec Zod + react-hook-form
- Bouton "Mot de passe oublié" (redirection vers workflow de réinitialisation)
- Gestion des erreurs : `401` → "Identifiants incorrects", `403` → "Compte suspendu"
- Composants : `Card`, `Input`, `Button`, `Form` (shadcn/ui)

**`/register`** (accès limité — invitation uniquement ou Super Admin)
- Formulaire multi-étapes : infos compte → infos école → plan
- Validation Zod progressive par étape

---

## 5. Gestion des Rôles & Permissions (RBAC)

### 5.1 Rôles définis

| Rôle | Constante | Description |
| :--- | :-------- | :---------- |
| Super Administrateur | `SUPER_ADMIN` | Gestion globale de la plateforme |
| Directeur / Admin École | `ADMIN_SCHOOL` | Accès complet à son établissement |
| Secrétaire | `SECRETAIRE` | Gestion administrative sans validation finale |
| Enseignant | `ENSEIGNANT` | Saisie notes, présences, emploi du temps |
| Parent / Tuteur | `PARENT` | Consultation uniquement |

### 5.2 Hook usePermission

```typescript
// hooks/usePermission.ts
export function usePermission(permission: string): boolean
export function useRole(roles: Role[]): boolean

// Utilisation dans un composant
const canCreateStudent = usePermission('can_create_student')
const isAdmin = useRole(['ADMIN_SCHOOL', 'SUPER_ADMIN'])
```

### 5.3 Composant PermissionGate

```tsx
// Masque ou désactive un élément selon les permissions
<PermissionGate permission="can_delete_user" fallback={null}>
  <Button variant="destructive">Supprimer</Button>
</PermissionGate>
```

---

## 6. Modules Fonctionnels & Pages

### 6.1 Super Administration

#### Dashboard Super Admin (`/superadmin/dashboard`)

**Composants :**
- KPI Cards : nombre total d'écoles, écoles actives/suspendues/trial, MRR estimé
- Graphique évolution des inscriptions (Recharts — `LineChart`)
- Tableau des dernières écoles créées (`DataTable`)
- Alertes système actives (`Alert` + `Badge`)

**Données :** `GET /superadmin/schools/`, `GET /monitoring/systemalerts/`

---

#### Liste des Écoles (`/superadmin/schools`)

**Interface :**
- `DataTable` avec colonnes : Nom, Slug, Plan, Statut, Créée le, Actions
- Filtres : statut (Active/Suspended/Trial/Cancelled), plan, recherche texte
- Badge de statut coloré (`StatusBadge`) : vert (Active), rouge (Suspended), orange (Trial)
- Bouton "Nouvelle école" → `Sheet` latéral ou page `/superadmin/schools/new`
- Actions par ligne : Voir détail, Suspendre (`AlertDialog` de confirmation), Réactiver

**Données :** `GET /superadmin/schools/?status=&plan=&search=`

---

#### Détail d'une École (`/superadmin/schools/[id]`)

**Sections (Tabs) :**
1. **Informations générales** : nom, slug, code MINEDU, type, statut, dates
2. **Abonnement** : plan actuel, dates, historique paiements
3. **Statistiques** : nb élèves, nb staff, usage stockage (barre de progression)
4. **Actions** : Suspendre / Réactiver / Changer de plan

---

#### Gestion des Plans (`/superadmin/plans`)

**Interface :**
- Cards par plan (Starter / Pro / Enterprise) avec détails visuels
- Formulaire d'édition en `Dialog` : nom, nb max élèves/staff, modules activés (multi-select), stockage, tarifs
- Validation Zod avant soumission

---

### 6.2 Pédagogie

#### Années Scolaires (`/app/pedagogy/school-years`)

**Interface :**
- Liste des années scolaires avec statut (Préparation / Active / Clôturée)
- Badge "Année courante" sur l'année active
- Formulaire de création : libellé, dates début/fin, activation
- Alerte si aucune année active

---

#### Classes (`/app/pedagogy/classes`)

**Interface :**
- Vue en grille ou liste, filtrée par cycle (Primaire / Collège / Lycée)
- Card par classe : nom, niveau, capacité (nb élèves / max), enseignant principal
- `Sheet` latéral pour créer/éditer une classe
- Alerte capacité dépassée (`Badge` rouge si `nb_eleves > capacity`)

---

#### Emploi du Temps (`/app/pedagogy/timetable`)

**Interface :**
- Vue hebdomadaire en grille (Lundi → Samedi × créneaux horaires)
- Chaque créneau affiché : matière, enseignant, salle
- Couleur par matière (palette configurable)
- Sélecteur de classe en haut de page
- Bouton "Ajouter un créneau" → `Dialog` avec : jour, heure début/fin, matière, enseignant, salle

---

#### Présences (`/app/pedagogy/attendance`)

**Interface :**
- Sélecteur : classe + date + matière (optionnel)
- Liste des élèves de la classe avec statut de présence par ligne
- Saisie rapide : radio ou boutons inline (Présent / Absent / Retard / Exclu)
- Bouton "Enregistrer tout" → `POST /pedagogy/attendances/` bulk
- Statistiques d'assiduité : graphique circulaire par statut (Recharts `PieChart`)

---

### 6.3 Gestion des Élèves & Notes

#### Liste des Élèves (`/app/students`)

**Interface :**
- `DataTable` paginée, triable, filtrable
- Colonnes : Matricule, Nom complet, Classe, Statut, Tuteur (téléphone), Actions
- Filtres : classe, statut (ACTIF/SUSPENDU/TRANSFERE…), année scolaire, recherche texte
- Export CSV (bouton avec icône `Download`)
- Badge de statut coloré
- Bouton "Inscrire un élève" (conditionnel selon permission `can_create_student`)

**Données :** `GET /students/?classe=&statut=&annee=&search=`

---

#### Formulaire d'Inscription d'un Élève (`/app/students/new`)

**Formulaire multi-sections (accordéon ou steps) :**

**Section 1 — Informations personnelles**
- Nom* (`Input`)
- Prénom(s)* (`Input`)
- Date de naissance* (`DatePicker`)
- Lieu de naissance (`Input`)
- Sexe* (`RadioGroup` : M / F)
- Photo (`FileUploader` — JPG/PNG, max 2 Mo, prévisualisation)

**Section 2 — Tuteur légal**
- Nom complet tuteur* (`Input`)
- Lien de parenté* (`Select` : Père / Mère / Tuteur / Autre)
- Téléphone* (`Input` avec format `+224 XXXXXXXXX`, validation regex)
- Email (`Input`, optionnel)

**Section 3 — Scolarité**
- Année scolaire* (`Select` — années en statut OUVERTE/EN_COURS uniquement)
- Classe* (`Select` — filtrée par année scolaire, capacité affichée)
- Type d'inscription* (`Select` : Nouvelle inscription / Réinscription / Transfert entrant)
- Observations (`Textarea`, optionnel)

**Validation (Zod) :**
- Téléphone : regex `^\+224[0-9]{9}$`
- Date de naissance : pas dans le futur
- Capacité classe : alerte si pleine (`AlertDialog`)
- Doublon : vérification nom + prénom + date de naissance avant soumission

**Données :** `POST /students/`

---

#### Fiche Élève (`/app/students/[id]`)

**Layout :**
- En-tête : avatar (photo), matricule, nom complet, classe, badge statut
- Tabs :
  1. **Profil** : infos personnelles + tuteur, bouton modifier
  2. **Notes** : tableau par matière/période, moyennes calculées
  3. **Présences** : calendrier ou liste, statistiques
  4. **Finances** : solde dû, liste des paiements
  5. **Historique** : timeline des événements (inscriptions, décisions, modifications)

**Actions selon rôle :**
- `ADMIN_SCHOOL` : Modifier, Archiver (`AlertDialog`), Réinscrire
- `SECRETAIRE` : Modifier profil et notes (brouillon)

---

#### Saisie des Notes (`/app/grades`)

**Interface principale :**
- Sélecteurs en cascade : Année scolaire → Classe → Matière → Période → Type de note
- Tableau de saisie : une ligne par élève
  - Colonnes : Matricule, Nom, Note (champ numérique), Barème (`Select` : /20, /40, /100), Note convertie (calculée automatiquement en temps réel), Commentaire
- Indicateur visuel : note rouge si < 10/20 après conversion
- Bouton "Enregistrer en brouillon" et "Enregistrer et valider" (ADMIN_SCHOOL uniquement)

**Saisie en masse (`/app/grades/bulk`) :**
- Import CSV : téléchargement du modèle, upload, aperçu avant validation
- `POST /pedagogy/grades/bulk/`

---

#### Classement & Moyennes

**Vue classement (`/app/students/[id]/grades`) :**
- Tableau : rang, matière, note convertie /20, coefficient, note pondérée
- Moyenne générale calculée dynamiquement affichée en bas
- Mention en `Badge` coloré (Excellent → vert foncé, Insuffisant → rouge)

**Vue classement de classe (`/app/pedagogy/classes/[id]/ranking`) :**
- Tableau trié par moyenne décroissante
- Exportable en PDF via `react-pdf`

---

#### Décisions de Fin d'Année (`/app/year-end`)

> Accessible uniquement quand l'année scolaire est en statut `CLOTURE_EN_COURS`

**Interface :**
- Sélecteur de classe
- Tableau : élève, moyenne archivée, mention, décision actuelle
- Par ligne : `Select` décision (ADMIS / REDOUBLE / ORIENTE / TRANSFERE / EXCLU) + classe destination
- Pré-remplissage automatique ADMIS si moyenne ≥ seuil de passage (configurable)
- Bouton "Traitement groupé" → `AlertDialog` → `POST /promotions/bulk/`
- Alerte si élève avec nb redoublements max atteint (`Badge` orange + tooltip)

---

### 6.4 Finance

#### Catégories de Frais (`/app/finance/fees`)

**Interface :**
- Liste des catégories : nom, type, montant, obligatoire (switch)
- Formulaire création/édition en `Sheet` : nom, type (`Select`), montant, échéancier (champs dynamiques), obligatoire (`Switch`)
- `POST/PUT /finance/feecategories/`

---

#### Enregistrement d'un Paiement (`/app/finance/payments`)

**Interface :**
- Formulaire en `Dialog` déclenché depuis la fiche élève ou la liste paiements
- Champs : élève (autocomplete `Command`), montant*, mode de paiement* (`Select` : Espèces / Orange Money / MTN Money / Wave / Virement), référence, date, commentaire
- Génération automatique du numéro de reçu (côté backend)
- Impression du reçu PDF après succès (`Button` "Imprimer le reçu")
- `POST /finance/payments/`

**Liste des paiements :**
- `DataTable` : date, élève, montant, méthode, statut, n° reçu, actions
- Filtres : méthode, statut, plage de dates
- Totaux en bas : montant total encaissé, nb paiements

---

#### Factures (`/app/finance/invoices`)

**Interface :**
- Liste des factures par élève/année scolaire
- Statut : Pending (orange) / Paid (vert) / Overdue (rouge)
- Bouton "Générer PDF" → `POST /finance/invoices/{id}/generate-pdf/` → téléchargement
- Vue détail : montant dû, payé, solde restant, historique des paiements associés

---

### 6.5 Monitoring & Support

#### Logs d'Audit (`/superadmin` ou `/app/settings` selon rôle)

**Interface :**
- `DataTable` avec colonnes : Date, Utilisateur, Action, Entité, Ancienne valeur, Nouvelle valeur, IP
- Filtres : utilisateur, type d'action, plage de dates
- Export CSV

---

#### Tickets de Support (`/app/support/tickets`)

**Liste :**
- Colonnes : N° ticket, Catégorie, Priorité (Badge coloré), Statut, Date, Assigné à
- Filtres : statut, catégorie, priorité

**Création (`Dialog` ou page dédiée) :**
- Catégorie (`Select`) : Technique / Facturation / Fonctionnel / Demande de fonctionnalité / Blocage / Paiement
- Priorité (`Select`) : Bloquant / Majeur / Mineur / Question
- Description (`Textarea`)
- Capture d'écran (upload optionnel)
- `POST /support/tickets/`

**Détail ticket (`/app/support/tickets/[id]`) :**
- Fil de discussion : messages chronologiques (`ScrollArea`)
- Formulaire réponse en bas
- Badge statut mis à jour en temps réel
- Actions admin : assigner, changer statut

---

## 7. Conventions UI/UX

### 7.1 Design System

- **Thème de base :** shadcn/ui avec palette personnalisée aux couleurs d'Eduguinée
- **Couleurs principales :**
  - Primaire : vert guinéen `#009A44` (couleur identitaire)
  - Secondaire : `#FCD116` (jaune)
  - Accent : `#CE1126` (rouge)
  - Fond : `#F8FAFC` (light) / `#0F172A` (dark)
- **Mode sombre :** supporté via `next-themes` + classe CSS `dark`
- **Typographie :** Inter (Google Fonts, chargée via `next/font`)

### 7.2 Layout global

**Sidebar gauche (composant `AppSidebar`) :**
- Logo Eduguinée + nom de l'école connectée
- Navigation principale avec icônes Lucide
- Section utilisateur en bas (avatar, nom, rôle, déconnexion)
- Collapsible sur mobile (`Sheet` latéral)

**Barre supérieure (`TopBar`) :**
- Fil d'Ariane (`BreadcrumbNav`)
- Sélecteur d'année scolaire active (global, persisté en contexte React)
- Cloche notifications (compteur de badges)
- Bouton mode sombre

### 7.3 Composants partagés

**`DataTable`** (générique, réutilisable)
- Colonnes configurables via prop `columns`
- Pagination côté serveur (curseur ou offset)
- Tri par colonne
- Barre de recherche intégrée
- Sélection multiple pour actions en masse
- Skeleton loader pendant le chargement
- État vide avec `EmptyState`

**`StatusBadge`**
- Props : `status` + `variant` (auto-détecté depuis la valeur)
- Couleurs : vert (actif/admis/payé), rouge (suspendu/exclu/en retard), orange (trial/brouillon), bleu (en cours)

**`ConfirmDialog`**
- Props : `title`, `description`, `onConfirm`, `variant` (default/destructive)
- Utilisé pour : suppressions, suspensions, archivages, actions irréversibles

**`PageHeader`**
- Props : `title`, `description`, `actions` (slot pour boutons)
- Affichage cohérent en haut de chaque page

### 7.4 Formulaires

- Tous les formulaires utilisent `react-hook-form` + résolveur `zod`
- Labels clairs au-dessus des champs
- Messages d'erreur inline sous chaque champ invalide (`FormMessage`)
- Indicateur de champ obligatoire (`*` rouge)
- Bouton submit désactivé si le formulaire est invalide ou en cours de soumission
- État de chargement : `Button` avec spinner Lucide (`Loader2`)

### 7.5 Notifications Toast

- Bibliothèque : **Sonner** (intégré shadcn/ui)
- Succès : vert, icône `CheckCircle`
- Erreur : rouge, icône `XCircle`, message d'erreur API affiché
- Info : bleu, icône `Info`
- Position : coin inférieur droit

### 7.6 Responsive Design

| Breakpoint | Comportement |
| :--------- | :----------- |
| Mobile (< 768px) | Sidebar masquée → bouton hamburger, tableaux scrollables horizontalement |
| Tablet (768–1024px) | Sidebar en mode icônes seulement |
| Desktop (> 1024px) | Sidebar complète développée |

---

## 8. Gestion des Données & Appels API

### 8.1 Client HTTP (Axios)

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Intercepteur requête : injection du token JWT
apiClient.interceptors.request.use(attachAccessToken)

// Intercepteur réponse : refresh automatique sur 401
apiClient.interceptors.response.use(null, handleUnauthorized)
```

### 8.2 React Query (TanStack Query v5)

- `QueryClient` configuré dans `app/layout.tsx` via `QueryClientProvider`
- Toutes les requêtes GET utilisent `useQuery` avec une `queryKey` normalisée
- Mutations via `useMutation` avec `onSuccess` → invalidation du cache concerné
- Stale time : 30 secondes par défaut, 0 pour données critiques (notes validées)

```typescript
// Exemple
const { data, isLoading } = useQuery({
  queryKey: ['students', { classe, statut, annee }],
  queryFn: () => fetchStudents({ classe, statut, annee }),
})
```

### 8.3 Pagination

- Paramètres : `?page=1&page_size=25` (offset) ou `?cursor=...`
- Composant `Pagination` shadcn/ui synchronisé avec `searchParams` Next.js
- URL persistée → navigation arrière fonctionnelle

### 8.4 Gestion des fichiers (Upload)

- Upload via URL pré-signée : le frontend demande d'abord l'URL au backend, puis envoie le fichier directement sur S3/MinIO
- Composant `FileUploader` avec :
  - Drag & drop
  - Prévisualisation pour les images
  - Barre de progression (`Progress`)
  - Validation de type et taille avant upload

---

## 9. Gestion des Erreurs & Feedback Utilisateur

### 9.1 Codes d'erreur API → messages utilisateur

| Code HTTP | Message affiché |
| :-------- | :-------------- |
| `400` | Messages de validation champ par champ (extraits de `errors`) |
| `401` | "Session expirée. Veuillez vous reconnecter." → redirect `/login` |
| `403` | "Vous n'avez pas les droits pour effectuer cette action." |
| `404` | Page 404 dédiée avec bouton "Retour au tableau de bord" |
| `500` | "Une erreur inattendue s'est produite. Notre équipe a été notifiée." |
| Réseau | "Vérifiez votre connexion internet et réessayez." |

### 9.2 États de chargement

- Skeletons sur les listes et tableaux (jamais de spinner de page entière)
- `Button` avec `Loader2` pendant les soumissions
- `Suspense` Next.js pour les Server Components lents

### 9.3 États vides

Chaque liste affiche un composant `EmptyState` avec :
- Icône Lucide thématique
- Titre "Aucun résultat"
- Description contextuelle
- CTA si l'utilisateur a les droits de création

---

## 10. Internationalisation

- Bibliothèque : **next-intl**
- Langues supportées : Français (`fr`, langue par défaut), Anglais (`en`) — extensible
- Fichiers de traduction : `messages/fr.json`, `messages/en.json`
- Sélecteur de langue dans la barre supérieure
- Les formats de date utilisent `date-fns` avec la locale correspondante
- Les montants sont formatés en Francs Guinéens (GNF) : `new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' })`

---

## 11. Performance & Optimisations

| Optimisation | Implémentation |
| :----------- | :------------- |
| Images | `next/image` avec lazy loading et tailles adaptatives |
| Fonts | `next/font` avec `display: swap` |
| Code splitting | Automatique par Next.js App Router |
| Prefetching | `Link prefetch` sur la navigation principale |
| Mise en cache | React Query stale-while-revalidate + cache Next.js |
| Bundle size | `next/dynamic` pour composants lourds (recharts, react-pdf) |
| Virtualisation | `@tanstack/react-virtual` pour les listes de > 500 éléments |
| Compression | Gzip/Brotli activé sur le serveur Next.js |

**Objectifs de performance (Core Web Vitals) :**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

---

## 12. Sécurité Frontend

| Risque | Mesure |
| :----- | :----- |
| XSS | Pas de `dangerouslySetInnerHTML` ; React échappe automatiquement ; CSP header via `next.config.ts` |
| CSRF | Tokens JWT en cookie httpOnly ; pas de cookie de session classique |
| Tokens exposés | Jamais dans `localStorage` ni `sessionStorage` ; stockés uniquement en cookie httpOnly via Auth.js |
| Permissions | Vérification côté serveur (middleware) ET côté client (`usePermission`) — le backend est l'autorité finale |
| Données sensibles | Pas de log console en production (`console.log` supprimé via build Next.js) |
| Dépendances | `npm audit` dans la CI/CD ; Dependabot activé |
| Environnement | Variables `NEXT_PUBLIC_*` uniquement pour les données non sensibles |

---

## 13. Tests

### 13.1 Tests unitaires & composants

- **Framework :** Vitest + React Testing Library
- Couverture minimale : 70% sur les composants partagés et les hooks
- Cas testés : rendu, états vides, états de chargement, gestion d'erreurs, permissions

### 13.2 Tests End-to-End

- **Framework :** Playwright
- Scénarios critiques à couvrir :
  - Connexion / déconnexion par rôle
  - Inscription d'un élève complet
  - Saisie et validation d'une note
  - Enregistrement d'un paiement
  - Création d'une école (Super Admin)

### 13.3 Tests d'accessibilité

- `@axe-core/react` intégré en développement
- Contraste minimum WCAG AA
- Navigation clavier complète sur les formulaires et tableaux

---

## 14. Exigences Non-Fonctionnelles

| Critère | Exigence |
| :------ | :------- |
| **Disponibilité** | L'interface doit être opérationnelle dès que l'API backend est disponible (SLA 99.9%) |
| **Compatibilité navigateurs** | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ (pas de support IE) |
| **Accessibilité** | WCAG 2.1 niveau AA minimum |
| **Sécurité** | Audit de sécurité avant mise en production ; pas de données sensibles en localStorage |
| **Responsive** | Interface fonctionnelle de 320px à 2560px |
| **Temps de chargement** | First Contentful Paint < 1.5s sur connexion 3G (contexte guinéen) |
| **Mode hors-ligne** | Affichage de l'état de connexion ; pas de Service Worker v1 (roadmap) |

---

## 15. Variables d'Environnement

```bash
# API
NEXT_PUBLIC_API_URL=https://api.eduguinee.gn/api/v1

# Auth.js
NEXTAUTH_URL=https://app.eduguinee.gn
NEXTAUTH_SECRET=<secret_aléatoire_fort>

# Fonctionnalités optionnelles
NEXT_PUBLIC_SENTRY_DSN=<sentry_dsn>
NEXT_PUBLIC_POSTHOG_KEY=<analytics_key>
```

---

## 16. Dépendances & Configuration

### 16.1 `package.json` (extrait)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  }
}
```

### 16.2 `next.config.ts`

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.minio.eduguinee.gn' },
      { protocol: 'https', hostname: 's3.amazonaws.com' },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}
```

### 16.3 `tailwind.config.ts`

```typescript
// Extension avec couleurs Eduguinée
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#009A44', ... },
      secondary: { DEFAULT: '#FCD116', ... },
      accent: { DEFAULT: '#CE1126', ... },
    },
    fontFamily: {
      sans: ['var(--font-inter)'],
    },
  },
}
```

---

## Références

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Auth.js (next-auth v5)](https://authjs.dev/)
- [TanStack Query v5](https://tanstack.com/query/v5)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Recharts](https://recharts.org/)
- [next-intl](https://next-intl-docs.vercel.app/)
- [Lucide Icons](https://lucide.dev/)
- [Cahier des Charges Backend Eduguinée 3.0](./Cahier_des_Charges_Techniques_Backend_Eduguinee_Django_DRF.md)
