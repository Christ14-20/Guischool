# 🗂️ Trello — Cartes de Développement Frontend Eduguinée 3.0

> **Stack :** Next.js 15 · shadcn/ui · TypeScript  
> **Organisation :** une liste Trello par module, une carte par tâche atomique  
> Chaque carte inclut : titre, description, checklist technique, labels suggérés.

---

## MODULE 0 — ⚙️ Setup & Infrastructure

---

### 🃏 [SETUP-01] Initialisation du projet Next.js 15

**Description :** Créer et configurer le projet de base avec toutes les dépendances définies dans le cahier des charges.

**Checklist :**
- [x] `npx create-next-app@latest` avec TypeScript, App Router, Tailwind CSS
- [x] Installer toutes les dépendances (`axios`, `zod`, `react-hook-form`, `@tanstack/react-query`, `next-auth`, `date-fns`, `recharts`, `react-pdf`, `next-intl`, `clsx`, `tailwind-merge`, `lucide-react`)
- [x] Configurer `next.config.ts` (remote images, headers sécurité : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
- [x] Configurer `tailwind.config.ts` avec les couleurs Eduguinée (`primary: #009A44`, `secondary: #FCD116`, `accent: #CE1126`)
- [x] Ajouter la police Inter via `next/font`
- [x] Configurer `tsconfig.json` avec les alias de chemins (`@/`)
- [x] Créer le fichier `.env.local` avec les variables (`NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`)

**Labels :** `setup` `priorité-haute`

---

### 🃏 [SETUP-02] Installation et configuration shadcn/ui

**Description :** Installer et initialiser shadcn/ui, puis ajouter tous les composants nécessaires au projet.

**Checklist :**
- [x] `npx shadcn-ui@latest init`
- [x] Ajouter les composants : `button`, `input`, `form`, `label`, `select`, `textarea`, `checkbox`, `radio-group`, `switch`
- [x] Ajouter : `badge`, `card`, `table`, `dialog`, `sheet`, `alert`, `alert-dialog`
- [x] Ajouter : `tabs`, `dropdown-menu`, `popover`, `calendar`, `command`, `pagination`
- [x] Ajouter : `skeleton`, `separator`, `avatar`, `progress`, `scroll-area`, `tooltip`
- [x] Ajouter : `breadcrumb`, `sidebar`, `sonner` (toast)
- [x] Vérifier le rendu de chaque composant dans une page de test

**Labels :** `setup` `ui`

---

### 🃏 [SETUP-03] Structure des dossiers et fichiers de base

**Description :** Mettre en place l'arborescence complète du projet telle que définie dans le cahier des charges.

**Checklist :**
- [x] Créer les dossiers `app/(auth)/`, `app/(superadmin)/`, `app/(app)/`
- [x] Créer les dossiers `components/ui/`, `components/layout/`, `components/shared/`
- [x] Créer les dossiers `lib/api/`, `lib/validators/`
- [x] Créer les dossiers `hooks/`, `store/`, `types/`
- [x] Créer les fichiers `lib/utils.ts` (fonctions `cn()`, `formatDate()`, `formatCurrency()`)
- [x] Créer `lib/constants.ts` (rôles, statuts, constantes métier)
- [x] Créer `types/api.types.ts`, `types/student.types.ts`
- [x] Créer `middleware.ts` (squelette vide avec matcher)

**Labels :** `setup` `architecture`

---

### 🃏 [SETUP-04] Configuration du client HTTP Axios

**Description :** Créer l'instance Axios centralisée avec les intercepteurs JWT.

**Checklist :**
- [x] Créer `lib/api/client.ts` avec instance Axios (`baseURL` = `NEXT_PUBLIC_API_URL`)
- [x] Intercepteur requête : injection du `Authorization: Bearer <access_token>`
- [x] Intercepteur réponse : gestion des erreurs `401` → appel `POST /auth/refresh/`
- [x] Si le refresh échoue → redirection vers `/login`
- [x] Gestion des erreurs réseau (pas de connexion)
- [x] Créer les fichiers `lib/api/auth.ts`, `lib/api/students.ts`, `lib/api/grades.ts`, `lib/api/finance.ts`

**Labels :** `setup` `api` `priorité-haute`

---

### 🃏 [SETUP-05] Configuration TanStack Query v5

**Description :** Configurer le QueryClient et le Provider au niveau de l'application.

**Checklist :**
- [x] Créer le `QueryClientProvider` dans `app/layout.tsx`
- [x] Configurer le `QueryClient` (stale time : 30s par défaut, 0 pour données critiques)
- [x] Créer un composant wrapper `Providers.tsx` (client component) pour les providers
- [x] Tester un premier `useQuery` basique

**Labels :** `setup` `api`

---

### 🃏 [SETUP-06] Configuration Auth.js v5 (next-auth)

**Description :** Mettre en place l'authentification JWT avec Auth.js et le provider Credentials.

**Checklist :**
- [x] Installer et configurer `next-auth` v5
- [x] Créer `app/api/auth/[...nextauth]/route.ts`
- [x] Configurer le provider `Credentials` : appel `POST /auth/login/` → stockage tokens
- [x] Chiffrement des tokens en cookie `httpOnly` sécurisé
- [x] Configurer les callbacks `jwt` et `session`
- [x] Créer `hooks/useAuth.ts`
- [x] Créer `store/authStore.ts` (Zustand)

**Labels :** `setup` `auth` `priorité-haute`

---

### 🃏 [SETUP-07] Configuration Internationalisation (next-intl)

**Description :** Mettre en place le système de traduction français/anglais.

**Checklist :**
- [x] Configurer `next-intl` dans `next.config.ts`
- [x] Créer `messages/fr.json` et `messages/en.json` (clés de base : navigation, erreurs, actions)
- [x] Créer le middleware next-intl
- [x] Configurer `date-fns` avec la locale `fr`
- [x] Configurer le formateur de devise GNF (`Intl.NumberFormat('fr-GN', ...)`)
- [x] Tester le changement de langue

**Labels :** `setup` `i18n`

---

### 🃏 [SETUP-08] Configuration mode sombre (next-themes)

**Description :** Implémenter le support du mode clair/sombre via next-themes et les variables CSS shadcn/ui.

**Checklist :**
- [x] Installer `next-themes`
- [x] Encapsuler l'app dans `ThemeProvider`
- [x] Créer le bouton de toggle mode sombre dans la `TopBar`
- [x] Vérifier que les couleurs primaires Eduguinée s'adaptent au dark mode
- [x] Tester sur Chrome et Safari

**Labels :** `setup` `ui`

---

## MODULE 1 — 🔐 Authentification & Permissions

---

### 🃏 [AUTH-01] Page de connexion `/login`

**Description :** Créer la page de connexion avec formulaire validé côté client.

**Checklist :**
- [x] Layout centré avec `Card` shadcn/ui
- [x] Champs : email (`Input`) + mot de passe (`Input type="password"`)
- [x] Schéma Zod : email valide, mot de passe requis
- [x] Intégration `react-hook-form` + résolveur Zod
- [x] Bouton submit avec `Loader2` pendant la soumission
- [x] Gestion erreur `401` → message "Identifiants incorrects"
- [x] Gestion erreur `403` → message "Compte suspendu"
- [x] Lien "Mot de passe oublié"
- [x] Redirection post-login selon le rôle (`SUPER_ADMIN` → `/superadmin/dashboard`, autres → `/app/dashboard`)
- [x] Logo Eduguinée en haut du formulaire

**Labels :** `auth` `priorité-haute`

---

### 🃏 [AUTH-02] Page d'inscription `/register` (invitation uniquement)

**Description :** Créer le formulaire multi-étapes d'inscription pour les nouvelles écoles.

**Checklist :**
- [x] Étape 1 : infos compte (nom, email, mot de passe, confirmation)
- [x] Étape 2 : infos école (nom, code MINEDU, type, localisation)
- [x] Étape 3 : sélection du plan
- [x] Indicateur de progression (steps visuels en haut)
- [x] Validation Zod progressive par étape (ne valide que l'étape active)
- [x] Navigation "Précédent / Suivant"
- [x] Soumission finale → `POST /auth/register/`
- [x] Accès conditionné : vérifier le token d'invitation dans l'URL

**Labels :** `auth`

---

### 🃏 [AUTH-03] Middleware de protection des routes

**Description :** Configurer `middleware.ts` pour protéger les routes selon le rôle de l'utilisateur.

**Checklist :**
- [x] Matcher sur `/app/:path*` et `/superadmin/:path*`
- [x] Redirection vers `/login` si pas de session
- [x] Redirection `403` si le rôle ne correspond pas à la route
- [x] Protection spécifique : `/superadmin/*` → `SUPER_ADMIN` uniquement
- [x] `/app/students/new` → `ADMIN_SCHOOL`, `SECRETAIRE`
- [x] `/app/grades/bulk` → `ADMIN_SCHOOL`, `SECRETAIRE`
- [x] `/app/year-end/*` → `ADMIN_SCHOOL` uniquement
- [x] `/app/finance/*` → `ADMIN_SCHOOL`, `SECRETAIRE`
- [x] `/app/settings` → `ADMIN_SCHOOL` uniquement
- [x] Créer la page `/{locale}/403` (accès refusé)
- [ ] Tests : vérifier chaque route avec chaque rôle

**Labels :** `auth` `sécurité` `priorité-haute`

---

### 🃏 [AUTH-04] Hook `usePermission` et composant `PermissionGate`

**Description :** Créer les utilitaires de gestion des permissions côté client.

**Checklist :**
- [x] Créer `hooks/usePermission.ts` → `usePermission(permission: Permission): boolean`
- [x] Créer `hooks/useRole.ts` → `useRole(roles: Role[]): boolean`
- [x] Créer le composant `PermissionGate` avec prop `permission`, `fallback`
- [x] Documenter les permissions disponibles dans `lib/constants.ts` (`PERMISSIONS`, `ROLE_PERMISSIONS`)
- [ ] Tester avec chaque rôle : boutons affichés/cachés selon permission

**Labels :** `auth` `composants`

---

## MODULE 2 — 🏗️ Layout & Composants Partagés

---

### 🃏 [LAYOUT-01] Sidebar principale (`AppSidebar`)

**Description :** Créer la sidebar de navigation principale de l'espace école.

**Checklist :**
- [x] Logo Eduguinée + nom de l'école connectée en en-tête
- [x] Navigation avec icônes Lucide : Dashboard, Pédagogie, Élèves, Notes, Finance, Support, Paramètres
- [x] Section utilisateur en bas : avatar, nom, rôle, bouton Déconnexion
- [x] Liens actifs mis en surbrillance (`active` state)
- [x] Navigation filtrée selon le rôle (certaines entrées cachées)
- [x] Collapsible sur mobile → `Sheet` latéral avec bouton hamburger
- [x] Mode icônes uniquement sur tablette (768–1024px)
- [x] Mode développé sur desktop (> 1024px)

**Labels :** `layout` `ui` `priorité-haute`

---

### 🃏 [LAYOUT-02] Sidebar Super Admin

**Description :** Créer la sidebar dédiée à l'espace super administrateur.

**Checklist :**
- [x] Liens : Dashboard, Écoles, Plans, Utilisateurs, Logs, Alertes
- [x] Indicateur de rôle "Super Admin" visible
- [x] Même comportement responsive que la sidebar principale
- [x] Logo Eduguinée (version admin)

**Labels :** `layout` `superadmin`

---

### 🃏 [LAYOUT-03] Barre supérieure (`TopBar`)

**Description :** Créer la barre supérieure avec fil d'Ariane, sélecteur d'année et notifications.

**Checklist :**
- [x] Composant `BreadcrumbNav` (fil d'Ariane dynamique selon la route active)
- [x] Sélecteur d'année scolaire active (global, persisté en contexte React)
- [x] Cloche notifications avec compteur de badges
- [x] Bouton toggle mode sombre
- [x] Sélecteur de langue (FR / EN)
- [x] Responsive : hamburger sur mobile

**Labels :** `layout` `ui`

---

### 🃏 [LAYOUT-04] Composant `PageHeader`

**Description :** Créer le composant d'en-tête de page réutilisable sur toutes les pages.

**Checklist :**
- [x] Props : `title`, `description`, `actions` (slot pour boutons)
- [x] Affichage cohérent : titre H1, description en gris, boutons d'actions à droite
- [x] Responsive : boutons passent sous le titre sur mobile
- [ ] Utilisation sur toutes les pages applicatives

**Labels :** `layout` `composants`

---

### 🃏 [LAYOUT-05] Composant `DataTable` générique

**Description :** Créer le composant de tableau réutilisable et configurable.

**Checklist :**
- [x] Colonnes configurables via prop `columns`
- [x] Pagination côté serveur (offset ou cursor), synchronisée avec les `searchParams` Next.js
- [x] Tri par colonne (clic sur l'en-tête)
- [x] Barre de recherche intégrée avec debounce
- [x] Sélection multiple (checkboxes) pour actions en masse
- [x] Skeleton loader pendant le chargement (jamais de spinner plein écran)
- [x] État vide avec composant `EmptyState`
- [x] Scrollable horizontalement sur mobile

**Labels :** `composants` `priorité-haute`

---

### 🃏 [LAYOUT-06] Composant `StatusBadge`

**Description :** Créer le badge de statut coloré universel.

**Checklist :**
- [x] Props : `status` (string), `variant` (auto-détecté)
- [x] Couleur verte : `ACTIF`, `ADMIS`, `PAYE`, `Active`
- [x] Couleur rouge : `SUSPENDU`, `EXCLU`, `OVERDUE`, `Suspended`
- [x] Couleur orange : `TRIAL`, `BROUILLON`, `EN_RETARD`
- [x] Couleur bleue : `EN_COURS`, `Pending`
- [x] Gris : autres statuts inconnus
- [x] Export et usage dans `DataTable` et fiches

**Labels :** `composants`

---

### 🃏 [LAYOUT-07] Composant `ConfirmDialog`

**Description :** Créer le dialogue de confirmation réutilisable pour les actions destructives.

**Checklist :**
- [x] Props : `title`, `description`, `onConfirm`, `onCancel`, `variant` (`default` / `destructive`)
- [x] Bouton de déclenchement configurable (slot)
- [x] `AlertDialog` shadcn/ui en fond
- [x] Variant `destructive` → bouton "Confirmer" rouge
- [x] Loading state sur le bouton pendant l'action
- [x] Utilisation : suppressions, suspensions, archivages

**Labels :** `composants`

---

### 🃏 [LAYOUT-08] Composant `EmptyState`

**Description :** Créer le composant d'état vide affiché quand une liste est vide.

**Checklist :**
- [x] Props : `icon` (Lucide), `title`, `description`, `action` (CTA optionnel)
- [x] Centré verticalement dans le conteneur
- [x] CTA affiché uniquement si l'utilisateur a les droits de création (via `PermissionGate`)
- [x] Utilisation dans `DataTable` et toutes les listes

**Labels :** `composants`

---

### 🃏 [LAYOUT-09] Composant `FileUploader`

**Description :** Créer le composant d'upload de fichiers avec drag & drop.

**Checklist :**
- [x] Drag & drop zone
- [x] Prévisualisation pour les images
- [x] Barre de progression (`Progress` shadcn/ui)
- [x] Validation type MIME et taille avant upload
- [x] Upload via URL pré-signée (S3/MinIO) : appel backend → URL signée → upload direct
- [x] Gestion d'erreur (taille dépassée, type invalide, erreur réseau)
- [x] Props : `accept`, `maxSize`, `onUploadComplete`

**Labels :** `composants`

---

## MODULE 3 — 🛡️ Super Administration

---

### 🃏 [SUPERADMIN-01] Dashboard Super Admin (`/superadmin/dashboard`)

**Description :** Créer le tableau de bord global de la plateforme pour le Super Admin.

**Checklist :**
- [x] KPI Cards : nombre total d'écoles, écoles actives, suspendues, en trial
- [x] KPI Card : MRR estimé (formaté en GNF)
- [x] Graphique `LineChart` (Recharts) : évolution des inscriptions d'écoles dans le temps
- [x] Tableau des dernières écoles créées (`DataTable` simplifié, 5 dernières)
- [x] Section alertes système actives (`Alert` + `Badge`)
- [x] Données : `GET /superadmin/schools/`, `GET /monitoring/systemalerts/`
- [x] Server Component avec fetch côté serveur

**Labels :** `superadmin` `dashboard`

---

### 🃏 [SUPERADMIN-02] Liste des Écoles (`/superadmin/schools`)

**Description :** Créer la page de liste et gestion de toutes les écoles.

**Checklist :**
- [x] `DataTable` avec colonnes : Nom, Slug, Plan, Statut, Créée le, Actions
- [x] Filtre : statut (`Active/Suspended/Trial/Cancelled`)
- [x] Filtre : plan
- [x] Filtre : recherche texte (nom, slug)
- [x] `StatusBadge` sur la colonne Statut
- [x] Bouton "Nouvelle école" → Sheet latéral ou navigation vers `/superadmin/schools/new`
- [x] Actions par ligne : "Voir", "Suspendre" (`ConfirmDialog`), "Réactiver" (`ConfirmDialog`)
- [x] Données : `GET /superadmin/schools/?status=&plan=&search=`
- [x] Pagination et URL persistable

**Labels :** `superadmin`

---

### 🃏 [SUPERADMIN-03] Formulaire création d'école (`/superadmin/schools/new`)

**Description :** Créer le formulaire de création d'une nouvelle école sur la plateforme.

**Checklist :**
- [x] Champs : nom, slug (auto-généré depuis le nom, éditable), code MINEDU, type d'établissement, localisation
- [x] Sélection du plan (cards visuelles ou `Select`)
- [x] Validation Zod : unicité du slug (vérification API async), format code MINEDU
- [x] Bouton "Créer l'école" avec loading state
- [x] Toast succès → redirection vers le détail de l'école
- [x] `POST /superadmin/schools/`

**Labels :** `superadmin` `formulaire`

---

### 🃏 [SUPERADMIN-04] Détail d'une école (`/superadmin/schools/[id]`)

**Description :** Créer la page de détail d'une école avec ses informations, son abonnement et ses statistiques.

**Checklist :**
- [x] En-tête : nom de l'école, statut (`StatusBadge`), boutons d'actions
- [x] Tab 1 — **Informations générales** : nom, slug, code MINEDU, type, statut, dates de création
- [x] Tab 2 — **Abonnement** : plan actuel, dates début/fin, historique des paiements d'abonnement
- [x] Tab 3 — **Statistiques** : nb élèves, nb staff, usage stockage (barre `Progress`)
- [x] Tab 4 — **Actions** : Suspendre, Réactiver, Changer de plan → `ConfirmDialog` pour chaque action
- [x] Données : `GET /superadmin/schools/{id}/`

**Labels :** `superadmin`

---

### 🃏 [SUPERADMIN-05] Gestion des Plans (`/superadmin/plans`)

**Description :** Créer l'interface de gestion des plans d'abonnement.

**Checklist :**
- [x] Cards visuelles par plan : Starter, Pro, Enterprise
- [x] Chaque card : nom, max élèves, max staff, stockage, modules activés, tarifs
- [x] Bouton "Modifier" → `Dialog` avec formulaire d'édition
- [x] Formulaire : nom, nb max élèves, nb max staff, modules activés (multi-select `checkbox`), stockage (Go), tarif mensuel, tarif annuel
- [x] Validation Zod
- [x] `PUT /superadmin/plans/{id}/`
- [x] Toast succès/erreur

**Labels :** `superadmin`

---

### 🃏 [SUPERADMIN-06] Gestion des Utilisateurs Super Admin (`/superadmin/users`)

**Description :** Créer la page de gestion des utilisateurs de la plateforme (hors utilisateurs des écoles).

**Checklist :**
- [x] `DataTable` : nom, email, rôle, statut, dernière connexion
- [x] Filtre par rôle et statut
- [x] Actions : Activer / Désactiver, Réinitialiser mot de passe
- [x] `ConfirmDialog` pour les actions destructives

**Labels :** `superadmin`

---

## MODULE 4 — 📚 Pédagogie

---

### 🃏 [PEDAGOGY-01] Années Scolaires (`/app/pedagogy/school-years`)

**Description :** Créer la page de gestion des années scolaires.

**Checklist :**
- [x] Liste des années scolaires avec statut (`Préparation / Active / Clôturée`)
- [x] Badge "Année courante" sur l'année active (`Badge` vert)
- [x] Alerte si aucune année active (`Alert` orange)
- [x] Bouton "Créer une année scolaire" → `Dialog`
- [x] Formulaire création : libellé (ex: 2024-2025), date début, date fin, activation
- [x] Validation : une seule année peut être active à la fois
- [x] Actions par ligne : Activer, Clôturer (`ConfirmDialog`)
- [x] `GET/POST /pedagogy/school-years/`

**Labels :** `pédagogie`

---

### 🃏 [PEDAGOGY-02] Gestion des Classes (`/app/pedagogy/classes`)

**Description :** Créer la page de gestion des classes de l'établissement.

**Checklist :**
- [x] Toggle vue : grille ou liste
- [x] Filtre par cycle : Primaire / Collège / Lycée
- [x] Card par classe : nom, niveau, capacité (nb élèves / max), enseignant principal
- [x] Badge rouge si `nb_eleves > capacity` (surcharge)
- [x] Bouton "Nouvelle classe" → `Dialog`
- [x] Formulaire : nom, niveau, cycle, capacité max
- [x] Actions : Modifier, Archiver (`ConfirmDialog`)
- [x] `GET/POST/PUT /pedagogy/classes/`

**Labels :** `pédagogie`

---

### 🃏 [PEDAGOGY-03] Gestion des Matières (`/app/pedagogy/subjects`)

**Description :** Créer la page de gestion des matières enseignées.

**Checklist :**
- [x] Liste des matières : nom, code, catégorie, officielle
- [x] Formulaire création/édition en `Dialog`
- [x] Champs : code*, nom*, catégorie*, officielle (switch)
- [x] Actions : Modifier, Supprimer (`ConfirmDialog`)
- [x] `GET/POST/PUT/DELETE /pedagogy/subjects/`

**Labels :** `pédagogie`

---

### 🃏 [PEDAGOGY-04] Emploi du Temps (`/app/pedagogy/timetable`)

**Description :** Créer la vue hebdomadaire de l'emploi du temps.

**Checklist :**
- [x] Sélecteur de classe en haut de page
- [x] Grille hebdomadaire : colonnes Lundi → Samedi
- [x] Chaque créneau : matière (avec couleur), salle
- [x] Bouton "+" par colonne pour ajouter un créneau
- [x] `Dialog` ajout créneau : jour, heure début/fin, matière, salle
- [x] Actions créneau : Modifier, Supprimer
- [x] Responsive : scroll horizontal (`ScrollArea`)
- [x] `GET/POST/PATCH/DELETE /pedagogy/timetable/` (nouveau endpoint backend)

**Labels :** `pédagogie`

---

### 🃏 [PEDAGOGY-05] Gestion des Présences (`/app/pedagogy/attendance`)

**Description :** Créer l'interface de saisie et de suivi des présences.

**Checklist :**
- [x] Sélecteurs en cascade : classe → date → matière (optionnel)
- [x] Liste des élèves avec statut de présence inline
- [x] Saisie rapide par ligne : boutons `Présent / Absent / Retard / Exclu`
- [x] Saisie en masse : bouton "Tous présents"
- [x] Bouton "Enregistrer tout" → `POST /pedagogy/attendances/` (bulk)
- [x] Loading state (`Skeleton`) pendant le chargement
- [x] Statistiques d'assiduité : `PieChart` Recharts
- [x] Vue historique : date passée → lecture seule
- [x] Toast succès/erreur

**Labels :** `pédagogie`

---

## MODULE 5 — 🎓 Gestion des Élèves

---

### 🃏 [STUDENTS-01] Liste des Élèves (`/app/students`)

**Description :** Créer la page principale de liste et recherche des élèves.

**Checklist :**
- [x] `DataTable` paginée, triable, filtrable
- [x] Colonnes : Matricule, Nom complet, Classe, Statut, Tuteur (téléphone), Actions
- [x] Filtre : classe (`Select`)
- [x] Filtre : statut (`ACTIF / SUSPENDU / TRANSFERE / ARCHIVE`)
- [x] Filtre : année scolaire
- [x] Barre de recherche texte (nom, matricule)
- [x] `StatusBadge` sur la colonne Statut
- [x] Bouton "Export CSV" (icône `Download`)
- [x] Bouton "Inscrire un élève" → conditionnel (`PermissionGate` : `can_create_student`)
- [x] Clic sur une ligne → navigation vers `/app/students/[id]`
- [x] Données : `GET /students/?classe=&statut=&annee=&search=`

**Labels :** `élèves` `priorité-haute`

---

### 🃏 [STUDENTS-02] Formulaire d'inscription (`/app/students/new`)

**Description :** Créer le formulaire multi-sections d'inscription d'un nouvel élève.

**Checklist :**
- [x] **Section 1 — Informations personnelles**
  - [x] Nom* (`Input`)
  - [x] Prénom(s)* (`Input`)
  - [x] Date de naissance* (`DatePicker`, validation : pas dans le futur)
  - [x] Lieu de naissance (`Input`)
  - [x] Sexe* (`RadioGroup` : M / F)
  - [x] Photo (`FileUploader` — JPG/PNG, max 2 Mo, prévisualisation)
- [x] **Section 2 — Tuteur légal**
  - [x] Nom complet tuteur* (`Input`)
  - [x] Lien de parenté* (`Select` : Père / Mère / Tuteur / Autre)
  - [x] Téléphone* (`Input`, validation regex `^\+224[0-9]{9}$`, format affiché)
  - [x] Email (`Input`, optionnel)
- [x] **Section 3 — Scolarité**
  - [x] Année scolaire* (`Select`, filtrée : statuts `OUVERTE` et `EN_COURS` uniquement)
  - [x] Classe* (`Select`, filtrée par année scolaire, capacité affichée)
  - [x] Type d'inscription* (`Select` : Nouvelle / Réinscription / Transfert entrant)
  - [x] Observations (`Textarea`, optionnel)
- [x] Validation Zod globale avec messages d'erreur inline
- [x] Alerte si classe pleine → `AlertDialog` de confirmation avant soumission
- [x] Vérification doublon (nom + prénom + date de naissance) via appel API avant submit
- [x] Bouton "Enregistrer" avec loading state
- [x] `POST /students/`
- [x] Toast succès → redirection vers la fiche élève créée

**Labels :** `élèves` `formulaire` `priorité-haute`

---

### 🃏 [STUDENTS-03] Fiche Élève — Tab Profil (`/app/students/[id]`)

**Description :** Créer la page de fiche élève avec l'en-tête et le tab Profil.

**Checklist :**
- [x] En-tête : avatar (photo élève ou initiales), matricule, nom complet, classe, `StatusBadge`
- [x] Structure `Tabs` : Profil, Notes, Présences, Finances, Historique
- [x] Tab Profil : affichage des infos personnelles + tuteur (lecture seule)
- [x] Bouton "Modifier" → formulaire d'édition inline ou `Sheet` (selon permissions)
- [x] Actions selon rôle (`PermissionGate`) :
  - [x] `ADMIN_SCHOOL` : Modifier, Archiver (`ConfirmDialog`), Réinscrire
  - [x] `SECRETAIRE` : Modifier profil
- [x] Données : `GET /students/{id}/`

**Labels :** `élèves`

---

### 🃏 [STUDENTS-04] Fiche Élève — Tab Notes

**Description :** Afficher les notes et moyennes d'un élève dans sa fiche.

**Checklist :**
- [ ] Sélecteur de période (Trimestre 1, 2, 3)
- [ ] Tableau : matière, note /20, coefficient, note pondérée, commentaire
- [ ] Ligne total : moyenne générale calculée dynamiquement
- [ ] Mention en `Badge` coloré (Excellent → vert foncé, Passable → jaune, Insuffisant → rouge)
- [ ] Note rouge si note convertie < 10/20
- [ ] Données : `GET /pedagogy/grades/?etudiant={id}&periode=`

**Labels :** `élèves` `notes`

---

### 🃏 [STUDENTS-05] Fiche Élève — Tab Présences

**Description :** Afficher le suivi des présences d'un élève dans sa fiche.

**Checklist :**
- [ ] Vue liste ou calendrier des présences
- [ ] Statistiques : taux d'assiduité global, nb absences, nb retards
- [ ] `PieChart` Recharts par statut (Présent / Absent / Retard)
- [ ] Données : `GET /pedagogy/attendances/?etudiant={id}`

**Labels :** `élèves`

---

### 🃏 [STUDENTS-06] Fiche Élève — Tab Finances

**Description :** Afficher le solde et l'historique financier d'un élève dans sa fiche.

**Checklist :**
- [ ] Solde dû mis en évidence (montant en rouge si > 0)
- [ ] Liste des paiements : date, montant, méthode, n° reçu
- [ ] Bouton "Enregistrer un paiement" → ouvre le `Dialog` de paiement (MODULE FINANCE)
- [ ] Données : `GET /finance/payments/?etudiant={id}`

**Labels :** `élèves` `finance`

---

### 🃏 [STUDENTS-07] Fiche Élève — Tab Historique

**Description :** Afficher la timeline des événements de la vie scolaire de l'élève.

**Checklist :**
- [ ] Timeline verticale chronologique
- [ ] Types d'événements : inscription, changement de classe, décision fin d'année, modification profil, paiement
- [ ] Icône et couleur par type d'événement
- [ ] Date et auteur de chaque événement
- [ ] Données : `GET /students/{id}/history/`

**Labels :** `élèves`

---

## MODULE 6 — 📝 Notes & Évaluations

---

### 🃏 [GRADES-01] Interface de saisie des notes (`/app/grades`)

**Description :** Créer la page principale de saisie des notes par classe et matière.

**Checklist :**
- [ ] Sélecteurs en cascade : Année scolaire → Classe → Matière → Période → Type de note
- [ ] Tableau de saisie : une ligne par élève
  - [ ] Colonnes : Matricule, Nom, Note (champ numérique), Barème (`Select` : /20 · /40 · /100), Note convertie /20 (calculée en temps réel), Commentaire (`Input`)
- [ ] Note rouge si note convertie < 10/20 (indicateur visuel)
- [ ] Bouton "Enregistrer en brouillon" → `POST /pedagogy/grades/` (statut brouillon)
- [ ] Bouton "Valider" (ADMIN_SCHOOL uniquement via `PermissionGate`) → changement de statut
- [ ] Loading state sur les boutons
- [ ] Toast succès/erreur
- [ ] Données : `GET /students/?classe=&annee=`, `POST /pedagogy/grades/`

**Labels :** `notes` `priorité-haute`

---

### 🃏 [GRADES-02] Saisie en masse via CSV (`/app/grades/bulk`)

**Description :** Créer l'interface d'import de notes par fichier CSV.

**Checklist :**
- [ ] Bouton "Télécharger le modèle CSV" → `GET /pedagogy/grades/template/`
- [ ] `FileUploader` : accepte `.csv` uniquement
- [ ] Aperçu du fichier avant validation : tableau des données parsées
- [ ] Indicateur d'erreurs de parsing (lignes invalides en rouge)
- [ ] Bouton "Valider l'import" → `POST /pedagogy/grades/bulk/`
- [ ] Rapport après import : nb notes importées, nb erreurs
- [ ] Accessible uniquement à `ADMIN_SCHOOL` et `SECRETAIRE`

**Labels :** `notes`

---

### 🃏 [GRADES-03] Classement de classe (`/app/pedagogy/classes/[id]/ranking`)

**Description :** Créer la vue classement d'une classe par moyenne décroissante.

**Checklist :**
- [ ] Tableau trié par moyenne décroissante : rang, nom, moyenne générale, mention
- [ ] `Badge` de mention coloré
- [ ] Sélecteur de période
- [ ] Bouton "Exporter PDF" → `react-pdf` → téléchargement du bulletin de classement
- [ ] Données : `GET /pedagogy/grades/ranking/?classe={id}&periode=`

**Labels :** `notes`

---

### 🃏 [GRADES-04] Décisions de Fin d'Année (`/app/year-end`)

**Description :** Créer l'interface de décision de passage de fin d'année.

**Checklist :**
- [ ] Accessible uniquement quand l'année scolaire est en statut `CLOTURE_EN_COURS`
- [ ] Sélecteur de classe
- [ ] Tableau : élève, moyenne archivée, mention, décision actuelle
- [ ] Par ligne : `Select` décision (`ADMIS / REDOUBLE / ORIENTE / TRANSFERE / EXCLU`) + classe destination (si pertinent)
- [ ] Pré-remplissage automatique : `ADMIS` si moyenne ≥ seuil de passage (configurable)
- [ ] Alerte si élève a atteint le nb max de redoublements (`Badge` orange + `Tooltip`)
- [ ] Bouton "Traitement groupé" → `AlertDialog` → `POST /promotions/bulk/`
- [ ] Accessible uniquement à `ADMIN_SCHOOL`

**Labels :** `notes` `fin-d-année`

---

## MODULE 7 — 💰 Finance

---

### 🃏 [FINANCE-01] Catégories de Frais (`/app/finance/fees`)

**Description :** Créer l'interface de gestion des catégories de frais scolaires.

**Checklist :**
- [ ] Liste des catégories : nom, type, montant, obligatoire (`Switch` en lecture)
- [ ] Bouton "Nouvelle catégorie" → `Sheet` latéral
- [ ] Formulaire `Sheet` :
  - [ ] Nom* (`Input`)
  - [ ] Type* (`Select` : Inscription / Scolarité / Cantine / Transport / Autre)
  - [ ] Montant* (`Input` numérique, formaté en GNF)
  - [ ] Échéancier : champs dynamiques (ajouter/supprimer des tranches)
  - [ ] Obligatoire (`Switch`)
- [ ] Validation Zod
- [ ] Actions : Modifier, Supprimer (`ConfirmDialog`)
- [ ] `GET/POST/PUT/DELETE /finance/feecategories/`

**Labels :** `finance`

---

### 🃏 [FINANCE-02] Enregistrement de Paiement (`/app/finance/payments`)

**Description :** Créer le formulaire d'enregistrement d'un paiement et la liste des paiements.

**Checklist :**
- [ ] **`Dialog` de paiement** (déclenchable depuis la liste OU la fiche élève) :
  - [ ] Élève (autocomplete `Command` avec recherche en temps réel)
  - [ ] Montant* (`Input` numérique)
  - [ ] Mode de paiement* (`Select` : Espèces / Orange Money / MTN Money / Wave / Virement)
  - [ ] Référence (`Input`, optionnel)
  - [ ] Date* (`DatePicker`, défaut = aujourd'hui)
  - [ ] Commentaire (`Textarea`, optionnel)
  - [ ] Bouton "Enregistrer" avec loading state
  - [ ] `POST /finance/payments/`
  - [ ] Après succès : bouton "Imprimer le reçu" → génération PDF (`react-pdf`)
- [ ] **Liste des paiements** (`DataTable`) :
  - [ ] Colonnes : Date, Élève, Montant (GNF), Méthode, Statut, N° Reçu, Actions
  - [ ] Filtres : méthode, statut, plage de dates (`DatePicker` range)
  - [ ] Total en bas : montant total encaissé, nb paiements
  - [ ] Bouton "Nouveau paiement" → ouvre le `Dialog`

**Labels :** `finance` `priorité-haute`

---

### 🃏 [FINANCE-03] Génération de Reçu PDF

**Description :** Implémenter la génération et l'impression du reçu de paiement en PDF.

**Checklist :**
- [ ] Template PDF avec `react-pdf` : logo école, informations élève, montant, méthode, date, n° reçu
- [ ] Chargé dynamiquement via `next/dynamic` (éviter augmentation du bundle)
- [ ] Bouton "Télécharger" et "Imprimer" (ouverture dans un nouvel onglet)
- [ ] Prévisualisation avant impression (`react-pdf` viewer)

**Labels :** `finance`

---

### 🃏 [FINANCE-04] Factures (`/app/finance/invoices`)

**Description :** Créer l'interface de gestion des factures par élève.

**Checklist :**
- [ ] Liste des factures : élève, année scolaire, montant dû, payé, solde, statut
- [ ] `StatusBadge` : Pending (orange) / Paid (vert) / Overdue (rouge)
- [ ] Filtres : statut, élève, année scolaire
- [ ] Vue détail d'une facture : montant dû, payé, solde restant, historique paiements associés
- [ ] Bouton "Générer PDF" → `POST /finance/invoices/{id}/generate-pdf/` → téléchargement
- [ ] Données : `GET /finance/invoices/`

**Labels :** `finance`

---

## MODULE 8 — 🎫 Support & Tickets

---

### 🃏 [SUPPORT-01] Liste des Tickets (`/app/support/tickets`)

**Description :** Créer la liste des tickets de support.

**Checklist :**
- [ ] `DataTable` : N° ticket, Catégorie, Priorité (`Badge` coloré), Statut, Date, Assigné à
- [ ] Filtres : statut, catégorie, priorité
- [ ] Bouton "Nouveau ticket" → ouvre un `Dialog` ou page dédiée
- [ ] Clic sur une ligne → `/app/support/tickets/[id]`
- [ ] Données : `GET /support/tickets/`

**Labels :** `support`

---

### 🃏 [SUPPORT-02] Formulaire de création de ticket

**Description :** Créer le formulaire de soumission d'un nouveau ticket de support.

**Checklist :**
- [ ] Catégorie (`Select`) : Technique / Facturation / Fonctionnel / Demande de fonctionnalité / Blocage / Paiement
- [ ] Priorité (`Select`) : Bloquant / Majeur / Mineur / Question
- [ ] Description* (`Textarea`)
- [ ] Capture d'écran (upload optionnel, via `FileUploader`)
- [ ] Validation Zod
- [ ] `POST /support/tickets/`
- [ ] Toast succès

**Labels :** `support`

---

### 🃏 [SUPPORT-03] Détail d'un Ticket (`/app/support/tickets/[id]`)

**Description :** Créer la page de détail et fil de discussion d'un ticket.

**Checklist :**
- [ ] En-tête : N° ticket, catégorie, priorité, statut (`StatusBadge`)
- [ ] Fil de discussion chronologique dans un `ScrollArea`
- [ ] Chaque message : avatar, nom, date, contenu
- [ ] Formulaire de réponse en bas (Textarea + bouton Envoyer)
- [ ] `POST /support/tickets/{id}/messages/`
- [ ] Actualisation du fil en temps réel ou polling toutes les 30s (React Query)
- [ ] Actions admin (`PermissionGate` : `SUPER_ADMIN`, `ADMIN_SCHOOL`) :
  - [ ] Changer le statut (`Select`)
  - [ ] Assigner à un utilisateur (`Select`)

**Labels :** `support`

---

## MODULE 9 — ⚙️ Paramètres & Configuration

---

### 🃏 [SETTINGS-01] Page Paramètres (`/app/settings`)

**Description :** Créer la page de configuration de l'établissement scolaire.

**Checklist :**
- [ ] Accessible uniquement à `ADMIN_SCHOOL`
- [ ] Section "Informations de l'école" : nom, logo (`FileUploader`), contact, adresse
- [ ] Section "Paramètres pédagogiques" : seuil de passage (note mini pour `ADMIS`), nb max redoublements
- [ ] Section "Utilisateurs" : liste des comptes associés à l'école, inviter un utilisateur (email + rôle)
- [ ] Section "Sécurité" : changer mot de passe, sessions actives
- [ ] Formulaires avec validation Zod
- [ ] `PUT /schools/{id}/` pour les infos de l'école

**Labels :** `paramètres`

---

## MODULE 10 — 📊 Monitoring

---

### 🃏 [MONITORING-01] Logs d'Audit

**Description :** Créer l'interface de consultation des logs d'audit (accès Super Admin et Admin École).

**Checklist :**
- [ ] `DataTable` : Date, Utilisateur, Action, Entité concernée, Ancienne valeur, Nouvelle valeur, IP
- [ ] Filtres : utilisateur (`Select`), type d'action, plage de dates
- [ ] Bouton "Export CSV"
- [ ] Pagination côté serveur
- [ ] Accessible sur `/superadmin/audit` pour le Super Admin et `/app/settings` (onglet) pour `ADMIN_SCHOOL`
- [ ] Données : `GET /monitoring/auditlogs/`

**Labels :** `monitoring`

---

### 🃏 [MONITORING-02] Alertes Système (Super Admin)

**Description :** Créer l'interface de gestion des alertes système.

**Checklist :**
- [ ] Liste des alertes actives avec niveau (Critique / Warning / Info)
- [ ] `Badge` coloré par niveau
- [ ] Bouton "Marquer comme résolue"
- [ ] Données : `GET /monitoring/systemalerts/`
- [ ] Affiché sur le dashboard Super Admin et dans une page dédiée

**Labels :** `monitoring` `superadmin`

---

## MODULE 11 — 🧪 Tests & Qualité

---

### 🃏 [TEST-01] Tests unitaires — Composants partagés (Vitest + RTL)

**Description :** Écrire les tests unitaires pour les composants partagés critiques.

**Checklist :**
- [ ] `DataTable` : rendu, état vide, état de chargement, tri, pagination
- [ ] `StatusBadge` : rendu pour chaque statut (couleur correcte)
- [ ] `ConfirmDialog` : ouverture, confirmation, annulation
- [ ] `EmptyState` : rendu avec et sans CTA
- [ ] `PermissionGate` : affichage selon permission, fallback
- [ ] `FileUploader` : validation type, taille, preview
- [ ] Coverage minimum : 70%

**Labels :** `tests`

---

### 🃏 [TEST-02] Tests unitaires — Hooks

**Description :** Écrire les tests unitaires pour les hooks custom.

**Checklist :**
- [ ] `usePermission` : retourne `true/false` selon le rôle mockó
- [ ] `useRole` : vérifie l'appartenance à une liste de rôles
- [ ] `useAuth` : connexion, déconnexion, état de session

**Labels :** `tests`

---

### 🃏 [TEST-03] Tests E2E — Scénarios critiques (Playwright)

**Description :** Écrire les tests end-to-end pour les parcours utilisateur critiques.

**Checklist :**
- [ ] Connexion et déconnexion pour chaque rôle (Super Admin, Admin École, Secrétaire, Enseignant, Parent)
- [ ] Inscription d'un élève complet (formulaire multi-sections)
- [ ] Saisie d'une note et validation
- [ ] Enregistrement d'un paiement et impression du reçu
- [ ] Création d'une école (Super Admin)
- [ ] Configuration des fixtures et mocks API

**Labels :** `tests`

---

### 🃏 [TEST-04] Tests d'accessibilité

**Description :** Intégrer et valider les tests d'accessibilité WCAG 2.1 AA.

**Checklist :**
- [ ] Installer `@axe-core/react` en mode développement
- [ ] Corriger toutes les violations de contraste (minimum WCAG AA)
- [ ] Navigation clavier complète sur tous les formulaires
- [ ] Navigation clavier complète sur les tableaux (`DataTable`)
- [ ] Attributs `aria-label` sur les boutons icônes (sans texte visible)
- [ ] Test sur lecteur d'écran (VoiceOver ou NVDA)

**Labels :** `tests` `accessibilité`

---

## MODULE 12 — 🚀 Performance & Déploiement

---

### 🃏 [PERF-01] Optimisation des performances

**Description :** Implémenter les optimisations de performance définies dans le cahier des charges.

**Checklist :**
- [ ] Toutes les images via `next/image` avec lazy loading et tailles adaptatives
- [ ] `next/dynamic` pour les composants lourds : `recharts`, `react-pdf`
- [ ] `@tanstack/react-virtual` pour les listes de > 500 éléments
- [ ] Vérifier Core Web Vitals : LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] FCP < 1.5s sur connexion 3G simulée (Lighthouse)
- [ ] `Link prefetch` activé sur la navigation principale
- [ ] Bundle analysis : `next build --profile` + `@next/bundle-analyzer`

**Labels :** `performance`

---

### 🃏 [PERF-02] Audit de sécurité frontend

**Description :** Vérifier et renforcer la sécurité du frontend avant mise en production.

**Checklist :**
- [ ] Aucun `dangerouslySetInnerHTML` dans le code
- [ ] Headers sécurité validés : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] CSP (Content Security Policy) configuré dans `next.config.ts`
- [ ] Aucun token JWT en `localStorage` ou `sessionStorage`
- [ ] `console.log` supprimés en production (config Next.js build)
- [ ] `npm audit` sans vulnérabilité critique
- [ ] Variables `NEXT_PUBLIC_*` : uniquement des données non sensibles

**Labels :** `sécurité`

---

### 🃏 [PERF-03] Configuration CI/CD

**Description :** Mettre en place le pipeline d'intégration et de déploiement continu.

**Checklist :**
- [ ] Script `type-check` (`tsc --noEmit`) dans la CI
- [ ] Script `lint` (`next lint`) dans la CI
- [ ] Script `test` (Vitest) dans la CI
- [ ] Script `test:e2e` (Playwright) dans la CI
- [ ] Build de production (`next build`) validé sans erreurs
- [ ] Dependabot activé sur le repo GitHub
- [ ] Déploiement automatique sur merge `main` (Vercel, Railway ou équivalent)

**Labels :** `devops`

---

*— Fin des cartes Trello · Eduguinée 3.0 Frontend —*
