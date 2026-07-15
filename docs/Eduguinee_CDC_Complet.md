# CAHIER DES CHARGES COMPLET — EDUGUINÉE 3.0
## SaaS de Gestion Scolaire pour les Établissements Guinéens

**Version :** 2.0 (consolidation de tous les documents de travail)
**Date :** Juillet 2026
**Statut :** Base de redémarrage du projet — document de référence unique
**Destinataires :** Équipe technique (Backend/Frontend), Product Owner, Designer, Direction

> Ce document consolide et harmonise l'ensemble des travaux déjà produits sur Eduguinée (cahiers des charges backend/frontend, structure fonctionnelle détaillée, cartes Trello backend/frontend, checklists de développement). Il est conçu pour être **la seule source de vérité** au moment de relancer le projet. Chaque fonctionnalité identifiée dans les documents précédents y est reprise, classée et détaillée — rien n'a été volontairement omis. Les sections marquées **[ROADMAP]** désignent des fonctionnalités avancées à ne pas développer en priorité (V1) mais à garder en tête dans les choix d'architecture.

---

## TABLE DES MATIÈRES

1. [Vision et contexte du projet](#1-vision-et-contexte-du-projet)
2. [Spécificités guinéennes et africaines à respecter](#2-spécificités-guinéennes-et-africaines-à-respecter)
3. [Architecture technique globale](#3-architecture-technique-globale)
4. [Modèle multi-tenant, plans et abonnements SaaS](#4-modèle-multi-tenant-plans-et-abonnements-saas)
5. [Authentification, rôles et permissions (RBAC/ABAC)](#5-authentification-rôles-et-permissions-rbacabac)
6. [Module Super Administration (plateforme)](#6-module-super-administration-plateforme)
7. [Module Administration École — Années scolaires et périodes](#7-module-administration-école--années-scolaires-et-périodes)
8. [Module Administration École — Classes, niveaux, filières](#8-module-administration-école--classes-niveaux-filières)
9. [Module Administration École — Élèves](#9-module-administration-école--élèves)
10. [Module Administration École — Personnel (staff)](#10-module-administration-école--personnel-staff)
11. [Module Matières et Programmes](#11-module-matières-et-programmes)
12. [Module Emplois du Temps](#12-module-emplois-du-temps)
13. [Module Présences et Absences](#13-module-présences-et-absences)
14. [Module Notes, Évaluations et Bulletins](#14-module-notes-évaluations-et-bulletins)
15. [Module Examens Officiels (CEE, BEPC, BAC)](#15-module-examens-officiels-cee-bepc-bac)
16. [Module Finance](#16-module-finance)
17. [Module Paie et Ressources Humaines](#17-module-paie-et-ressources-humaines)
18. [Module Documents et Signature Numérique](#18-module-documents-et-signature-numérique)
19. [Modules Infrastructures (Transport, Cantine, Internat)](#19-modules-infrastructures-transport-cantine-internat)
20. [Module Communication Multicanale](#20-module-communication-multicanale)
21. [Module Monitoring, Support et Sécurité](#21-module-monitoring-support-et-sécurité)
22. [Module Analytics et IA Prédictive [ROADMAP]](#22-module-analytics-et-ia-prédictive-roadmap)
23. [Application Enseignant (PWA)](#23-application-enseignant-pwa)
24. [Application Parent (Mobile-first)](#24-application-parent-mobile-first)
25. [Application Élève [optionnel]](#25-application-élève-optionnel)
26. [Modèle de données — synthèse des entités](#26-modèle-de-données--synthèse-des-entités)
27. [Workflows métier clés](#27-workflows-métier-clés)
28. [Intégrations tierces](#28-intégrations-tierces)
29. [Exigences non-fonctionnelles](#29-exigences-non-fonctionnelles)
30. [Stack technique recommandée](#30-stack-technique-recommandée)
31. [Sécurité — synthèse transversale](#31-sécurité--synthèse-transversale)
32. [Plan de développement, équipe et budget indicatif](#32-plan-de-développement-équipe-et-budget-indicatif)
33. [Annexes](#33-annexes)

---

## 1. Vision et contexte du projet

### 1.1 Objectif

Eduguinée 3.0 est un **SaaS multi-tenant de gestion scolaire complet**, destiné aux établissements d'enseignement guinéens (maternelle, primaire, collège, lycée général, lycée technique, formation professionnelle). La plateforme doit couvrir l'intégralité du cycle de vie scolaire : inscription des élèves, gestion pédagogique (classes, notes, présences, emplois du temps), gestion financière (frais, paiements, paie), communication école-famille, conformité réglementaire (MINEDU/MEPU-A), et pilotage de la plateforme elle-même (facturation SaaS, support, monitoring).

Ce document remplace et fusionne les versions précédentes du cahier des charges pour servir de **base unique de redémarrage**. Le périmètre couvert est volontairement large et priorisé (V1 / V2 / Roadmap) plutôt que réduit, afin qu'aucune fonctionnalité déjà réfléchie ne soit perdue.

### 1.2 Périmètre fonctionnel global

| Espace / Application | Public cible | Priorité |
|---|---|---|
| **Super Admin** | Équipe Eduguinée (exploitation de la plateforme SaaS) | V1 |
| **Espace Admin École** (web) | Directeurs, Secrétaires, Comptables, Censeurs, Surveillants | V1 |
| **Application Enseignant** (PWA, web + mobile responsive) | Enseignants | V1 |
| **Application Parent** (mobile-first, Android prioritaire) | Parents / tuteurs légaux | V1 |
| **Application Élève** | Élèves (secondaire) | V2 / optionnel |
| **Portail Réseau d'écoles** | Groupes scolaires multi-établissements | V2 |
| **Portail Inspection académique** | Inspecteurs MINEDU (lecture seule) | V2 |

### 1.3 Principes directeurs de conception

- **Multi-tenant strict** : isolation totale des données par établissement (tenant), avec support du multi-campus pour un même établissement et du regroupement en réseau d'écoles.
- **Offline-first sur les parcours critiques** : la saisie des présences et des notes doit fonctionner sans connexion et se synchroniser ensuite.
- **Mobile Money natif** : les paiements Orange Money, MTN Mobile Money et Wave sont un besoin de premier ordre, pas une intégration secondaire.
- **Conformité locale par construction** : barème sur 20, coefficients, calendrier scolaire, MINEDU/MEPU-A, OHADA/Syscohada, CNSS/AMO sont pensés dès la modélisation des données, pas ajoutés après coup.
- **Configuration par école plutôt que code en dur** : seuils de passage, nombre de redoublements autorisés, échéanciers de paiement, modules activés, etc. sont paramétrables par tenant.
- **Sécurité et auditabilité par défaut** : toute action sensible (notes, finances, décisions de passage, accès aux données médicales) est journalisée de façon immuable.

---

## 2. Spécificités guinéennes et africaines à respecter

Cette section rassemble les contraintes de contexte qui doivent influencer chaque choix technique et fonctionnel du projet.

### 2.1 Réalités de connectivité et d'équipement

- **Connectivité 2G/3G dominante**, avec coupures fréquentes. Le mode **offline-first est obligatoire** pour toute saisie critique (présences, notes) : les enseignants doivent pouvoir travailler sans réseau puis synchroniser au retour de connexion.
- **Pages et assets légers** : cible < 500 Ko par page, compression Gzip/Brotli, images en WebP, lazy loading systématique.
- **Mode « Économie de données »** pour les parents : désactivation des photos, contenu texte uniquement.
- **Coupures électriques fréquentes** : auto-sauvegarde toutes les 30 secondes minimum sur les formulaires de saisie ; infrastructure serveur avec onduleurs (UPS).
- **Feature phones encore répandus** : un canal **USSD** (`*144#` ou équivalent) doit permettre aux parents sans smartphone de consulter le solde de scolarité, les dernières notes et la prochaine échéance, en français et en langues locales.
- **Tablettes en salle de classe** : interface tactile optimisée pour la saisie rapide des présences.
- **Imprimantes thermiques** : les reçus de caisse doivent pouvoir être imprimés au format ticket 58 mm en plus du PDF A4.

### 2.2 Langues et culture

- **Langue principale : français.** Langues locales à intégrer progressivement : **Pular (Peul)**, **Susu**, **Malinké (Maninka)** — au minimum pour la navigation principale, les notifications et le menu USSD.
- Prévoir des **icônes universelles** en complément du texte pour les utilisateurs peu à l'aise avec l'écrit, et une option de lecture audio des notifications pour les parents analphabètes.
- **Structures familiales élargies** : gestion de familles polygames (plusieurs mères pour un même père, avec contacts multiples), tuteurs légaux (oncles, grands-parents) avec légalisation à tracer dans la fiche élève, et parents de la diaspora payant depuis l'étranger (besoin de devises EUR/USD, preuves de paiement pour démarches consulaires).

### 2.3 Gouvernance scolaire guinéenne

- **MINEDU / MEPU-A** (Ministère de l'Enseignement Pré-Universitaire et de l'Alphabétisation) : export statistique trimestriel et annuel obligatoire (format Excel/CSV/XML fourni par le ministère), code MINEDU par établissement.
- **Inspection académique** : accès en lecture seule à un tableau de bord dédié (effectifs, résultats, sanctions disciplinaires graves, plaintes), avec authentification spécifique et audit trail de toutes les consultations.
- **Examens officiels nationaux** : CEE (fin primaire), BEPC (fin collège), Baccalauréat (fin lycée) — voir section dédiée.
- **Grèves syndicales fréquentes** : une fonctionnalité « École fermée / Mode grève » doit permettre une notification de masse et un report automatique des dates d'évaluation.
- **Vacataires** : gestion du paiement à la séance/à l'heure, en dehors du système de paie classique mais traçable.
- **Multi-sites et multi-directeurs** : une école peut avoir plusieurs campus et, dans le cas de réseaux, plusieurs directeurs avec un reporting consolidé au niveau réseau.

### 2.4 Spécificités financières

- **Cycle de trésorerie** : la rentrée (septembre-octobre) concentre ~60 % des revenus annuels (inscriptions + 1ère échéance) ; janvier-février est une période de tension pour les familles (post-fêtes) nécessitant de la flexibilité sur les échéanciers.
- **Micro-paiements et cagnottes familiales** : plusieurs membres d'une même famille peuvent contribuer au paiement d'un même enfant.
- **Paiement en nature** (« paiement en riz/ciment ») dans certaines zones rurales : à enregistrer comme un mode de paiement spécifique avec valeur estimée, pour rester auditable.
- **Multi-devises** : GNF (Franc Guinéen, devise de référence), avec support optionnel XOF/EUR/USD pour les parents de la diaspora, arrondi à 500 GNF (pas de pièces en circulation).
- **Banques locales** : compatibilité avec les circuits UBA (virements) et Société Générale/SOGEB (paiement en agence pour les parents non bancarisés).
- **Conformité OHADA / Syscohada** : plan comptable, journal des recettes, grand livre, balance, export DGI.

---

## 3. Architecture technique globale

### 3.1 Vue d'ensemble

Eduguinée 3.0 expose une **API RESTful** consommée par plusieurs frontaux (web admin, PWA enseignant, application mobile parent). L'architecture est **multi-tenant**, avec isolation stricte des données par établissement, et conçue pour supporter :

- Un **hébergement PostgreSQL** comme base de données principale ;
- Un **stockage de fichiers compatible S3** (MinIO en interne ou AWS S3) pour les photos, documents et bulletins PDF ;
- Une **file d'attente asynchrone** (Celery + Redis) pour les tâches lourdes ou différées (génération de PDF, envoi de SMS/emails, réconciliation de paiements, calcul de scores de risque de décrochage) ;
- Une **API Gateway** en amont de l'application (rate limiting, authentification, routing, logs) ;
- Un **CDN** pour les assets statiques et la protection anti-DDoS.

```
┌─────────────────────────────────────────────────────────────┐
│  CDN (Cloudflare) — cache statique, protection DDoS, SSL     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  API Gateway — rate limiting, authentification, routing      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
 ┌──────▼──────┐     ┌────────▼────────┐    ┌───────▼──────┐
 │  Web App    │     │   API Mobile    │    │  Admin API   │
 │  (Next.js)  │     │  (REST, PWA)    │    │  (privée)    │
 └─────────────┘     └─────────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Application Server (Django/DRF) — logique métier,           │
│  middleware multi-tenant, file d'attente offline             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
 ┌──────▼──────┐     ┌────────▼────────┐    ┌───────▼──────┐
 │ PostgreSQL  │     │  Redis (cache/  │    │ MinIO / S3   │
 │ (DB princ.) │     │  queue Celery)  │    │  (fichiers)  │
 └─────────────┘     └─────────────────┘    └──────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Services externes : Orange Money / MTN / Wave, Africa's     │
│  Talking (SMS/USSD), WhatsApp Business, SendGrid, Firebase   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Conventions de l'API

- Verbes HTTP standards (GET, POST, PUT, PATCH, DELETE) pour les opérations CRUD.
- URLs prévisibles et versionnées : `/api/v1/...` (migration prévue vers `/api/v2/` sans casser la rétrocompatibilité).
- Format JSON exclusif en entrée/sortie.
- Pagination systématique sur les listes (offset ou curseur selon le volume).
- Filtrage et tri via paramètres de requête (`?status=active&ordering=-created_at`).
- Réponses standardisées :

| Code HTTP | Usage | Exemple |
|---|---|---|
| `200 OK` | Succès | `{"status": "success", "data": {...}}` |
| `201 Created` | Ressource créée | `{"status": "success", "data": {...}}` |
| `204 No Content` | Succès sans contenu | — |
| `400 Bad Request` | Erreur de validation | `{"status": "error", "message": "...", "errors": {...}}` |
| `401 Unauthorized` | Authentification requise/échouée | `{"status": "error", "message": "Authentification requise"}` |
| `403 Forbidden` | Permissions insuffisantes | `{"status": "error", "message": "Accès refusé"}` |
| `404 Not Found` | Ressource introuvable | `{"status": "error", "message": "Ressource non trouvée"}` |
| `500 Internal Server Error` | Erreur serveur | `{"status": "error", "message": "Erreur interne du serveur"}` |

### 3.3 Stratégie multi-tenant

- **Isolation applicative par filtrage** (`tenant_id` sur chaque requête, appliqué via middleware et dans chaque `get_queryset`) pour les plans Starter/Pro.
- **Option d'isolation renforcée** (schéma dédié ou base dédiée) pour les clients Enterprise ou réseaux d'écoles à fort volume.
- `tenant_id` propagé via les **claims JWT**, et `campus_id` en complément pour les établissements multi-campus.
- Résolution du tenant par **sous-domaine** (`{slug}.eduguinee.gn`), avec option de domaine personnalisé (CNAME + SSL automatique) pour les clients Enterprise, et header `X-Tenant-ID` pour les clients API/mobile.
- Chaque table métier porte une clé étrangère `tenant_id` ; aucune requête cross-tenant n'est possible depuis les endpoints applicatifs.

### 3.4 Stratégie offline-first

- **Côté PWA Enseignant** : stockage local via IndexedDB (Dexie.js), Service Worker pour l'interception réseau et la mise en file d'attente des requêtes, synchronisation en arrière-plan (Background Sync API) dès le retour de connexion.
- **Résolution de conflits** : stratégie « dernière écriture gagne » (last-write-wins) avec alerte explicite si une même donnée a été modifiée par deux utilisateurs (ex. une note saisie deux fois) ; pour les notes déjà validées, priorité systématique au serveur (« server wins »).
- **File d'upload différée** pour les photos et documents en attente de connexion Wi-Fi.
- **Compression des données locales** (LZ-string) pour économiser l'espace de stockage sur les appareils bas de gamme.

---
## 4. Modèle multi-tenant, plans et abonnements SaaS

### 4.1 Configuration avancée par établissement (Tenant)

Chaque établissement dispose d'un panneau de configuration maître couvrant :

- **Identité** : logo, nom officiel, slug (sous-domaine), code MINEDU, NIF, registre de commerce.
- **Localisation** : fuseau horaire, format de date, premier jour de la semaine, langue par défaut, devise(s) acceptées.
- **Structure** : type d'établissement (Public / Privé / Franco-arabe / Technique-professionnel public ou privé / International / Communautaire / Confessionnel), système éducatif (Guinéen / Franco-arabe / International / Mixte), niveaux actifs, examens préparés, nombre de campus (1 à N, configurable).
- **Modules activables** : internat, transport, cantine, bibliothèque, laboratoire, examens officiels, paie, WhatsApp Business, mode offline avancé, analytics prédictif — chacun conditionné par le plan souscrit.
- **Multi-campus** : chaque établissement peut posséder plusieurs sites géographiques (`Campus`), chacun avec ses propres classes, personnel, emplois du temps et élèves ; le `campus_id` est propagé dans les tokens JWT et tout le filtrage applicatif.
- **Réseau d'écoles (chaînes)** : plusieurs tenants peuvent être regroupés sous un `TenantNetwork` avec un rôle `NETWORK_ADMIN` disposant d'un reporting agrégé (effectifs, chiffre d'affaires, taux de réussite) sur l'ensemble du réseau.

### 4.2 Plans d'abonnement

| Plan | Cible | Caractéristiques |
|---|---|---|
| **Starter** | Petites écoles | Fonctionnalités de base, isolation par filtrage applicatif, stockage limité |
| **Pro** | Écoles moyennes/grandes | Modules avancés (paie, transport, cantine...), stockage étendu |
| **Enterprise** | Grands établissements, réseaux | Isolation renforcée (schéma dédié), multi-campus, API dédiée, SLA prioritaire |
| **Réseau / Ministère / International** [ROADMAP] | Groupes scolaires, partenariats institutionnels | Facturation au nombre d'élèves, reporting consolidé multi-écoles |

Chaque plan définit : `max_students`, `max_staff`, `max_campuses`, `modules_activated` (JSON), `storage_max`, `price_monthly`, `price_annual`, et pour les plans réseau, `price_per_student`.

### 4.3 Cycle de vie d'un abonnement

- **Essai gratuit** : 30 jours, toutes fonctionnalités activées par défaut, notification automatique avant expiration.
- **Statuts** : `TRIAL` → `ACTIVE` → `PAST_DUE` (impayé) → `SUSPENDED` → `CANCELLED`.
- **Upgrade** : effet immédiat, proratisation du montant restant.
- **Downgrade** : effectif à la prochaine échéance, avec vérification préalable que les données de l'école respectent les nouvelles limites (nombre d'élèves, modules).
- **Contrôle de limites** : middleware qui bloque la création de ressources (élève, campus, staff) dès que `max_students`/`max_campuses` est atteint, avec alerte à 80 % de la capacité et proposition d'upgrade automatique à 100 %.

### 4.4 Facturation et paiements SaaS (plateforme → écoles clientes)

- Modes de paiement plateforme : virement bancaire, Mobile Money, carte bancaire (international).
- Génération automatique de facture à chaque échéance, historique complet des transactions.
- **Coupons et codes promotionnels** : réduction en pourcentage ou montant fixe, durée limitée, cas d'usage (lancement, parrainage, offre saisonnière).
- **Gestion des impayés côté plateforme** : détection automatique, relances automatiques (email + SMS), suspension progressive (soft puis hard) en cas de non-paiement prolongé.

### 4.5 Suspension et réactivation d'une école

- **Suspension soft** : lecture seule pour l'école, aucune nouvelle donnée ne peut être créée, consultation et export restent accessibles.
- **Suspension hard** : accès totalement bloqué sauf pour le Super Admin ; utilisée en cas d'impayé prolongé ou de violation grave des conditions d'utilisation.
- **Réactivation** : rétablissement immédiat des accès après régularisation, avec notification à l'ensemble du personnel de l'école.
- **Politique de rétention des données après résiliation** : conservation 12 mois avant suppression définitive, avec export complet proposé au client avant l'échéance.

### 4.6 Tableau de bord SaaS (Super Admin plateforme)

- KPI globaux : nombre total d'écoles, écoles actives/suspendues/en essai, MRR (revenu mensuel récurrent) estimé, taux de churn.
- Graphique d'évolution des inscriptions d'écoles dans le temps.
- Cartographie des écoles (carte interactive, localisation GPS).
- Liste des dernières écoles créées, alertes système actives.

---

## 5. Authentification, rôles et permissions (RBAC/ABAC)

### 5.1 Authentification

- **JWT** avec rotation des refresh tokens : access token 15 minutes, refresh token 7 jours.
- Endpoints : `POST /auth/register/`, `POST /auth/login/`, `POST /auth/refresh/`, `POST /auth/logout/`, `GET/PATCH /users/me/`.
- Protection anti brute-force, blacklistage des tokens révoqués, CORS/CSRF correctement configurés.
- **2FA (TOTP)** recommandée pour les comptes Super Admin et Directeur, avec SMS en solution de secours.
- Hashing des mots de passe avec **Argon2id** (12 caractères minimum, complexité imposée).
- Connexion enseignant : email/téléphone + mot de passe, option « rester connecté 30 jours », option OTP par SMS, verrouillage automatique après 5 minutes d'inactivité sur la PWA (configurable).

### 5.2 Rôles définis

| Rôle | Constante | Description |
|---|---|---|
| Super Administrateur | `SUPER_ADMIN` | Gestion globale de la plateforme SaaS |
| Administrateur réseau | `NETWORK_ADMIN` | Vue consolidée sur les écoles d'un même réseau |
| Directeur / Admin École | `ADMIN_SCHOOL` (`DIRECTOR`) | Accès complet à son établissement |
| Directeur adjoint | `DEPUTY_DIRECTOR` | Délégation partielle des pouvoirs du directeur |
| Directeur des études | `STUDIES_DIRECTOR` | Validation pédagogique (notes, bulletins, programmes) |
| Censeur | `CENSOR` | Discipline, présences, conseils de classe (lycée) |
| Secrétaire | `SECRETAIRE` | Gestion administrative, inscriptions, saisie sans validation finale |
| Comptable | `ACCOUNTANT` | Finances, paiements, paie, comptabilité |
| Surveillant général | `SUPERVISOR` | Discipline, présences, justificatifs |
| Infirmier(e) scolaire | `NURSE` | Accès restreint aux données médicales |
| Bibliothécaire | `LIBRARIAN` | Gestion bibliothèque [ROADMAP] |
| Responsable transport | `TRANSPORT_MANAGER` | Gestion du module transport |
| Responsable cantine | `CANTEEN_MANAGER` | Gestion du module cantine |
| Responsable internat | `DORM_MANAGER` | Gestion du module internat |
| Enseignant titulaire / principal | `TEACHER` / `HEAD_TEACHER` | Saisie notes/présences, suivi pédagogique de sa classe |
| Enseignant vacataire | `GUEST_TEACHER` | Accès temporel restreint (dates de début/fin, matières assignées) |
| Parent / Tuteur | `PARENT` | Consultation et paiement, restreint à ses enfants |
| Élève | `STUDENT` | Consultation restreinte (roadmap) |
| Rôles spécifiques Guinée | `INSPECTOR`, `PTA_PRESIDENT`, `CLASS_REP`, `CNSS_AGENT`, `MOBILE_COLLECTOR` | Voir §2.3 et cas d'usage locaux |
| Rôle personnalisé | `CUSTOM` | Permissions à la carte via `custom_permissions` (JSON) |

Des **rôles composites** peuvent être nécessaires dans les petites structures (ex. `SECRETARY_ACCOUNTANT`, `SUPERVISOR_CENSOR`, `TEACHER_HEAD_CLASS`) : le système de permissions doit permettre de cumuler plusieurs jeux de droits sur un même compte plutôt que d'imposer un rôle unique rigide.

### 5.3 Modèle de permissions

- **RBAC** (Role-Based) pour les cas standards, avec convention de nommage `module:action[:portée]` (ex. `eleves:read:medical`, `notes:validate`, `finances:export:ohada`).
- **ABAC** (Attribute-Based) pour les cas complexes nécessitant des conditions dynamiques (ex. un enseignant ne peut lire les notes que de ses propres matières et classes ; un parent ne peut lire que les données de ses enfants déclarés).
- Permissions granulaires par module (extraits représentatifs) :
  - **Élèves** : `eleves:create`, `eleves:read:full`, `eleves:read:basic`, `eleves:read:medical`, `eleves:update:identity`, `eleves:update:medical`, `eleves:transfer:in/out`, `eleves:export`, `eleves:delete`.
  - **Notes** : `notes:create:evaluation`, `notes:read:all`, `notes:read:own_subject`, `notes:update:draft`, `notes:validate`, `notes:lock`, `notes:unlock`.
  - **Finances** : `finances:config:fees`, `finances:read:all`, `finances:read:own_child`, `finances:payment:record`, `finances:payment:cancel`, `finances:payment:refund`, `finances:report:generate`, `finances:export:ohada`.
  - **Présences** : `attendance:create`, `attendance:read:all`, `attendance:validate:justif`, `attendance:export`.
  - **Emplois du temps** : `timetable:create`, `timetable:update`, `timetable:validate`, `timetable:read:all`.
  - **Communication** : `comm:send:broadcast`, `comm:send:class`, `comm:send:private`, `comm:read:all`, `comm:read:own`.
  - **Documents** : `docs:generate:all`, `docs:sign:official`, `docs:sign:pedagogical`, `docs:sign:financial`.
  - **Paie** : `payroll:config:grids`, `payroll:read:all`, `payroll:generate:draft`, `payroll:validate`, `payroll:process`, `payroll:export:cnss`.
  - **Infrastructures** : `infra:transport:manage`, `infra:cantine:manage`, `infra:dorm:manage`.
- Endpoint dédié : `GET /auth/permissions/me` renvoyant la liste complète des permissions effectives (rôle + custom + restrictions ABAC) pour l'utilisateur courant.
- **Délégations et intérims** [ROADMAP] : possibilité de déléguer temporairement un rôle (ex. directeur en congé) avec date de début/fin et journalisation des actions effectuées « sous délégation ».
- **Constructeur de rôles personnalisés** [ROADMAP] : interface permettant à un directeur de créer un rôle sur mesure en cochant des permissions parmi la liste complète.

### 5.4 Sécurité comportementale (détection d'anomalies)

- Élévation de privilège détectée → notification immédiate au directeur.
- Permission inhabituelle utilisée 3 fois en 24h → alerte à l'administrateur sécurité.
- Accès aux données médicales → journalisation immédiate + rapport batch quotidien.
- Connexion hors heures ouvrées (22h–6h) suivie d'une action sensible → MFA obligatoire + notification.
- Détection de partage de session (2 IP simultanées sur le même compte) → blocage du compte + investigation.

---
## 6. Module Super Administration (plateforme)

Ce module gère le cycle de vie des établissements scolaires (tenants) sur la plateforme.

### 6.1 Création d'une nouvelle école

**Champs obligatoires :**
- Informations générales : nom officiel (unique, max 150 caractères), code MINEDU (optionnel mais unique si renseigné), type d'établissement (Primaire / Collège / Lycée / Mixte / Technique-professionnel).
- Localisation structurée : rue, quartier (texte libre), commune, préfecture, région (liste officielle) + géolocalisation (latitude/longitude) pour la cartographie et l'optimisation des tournées de transport scolaire.
- Contact principal : nom complet, téléphone (+224, validé par regex), email (unique).
- Structure : nombre de campus/sites (1 minimum, plafond configurable, ex. 20).

**Champs fortement recommandés :** logo, année de création, statut (Public/Privé/Communautaire), devise de l'établissement, nom du directeur.

**Validations avant création :** nom d'école non existant, sous-domaine disponible, email non utilisé, numéro de téléphone valide. En cas d'échec, message explicite renvoyé à l'utilisateur.

**Configuration automatique à la création :**
1. Génération du sous-domaine (`{slug-nom-ecole}.eduguinee.com` — minuscules, sans espaces, accents translittérés).
2. Création de l'environnement isolé (filtrage applicatif ou schéma dédié selon le plan).
3. Attribution du plan par défaut : essai gratuit 30 jours, toutes fonctionnalités activées, notification avant expiration.
4. Création automatique du compte Directeur : rôle `ADMIN_SCHOOL`, email de connexion, mot de passe temporaire, obligation de changement au premier login.

### 6.2 Suspension / réactivation

- **Suspension soft** : lecture seule, aucune création possible, consultation/export conservés.
- **Suspension hard** : blocage total sauf pour le Super Admin.
- **Réactivation** : rétablissement immédiat, notification à l'école.
- Notifications automatiques à chaque changement de statut (email + SMS au contact principal).

### 6.3 Gestion des plans et abonnements

Voir détail en section 4. Le Super Admin peut : créer/éditer un plan, consulter la liste des plans, changer le plan d'une école, consulter l'historique des paiements et des transactions, générer des factures, gérer les coupons promotionnels.

### 6.4 Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/superadmin/schools/` | Créer une nouvelle école (tenant) |
| `GET` | `/superadmin/schools/` | Lister toutes les écoles (filtres statut/plan/recherche) |
| `GET` | `/superadmin/schools/{id}/` | Détail d'une école |
| `PATCH` | `/superadmin/schools/{id}/suspend/` | Suspendre une école (soft/hard) |
| `PATCH` | `/superadmin/schools/{id}/reactivate/` | Réactiver une école |
| `GET/POST` | `/superadmin/schools/{id}/campuses/` | Gérer les campus d'une école |
| `POST` | `/superadmin/plans/` | Créer un plan |
| `GET` | `/superadmin/plans/` | Lister les plans |
| `PUT/PATCH` | `/superadmin/plans/{id}/` | Mettre à jour un plan |
| `GET` | `/network/dashboard/` | KPIs agrégés d'un réseau d'écoles |
| `GET` | `/network/schools/` | Liste des écoles d'un réseau |

### 6.5 Journalisation

Toute action critique de ce module (création, suspension, changement de plan) est tracée dans `AuditLog` avec acteur, date, ancienne/nouvelle valeur, IP.

---

## 7. Module Administration École — Années scolaires et périodes

### 7.1 Année scolaire

- Format : `{ANNEE_DEBUT}-{ANNEE_FIN}` (ex. `2025-2026`).
- Champs : établissement, libellé, date de début, date de fin, statut, `is_current` (flag d'accès rapide).
- **États** : `Préparation` → `Active` (`OUVERTE`/`EN_COURS`) → `Clôture en cours` → `Clôturée/Archivée`.
- Une seule année peut être « courante » à la fois par établissement.

### 7.2 Périodes (trimestres/semestres)

- Modèle `AcademicPeriod` : année scolaire, nom, type (`TRIMESTRE` / `SEMESTRE` / `QUARTER` / `UNIT`), dates de début/fin, statut, ordre.
- Validation stricte : pas de chevauchement de périodes sur une même année.
- Configuration par école : notation trimestrielle ou semestrielle.
- Clôture d'une période : verrouille la saisie de notes pour cette période.

### 7.3 Chevauchement et préparation de l'année suivante

- Préparation de l'année N+1 possible en parallèle de l'année N en cours (statut `Préparation`).
- **Copie intelligente** : reprise de la structure de classes (sans les élèves), des matières, coefficients et affectations d'enseignants d'une année à l'autre pour accélérer la configuration.
- Passage à l'année suivante : promotion automatique des élèves selon les décisions de fin d'année (voir §14.6).

### 7.4 Clôture d'année — checklist obligatoire

Avant de pouvoir clôturer une année scolaire, le système vérifie une checklist :

**Critères vérifiés automatiquement :** tous les bulletins ont été générés, tous les trimestres/périodes sont clôturés, une archive a été effectuée.

**Critères à valider manuellement :** décisions de passage saisies pour tous les élèves, soldes financiers soldés ou couverts par un plan d'apurement, rapprochement bancaire effectué, structure de l'année N+1 préparée.

La clôture est **bloquée** tant que les critères bloquants ne sont pas remplis (endpoint `GET /pedagogy/school-years/{id}/closure-checklist/` renvoyant l'état ✅/❌/⚠️ de chaque critère). Interface avec barre de progression et blocage du bouton de clôture le cas échéant.

### 7.5 Cas particuliers

- Élève inscrit en cours d'année : prorata des frais, dérogation sur la date d'inscription.
- Changement de calendrier scolaire en cours d'année : traçabilité de l'ancien et du nouveau calendrier.
- Année exceptionnelle (grève prolongée, épidémie) : mode « année blanche/prolongée » avec ajustement automatique des dates de clôture et des délais d'évaluation.

### 7.6 API et sécurité

- `GET/POST /pedagogy/schoolyears/`, `GET/POST /pedagogy/school-years/{id}/periods/`, `PATCH /pedagogy/periods/{id}/close/`, `POST /pedagogy/school-years/{id}/close/`.
- Aucune saisie de note ni inscription n'est possible sur une année scolaire clôturée.
- Toute modification de statut d'année est journalisée.

---

## 8. Module Administration École — Classes, niveaux, filières

### 8.1 Catalogue complet des niveaux éducatifs guinéens

| Cycle | Niveaux |
|---|---|
| **Maternelle** | Toute petite section (jardin d'enfants), Petite section, Moyenne section, Grande section |
| **Primaire** | CP1 → CM2 |
| **Collège** | 6ème → 3ème |
| **Lycée général** | 2nde → Terminale (filières S, L, SE, SM, SS) |
| **Lycée technique** | Filières T1 à T4 |
| **Formation professionnelle** | CQP, BEP, CAP, BTS |

Chaque niveau porte : cycle, code officiel MINEDU, âge min/max, diplôme final, durée en années. Cas particulier de la **maternelle** : évaluation de type `DESCRIPTIVE` (pas de notation chiffrée).

### 8.2 Types d'établissement et modules requis

Le type d'établissement (Public / Privé / Franco-arabe / Technique public ou privé / International / Communautaire) détermine automatiquement les modules requis ou restreints — par exemple, une école publique ne nécessite pas le module Paie complet (grille CNSS standard).

### 8.3 Filières

Modèle `Filiere` (code, nom, cycle, matières dominantes). Filières prédéfinies : S, L, SE, SM, SS (lycée général) ; T1–T4 (technique) ; BEP, CAP, BTS (professionnel). Une classe peut être rattachée à une filière, ce qui filtre automatiquement les matières disponibles.

### 8.4 Classes

- Attributs : établissement, année scolaire, niveau, filière (optionnelle), campus, nom (ex. « 6ème A »), capacité, salle, enseignant principal.
- **Capacité et effectifs** : alerte à 90 % de remplissage, blocage à 100 % sauf validation directeur avec dépassement exceptionnel (+5 %). Liste d'attente (`WaitingList`) au-delà, avec alerte à la direction si plus de 10 élèves en attente (proposition d'ouverture d'une nouvelle classe).
- **Classes mixtes** (spécificité rurale guinéenne) : une même classe physique peut accueillir plusieurs niveaux logiques (`MixedClass` + `MixedClassLevel`) — présences prises sur la classe physique, notes sur la classe logique. Maximum 3 niveaux combinés, au-delà une validation de l'inspection est requise.
- **Groupes et sous-groupes** : `ClassGroup` pour les TD/TP/groupes de langue (capacité, enseignant, horaire spécifique) et `SubGroup` pour les niveaux combinés ou filières partagées.

### 8.5 Historique et automatisations

- Historique des classes conservé d'année en année (élèves, enseignants, résultats agrégés).
- Promotion automatique de la structure de classe (sans les élèves) à la création de l'année N+1.
- Cas particuliers : classe supprimée en cours d'année (archivage, pas de suppression physique), changement de filière en cours d'année.

### 8.6 API principaux

`GET/POST /pedagogy/classes/`, `GET/POST /pedagogy/classes/{id}/groups/`, `GET /pedagogy/classes/{id}/waiting-list/`, `GET /pedagogy/levels/` (filtrable par cycle).

---
## 9. Module Administration École — Élèves

Ce module couvre le cycle de vie complet d'un élève : de l'inscription initiale à la sortie (diplômé, transféré, exclu), en passant par les notes, le passage en classe supérieure et l'éventuel redoublement. Toutes les données élèves sont strictement cloisonnées par établissement.

### 9.1 Fiche élève — identité

| Champ | Contraintes |
|---|---|
| `matricule` (interne) | Généré automatiquement, format `{ANNEE_DEBUT}-{SEQUENCE sur 5 chiffres}` (ex. `2025-00042`), remis à zéro chaque année scolaire, jamais saisi manuellement (sauf import legacy) |
| `matricule_minedu` | Optionnel, format étendu proposé : `EDG-AAAA-NNNNNNN` |
| Nom, prénom(s) | Obligatoires, max 100/150 caractères |
| Date et lieu de naissance | Obligatoires, date non future |
| Sexe / genre | M / F / Autre / Non précisé |
| Nationalité | Par défaut « Guinéenne » |
| Photo | JPG/PNG, max 2 Mo |
| Adresse complète | Quartier, secteur, commune, préfecture + coordonnées GPS optionnelles |
| Statut | ACTIF / SUSPENDU / TRANSFERT_SORTANT / DIPLOME / EXCLU / DECE / ARCHIVE |
| École précédente | Nom, localisation, type, classe précédente, moyenne précédente, raison du transfert (pour les nouveaux transferts) |

### 9.2 Responsables légaux (multi-parents)

Jusqu'à 4 responsables par élève (`Guardian`) : type (Père/Mère/Tuteur/Autre), téléphone principal et secondaire, email, profession, employeur, adresse, indicateur « vit avec l'élève », contact d'urgence, autorisation de récupération, garde légale. Préférences de notification par responsable (SMS notes/absences/factures, langue). Documents attachables : pièce d'identité, jugement de garde, acte de décès si pertinent. **Validation** : au moins un responsable et un contact d'urgence obligatoires. Téléphone au format guinéen `+224XXXXXXXXX` (regex obligatoire) ; l'email n'a pas besoin d'être unique (un tuteur peut avoir plusieurs enfants).

### 9.3 Données médicales et d'urgence

Modèle `StudentMedical` séparé (relation 1-1) : groupe sanguin, allergies, maladies chroniques, médicaments, handicap, régime alimentaire, vaccinations, certificat médical, hôpital préféré, médecin traitant, assurance maladie, autorisations de traitement d'urgence et de prise de médicaments. **Accès restreint** : permission dédiée `eleves:read:medical` limitée au Directeur, à l'infirmier(e) et au Surveillant (allergies + contact d'urgence uniquement pour ce dernier) ; chaque lecture est auditée.

### 9.4 Workflow d'inscription en 5 étapes

1. **Pré-inscription** : vérification de doublon (nom + prénom + date de naissance), génération d'un matricule provisoire.
2. **Validation des documents** : liste requise selon le type d'inscription (nouveau / transfert / réinscription), OCR optionnel.
3. **Test de niveau** (pour les transferts hors système guinéen) : résultat Confirmé / Ajusté / Refus.
4. **Affectation de classe** : vérification de capacité, alerte à 90 %, blocage à 100 % (sauf dérogation directeur +5 %).
5. **Configuration financière** : calcul des frais, application d'une éventuelle bourse, choix de l'échéancier, paiement minimum de 40 % à l'inscription, génération du matricule définitif, création du compte parent, génération d'une carte élève avec QR code.

À l'issue du processus : génération automatique d'une attestation d'inscription signée numériquement, notification SMS/email aux parents, activation de l'accès à l'application mobile parent.

### 9.5 Réinscription

**Conditions :** statut ACTIF ou décision de fin d'année précédente `ADMIS`/`REDOUBLE` validée ; année scolaire cible en statut `OUVERTE`.

**Workflow :** sélection de l'élève et de l'année cible → pré-remplissage de la classe destination (issue de la décision de fin d'année, modifiable) → création d'un nouvel `Enrollment` de type `REINSCRIPTION` → mise à jour de `classe_actuelle` → journalisation.

### 9.6 Transferts

- **Transfert entrant** : création d'une inscription de type `TRANSFERT_ENTRANT`, mapping des matières entre le système d'origine et le système guinéen, création d'évaluations historiques non modifiables. Les notes de l'ancienne école ne sont pas importées automatiquement.
- **Transfert sortant** : vérification obligatoire du solde financier (= 0 ou plan d'apurement en cours), génération des documents de sortie : certificat de scolarité « Sorti le… », relevé de notes complet, bulletin du dernier trimestre, lettre de recommandation sur demande. Clôture du dossier après 7 jours, conservation 10 ans.

### 9.7 Redoublement et changement de classe

- Un élève peut redoubler au maximum **2 fois dans le même niveau** (configurable par école). Au-delà, alerte à l'admin qui peut forcer la décision avec justification obligatoire.
- Changement de classe en cours d'année possible (changement de filière, rééquilibrage d'effectifs), tracé dans l'historique.

### 9.8 Sortie d'un élève

Un élève **n'est jamais supprimé** : il est archivé (statut `ARCHIVE`). L'historique complet (inscriptions, notes, décisions) reste consultable même après archivage. L'archivage manuel est réservé à l'`ADMIN_SCHOOL`. Après résiliation de l'école cliente, la politique de rétention des données élève est de 12 mois.

### 9.9 Recherche, filtres et tableau de bord

- Recherche multi-critères : nom, matricule, classe, statut, année scolaire.
- Tableau de bord élèves : effectifs par niveau/classe/genre, évolution des inscriptions, taux de rétention.
- Export CSV.

### 9.10 Validations métier — inscription (synthèse)

| Règle | Détail |
|---|---|
| Unicité matricule | Unique par école et par année scolaire |
| Capacité classe | Vérification du plafond configurable |
| Doublon élève | Alerte si nom + prénom + date de naissance identiques ; blocage si matricule identique |
| Téléphone tuteur | Format `+224 XXXXXXXXX`, regex obligatoire |
| Email tuteur | Format valide si renseigné, unicité non exigée |
| Année scolaire active | Inscription possible uniquement sur une année `OUVERTE` ou `EN_COURS` |
| Note hors barème | Rejet de toute note convertie > 20 ou < 0 |
| École suspendue (soft) | Ajout d'élèves bloqué, consultation/export conservés |

### 9.11 Journalisation (actions tracées obligatoirement)

Inscription (acteur, date, classe, année), modification de profil (acteur, date, champs avant/après), saisie de note, modification d'une note déjà validée (justification obligatoire), décision de fin d'année, archivage d'un élève.

### 9.12 Cas particuliers

| Cas | Comportement attendu |
|---|---|
| Élève sans tuteur joignable | `tuteur_telephone` reste obligatoire ; numéro provisoire de l'école utilisable avec flag `contact_provisoire` |
| Élève sans acte de naissance | Inscription possible avec document en attente, statut `ATTENTE_DOCUMENTS` |
| Élève change de nom (mariage des parents, jugement) | Modification tracée avec justificatif |
| Élève inscrit tardivement | Prorata des frais, adaptation du calendrier d'évaluation |
| Double inscription | Impossible sur une même année scolaire |

### 9.13 Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/students/` | Créer un élève + enrollment initial |
| `GET` | `/students/` | Lister (filtres : classe, statut, année) |
| `GET` | `/students/{id}/` | Détail |
| `PATCH` | `/students/{id}/` | Modifier |
| `POST` | `/students/{id}/reinscription/` | Réinscrire pour une nouvelle année |
| `GET` | `/students/{id}/historique/` | Historique complet |
| `POST` | `/students/{id}/archiver/` | Archiver (ADMIN_SCHOOL) |
| `POST` | `/students/{id}/transfer-out/` | Transfert sortant |
| `POST` | `/students/transfer-in/` | Transfert entrant |
| `GET/POST` | `/students/{id}/guardians/` | Gérer les responsables légaux |
| `GET/PATCH` | `/students/{id}/medical/` | Données médicales (accès restreint) |
| `POST` | `/students/{id}/photo/` | Upload de la photo |

### 9.14 Configuration par école

| Paramètre | Valeur par défaut |
|---|---|
| `seuil_passage` | 10/20 |
| `nb_redoublements_max` | 2 |
| `capacite_max_classe` | 60 |
| `periodes_notation` | Trimestriel |
| `notification_tuteur` | Activée |
| `validation_notes_requise` | Activée |

---

## 10. Module Administration École — Personnel (staff)

### 10.1 Fiche personnel

**Informations obligatoires :** nom, prénom, date de naissance, sexe, téléphone (+224), email, fonction/rôle, date d'embauche, type de contrat.

**Informations administratives :** numéro CNSS, numéro de compte bancaire ou Mobile Money pour la paie, statut (actif/en congé/suspendu/parti).

### 10.2 Rôles et permissions

Voir la liste complète en §5.2. La matrice de permissions permet une personnalisation par rôle, avec un mécanisme d'affectation de rôles multiples pour les petites structures.

### 10.3 Spécificités enseignants

- **Informations pédagogiques** : matières enseignées, cycles, classes affectées.
- **Spécialités** : discipline(s) de spécialisation.
- **Grades** : instituteur adjoint, instituteur, professeur adjoint d'enseignement secondaire, professeur d'enseignement secondaire, professeur certifié, etc. (grille guinéenne).
- **Statut** : titulaire / contractuel / vacataire.
- **Enseignant vacataire (`GUEST_TEACHER`)** : accès restreint dans le temps (date de début/fin), limité aux matières et classes assignées ; paiement à la séance/à l'heure hors système de paie standard mais tracé.
- **Enseignant remplaçant** : affectation temporaire avec transfert des droits d'accès aux classes concernées pendant la durée du remplacement.
- **Enseignant quitte l'école** : désactivation du compte, conservation de l'historique pédagogique (notes saisies, appréciations).

### 10.4 Multi-établissements

Un enseignant vacataire peut intervenir dans plusieurs écoles : gestion multi-tenant côté personnel avec `TeacherContext` listant les établissements disponibles et un sélecteur rapide d'école (« School Switcher ») avec synchronisation préalable des données en attente.

### 10.5 Historique et désactivation

- Historique complet du personnel (affectations, évaluations, changements de statut).
- Désactivation (jamais suppression) d'un compte staff avec conservation des données d'audit.

### 10.6 Tableau de bord et sécurité

Tableau de bord personnel : effectifs par fonction, ancienneté moyenne, taux de vacataires. Permissions d'accès strictement liées au rôle et, pour les enseignants, à leurs classes/matières assignées uniquement.

### 10.7 API

`GET/POST /users/`, `PUT /users/{id}/`, `DELETE /users/{id}/`, endpoints d'affectation aux classes et de gestion des remplacements.

---
## 11. Module Matières et Programmes

### 11.1 Catalogue officiel MINEDU

Modèle `Subject` étendu : code officiel (FR, MATH, HG, PC, SVT, ANG, EPS, etc.), catégorie (Langue / Scientifique / Humaines / Sport / Civique / Technique), cycles concernés, coefficient min/max autorisé, indicateur « examen final ». Catalogue de référence : ~15 matières officielles MINEDU Guinée. Matières spéciales (Arabe, Religion) réservées aux établissements franco-arabes.

### 11.2 Configuration par classe

`ClassSubject` étendu : coefficient (dans les bornes du catalogue), heures hebdomadaires, enseignant principal + enseignant remplaçant, barème (20 par défaut, 10 possible), seuil de passage spécifique, indicateurs « optionnelle » et « examinable ».

### 11.3 Programmes et progression pédagogique [V2]

- `Syllabus` (par matière/classe, versionné, statut Brouillon/Validé) et `SyllabusChapter` (titre, ordre, compétences visées, heures prévues/réalisées, évaluations liées, documents).
- Validation du programme par le Directeur des études.
- Indicateur d'avancement (heures réalisées / heures prévues).
- Partage inter-écoles pour les réseaux (`is_shared`, `source_syllabus`).

### 11.4 API

`GET/POST /pedagogy/subjects/`, `GET /pedagogy/subjects/catalog/`, `GET/POST /pedagogy/classes/{id}/subjects/`, `GET/POST /pedagogy/syllabi/`.

---

## 12. Module Emplois du Temps

### 12.1 Contraintes métier

- **Jours ouvrés** configurables par école (lundi-vendredi ou lundi-samedi selon les établissements).
- **Contraintes dures** : pas de chevauchement enseignant / salle / classe sur un même créneau.
- **Contraintes horaires par cycle** : primaire max 6h/jour, collège/lycée max 8h/jour ; pause obligatoire après 2h (15 min), pause déjeuner après 4h (60 min).
- Types de créneaux : Cours / TD / TP / Devoir Surveillé / Conseil de classe / Récréation ; récurrence hebdomadaire ou ponctuelle (remplacement).

### 12.2 Génération automatique

- Algorithme basé sur la satisfaction de contraintes (CSP), avec appel possible à un solveur externe (ex. Google OR-Tools).
- Paramètres : année scolaire, classes concernées, mode (Équilibré / Préférences enseignants / Efficacité des salles / Pédagogique).
- Traitement asynchrone (tâche Celery), timeout de 5 minutes avec relaxation progressive des contraintes molles en cas d'échec ; polling du statut de génération.
- Prise en compte des préférences horaires déclarées par les enseignants (créneaux préférés matin/après-midi par jour).

### 12.3 Visualisation et ajustements

- Vue calendrier hebdomadaire (grille lundi→samedi × créneaux), couleur par matière.
- Détection de conflits affichée en rouge avec info-bulle explicative.
- Ajustements manuels après génération automatique, filtres par enseignant/classe/salle.

### 12.4 Historique, notifications, permissions

- Historique des modifications d'emploi du temps.
- Notification automatique en cas de changement (remplacement, annulation de cours).
- Permissions dédiées : création, modification, validation, lecture (voir §5.3).

### 12.5 API

`GET/POST /pedagogy/timetable/`, `POST /pedagogy/timetable/validate/`, `POST /pedagogy/timetable/generate/`, `GET /pedagogy/timetable/generate/{task_id}/status/`.

---

## 13. Module Présences et Absences

### 13.1 Types de présence

Présent / Absent / Absent justifié / Retard (avec minutes) / Exclu (temporairement de cours).

### 13.2 Saisie

- **Par classe** (appel du matin ou de la journée) et **par matière/enseignant** (appel à chaque cours).
- **Mode rapide** : « tous présents par défaut », un clic pour marquer absent, double-clic pour un retard.
- **Mode QR code** : scan de la carte élève pour un pointage ultra-rapide, avec feedback visuel immédiat.

### 13.3 Notifications automatiques

Absence non justifiée détectée → SMS immédiat au(x) parent(s) et au surveillant. 3 absences non justifiées en 7 jours → alerte au conseiller/censeur + convocation automatique des parents.

### 13.4 Justification des absences

- Soumission : upload d'un certificat médical ou d'un mot des parents via l'application.
- Validation : le surveillant/censeur reçoit une notification, valide ou demande un complément d'information.
- Historique conservé par élève, consultable dans la fiche élève.

### 13.5 Rapports et statistiques

Taux d'assiduité par élève/classe/période, export CSV, graphique de répartition par statut (présent/absent/retard).

### 13.6 Sécurité et automatisations

Modification d'une présence possible uniquement dans les 24h suivant la saisie (verrouillage ensuite, sauf déverrouillage justifié par un administrateur). Historique et logs conservés.

### 13.7 API

`GET/POST /pedagogy/attendances/`, endpoints enseignant `POST /teacher/attendance/` (soumission batch) et `GET /teacher/attendance/?class={id}&date={date}`.

---
## 14. Module Notes, Évaluations et Bulletins

Ce module ne couvre pas le module Présences (traité séparément) ni les examens officiels nationaux (voir §15). Le système de notation est **mixte** : note sur 20 pour la majorité des matières, coefficient variable selon la discipline et le niveau.

### 14.1 Types d'évaluation

CC (Contrôle Continu) / DS (Devoir Surveillé) / TP (Travaux Pratiques) / Participation / Oral / DR / EB — configurables par école, avec bornes de coefficient par type (ex. DS → coefficient 3 à 6, Participation → coefficient possible de 0,5).

### 14.2 Saisie des notes

- Accessible à `ADMIN_SCHOOL`, `SECRETAIRE`, `ENSEIGNANT` (pour ses matières uniquement).
- **Mode tableur** (principal) : une ligne par élève, saisie rapide, navigation clavier complète (flèches, Tab, Entrée, Ctrl+S, Ctrl+Entrée), valeur « ABS » pour un élève absent à l'évaluation.
- **Mode fiche élève** : saisie unitaire depuis la fiche de l'élève.
- **Import CSV/Excel** : téléchargement d'un modèle, upload, aperçu avant validation.
- La note est saisie dans le barème d'origine (`/20`, `/40`, `/100`) ; le système convertit automatiquement : `note_convertie = (note / note_sur) × 20`.
- Une note non validée (`valide=False`) est un brouillon visible uniquement des admins/enseignant concerné.
- Statistiques en temps réel pendant la saisie : moyenne, médiane, écart-type.
- **Détection d'anomalies** : note hors de l'intervalle interquartile (< Q1-1,5×IQR ou > Q3+1,5×IQR) → avertissement ; élève en difficulté (moyenne < 8) → suggestion de contact avec les parents.
- Code couleur : rouge < 5, orange < 10, vert ≥ 14.

### 14.3 Workflow de validation

1. **Enseignant** : saisit les notes, vérifie la cohérence (anomalies signalées), verrouille l'évaluation.
2. **Directeur des études** : consulte, valide ou renvoie pour correction (déverrouillage avec justification obligatoire, tracé en audit).
3. Une note validée ne peut plus être modifiée sauf par l'`ADMIN_SCHOOL`/Directeur des études, avec justification obligatoire journalisée.
4. Après un déverrouillage exceptionnel, une fenêtre de modification limitée (ex. 24h) s'ouvre puis se referme automatiquement.

### 14.4 Calculs automatiques

- **Moyenne par matière** : `Σ(note_convertie × coefficient) / Σ(coefficients)`. Les matières sans note saisie sont exclues du calcul (pas de zéro automatique).
- **Moyenne générale** : jamais stockée en base, toujours recalculée à la demande.
- **Arrondi académique** : au centième supérieur si le millième est ≥ 5 (12,345 → 12,35 ; 12,344 → 12,34).
- **Classement** avec règles de départage en cas d'ex-aequo, dans l'ordre : moyenne générale → nombre de mentions Très Bien → nombre de mentions Bien → moyenne en Français → moyenne en Mathématiques → ordre alphabétique.
- **Mentions automatiques** :

| Mention | Seuil |
|---|---|
| Excellent | ≥ 18/20 |
| Très Bien | 16/20 ≤ moyenne < 18/20 |
| Bien | 14/20 ≤ moyenne < 16/20 |
| Assez Bien | 12/20 ≤ moyenne < 14/20 |
| Passable | 10/20 ≤ moyenne < 12/20 |
| Insuffisant | < 10/20 |

- Appréciations automatiques par mention (texte configurable), modifiables par l'enseignant principal.

### 14.5 Corrections et audit

- Modification autorisée uniquement selon les règles ci-dessus, avec **versioning complet** de chaque note (`GradeAuditLog` : action, ancienne valeur, nouvelle valeur, auteur, date, raison, IP, session).
- Endpoint dédié de consultation de l'historique par évaluation.

### 14.6 Décision de fin d'année

**Déclenchement** : disponible uniquement quand l'année scolaire est en statut `CLOTURE_EN_COURS`. Seul l'`ADMIN_SCHOOL` peut valider (le `SECRETAIRE` peut préparer sans valider).

| Décision | Effet |
|---|---|
| `ADMIS` | Passage en classe supérieure, classe destination pré-remplie selon le parcours défini |
| `REDOUBLE` | Reste dans la même classe l'année suivante |
| `ORIENTE` | Orientation vers un autre cycle/filière (ex. vers le technique) |
| `TRANSFERE` | Sortie de l'école, statut `TRANSFERE`, document de transfert généré |
| `EXCLU` | Exclusion définitive, statut `SORTI` |

Effets automatiques après validation : moyenne annuelle calculée et archivée dans `YearEndDecision` (snapshot immuable), statut mis à jour, notification aux parents (SMS prioritaire, email secondaire). La `classe_actuelle` n'est mise à jour qu'à la réinscription effective.

### 14.7 Bulletins

- Génération PDF automatisée (tâche asynchrone pour les traitements en masse) : identité élève/école, tableau des matières avec CC/DS/moyenne/coefficient/moyenne pondérée, total des points, total des coefficients, moyenne générale, rang, appréciation du conseil de classe, signature numérique du directeur, cachet de l'école, mentions légales MINEDU.
- Objectif de performance : génération d'un bulletin pour une classe de 50 élèves en moins de 5 secondes.
- Publication officielle aux parents (application mobile) après validation finale.

### 14.8 Sécurité et intégrité

- Isolation stricte par tenant, aucune requête cross-école possible.
- Notes hors barème rejetées côté backend avec message explicite.
- Rapports disponibles : relevé de notes, classement de classe, statistiques par matière/enseignant.

### 14.9 API principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/grades/` | Saisir une note (brouillon par défaut) |
| `GET` | `/grades/` | Lister (filtres élève/matière/période/année) |
| `PATCH` | `/grades/{id}/` | Modifier une note brouillon |
| `POST` | `/grades/{id}/valider/` | Valider une note |
| `GET` | `/students/{id}/moyenne/` | Moyenne d'un élève pour une période |
| `GET` | `/students/{id}/bulletin/{period_id}/` | Données complètes du bulletin |
| `GET` | `/classes/{id}/classement/` | Classement de classe |
| `POST` | `/pedagogy/evaluations/` | Créer une évaluation |
| `PATCH` | `/pedagogy/evaluations/{id}/lock/` | Verrouiller une évaluation |
| `PATCH` | `/pedagogy/evaluations/{id}/unlock/` | Déverrouiller (justification obligatoire) |
| `GET` | `/pedagogy/evaluations/{id}/audit-log/` | Historique des modifications |
| `POST` | `/pedagogy/grades/bulk/` | Saisie en masse |
| `POST` | `/year-end-decisions/` | Créer une décision de fin d'année |
| `GET` | `/year-end-decisions/` | Lister (filtres classe/année/décision) |
| `POST` | `/promotions/bulk/` | Traitement groupé de passage/redoublement d'une classe |

---

## 15. Module Examens Officiels (CEE, BEPC, BAC)

Module dédié aux examens nationaux organisés par le MEPU-A : **CEE** (Certificat d'Études Élémentaires, fin primaire), **BEPC** (fin collège), **Baccalauréat** (fin lycée).

### 15.1 Modèles de données

- `OfficialExam` : type (CEE/BEPC/BAC), année scolaire, dates de début/fin, organisme, frais d'examen, statut.
- `ExamCandidate` : examen, élève, statut (Sélectionné / Validé / Exclu / Candidat libre), code d'anonymat, centre d'examen, salle.
- `ExamCenter` : nom, adresse, capacité, indicateur « est notre école ».

### 15.2 Processus

- Sélection automatique de tous les élèves du niveau terminal du cycle, avec validation individuelle (absence de dettes, absence d'exclusion disciplinaire).
- Génération des **codes d'anonymat** (aléatoire ou séquentiel) : la saisie des notes d'examen se fait exclusivement par code, jamais par nom.
- **Calcul final** : contrôle continu 40 % + note d'examen 60 % (pondération configurable selon la réglementation en vigueur).
- Export au format attendu par le MEPU-A (XML/CSV avec champs officiels), et import du fichier de résultats officiels en retour.
- Génération d'attestations de réussite provisoires (PDF signé numériquement) dans l'attente du diplôme officiel.

### 15.3 Interface

Section « Examens officiels » dans le module Pédagogie : liste des candidats avec indicateurs de validation (documents, dettes), interface de saisie de notes anonymisée, export MEPU-A en un clic, import des résultats avec publication automatique aux élèves, statistiques de taux de réussite par école/classe/matière.

### 15.4 API

`GET/POST /exams/`, `POST /exams/{id}/candidates/`, `POST /exams/{id}/export-mepu/`, `POST /exams/{id}/import-results/`.

---
## 16. Module Finance

### 16.1 Structure des frais

Catégories de frais (`FeeCategory`) : Inscription, Scolarité (payable en plusieurs échéances, ex. septembre/novembre/février), Cantine, Transport, Tenue, Fournitures, Sorties scolaires, Examen (transférable au MEPU-A), Garderie, Internat, Caution (remboursable en fin d'année). Chaque catégorie porte des propriétés `obligatoire` / `remboursable` / `optionnel`.

### 16.2 Modèles clés

- `StudentFee` : élève, catégorie de frais, montant total, remise, motif de remise, solde dû.
- `Invoice` : élève, année scolaire, montant dû, montant payé, solde, statut (`Pending`/`Paid`/`Overdue`), URL du PDF.
- `Payment` : élève, montant, date, mode (Espèces / Orange Money / MTN Mobile Money / Wave / Virement bancaire / Chèque / Paiement en nature), référence, agent encaisseur, statut (Pending/Completed/Failed/Cancelled), numéro de reçu unique, URL du reçu, indicateur SMS envoyé.
- `PaymentScheduleTemplate` : échéanciers réutilisables (ex. « Standard 3x », « Standard 2x », « Mensuel 10x »), avec pourcentage par échéance, taux et délai de pénalité de retard.

### 16.3 Multi-devises

- Modèle `Currency` (code, nom, symbole, taux vers GNF, date du taux) avec historisation du taux appliqué à chaque transaction.
- Arrondi à 500 GNF (absence de pièces en circulation).
- Préférence de devise par responsable légal (`Guardian.currency_preference`), avec affichage en double devise dans l'interface parent (ex. « 500 000 GNF ≈ 55 EUR »).

### 16.4 Gestion des paiements

- Modes acceptés : espèces, Mobile Money (Orange, MTN, Wave), virement bancaire, chèque, paiement en nature (avec valeur estimée, traçable comme mode spécifique).
- **Idempotence** : clé unique par transaction pour éviter tout double débit.
- Génération automatique du numéro de reçu et impression thermique (ticket 58 mm) en complément du PDF A4.
- Paiement partiel autorisé, avec mise à jour du solde en temps réel.

### 16.5 Gestion des impayés et relances automatisées

Séquence de relance automatisée (tâche Celery quotidienne) :

| Échéance | Action |
|---|---|
| J-3 | Notification push |
| J+1 | SMS |
| J+3 | SMS + Email |
| J+7 | SMS + Email + notification in-app |
| J+15 | Note interne à la direction |
| J+30 | SMS + appel téléphonique |
| J+60 | Blocage partiel (accès aux notes, configurable par catégorie de frais) |
| J+90 | Proposition de plan d'apurement sur 6 mois |
| J+180 | Mise en demeure |

Modèle `PaymentReminder` pour tracer chaque relance (canal, date, statut). Tableau de bord des impayés avec répartition par tranche de retard (J+1 à J+180).

### 16.6 Bourses et aides sociales

`Scholarship` : élève, type (Mérite / Excellence / Sociale / Enfant de personnel / Fratrie / Handicap / Exceptionnelle), montant ou pourcentage, dates de validité, statut (Demande/Étudiée/Accordée/Refusée/Renouvelée), justificatifs. Commission d'attribution (Directeur + Comptable + Directeur des études) avec vote. Application automatique sur la prochaine facture, vérification des conditions (ex. moyenne minimale pour une bourse au mérite), alerte de renouvellement à J-30.

### 16.7 Comptabilité et conformité OHADA/Syscohada

- Mapping des paiements vers le plan comptable Syscohada (comptes de classes 6 et 7).
- Journal des recettes automatique avec codes comptables, grand livre, balance, bilan simplifié.
- Export mensuel pour la DGI (recettes brutes), calcul de TVA le cas échéant.
- Rapprochement bancaire, export comptable standard.

### 16.8 Sécurité, audit et permissions

Toute opération financière est journalisée (montant, acteur, avant/après). Permissions dédiées par action : configuration des frais, lecture globale vs lecture restreinte à son propre enfant (parent), enregistrement/annulation/remboursement de paiement, génération de rapports, export OHADA.

### 16.9 API principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/finance/feecategories/` | Catégories de frais |
| `GET` | `/finance/student-fees/` | Frais d'un élève |
| `POST` | `/finance/payments/` | Enregistrer un paiement |
| `GET` | `/finance/payments/` | Lister les paiements |
| `GET` | `/finance/invoices/` | Lister les factures |
| `POST` | `/finance/invoices/{id}/generate-pdf/` | Générer le PDF d'une facture |
| `GET/POST` | `/finance/schedule-templates/` | Modèles d'échéanciers |
| `POST` | `/finance/student-fees/{id}/payment-plan/` | Créer un plan d'apurement |
| `GET/POST` | `/finance/scholarships/` | Bourses |
| `PATCH` | `/finance/scholarships/{id}/decision/` | Décision de la commission |
| `GET` | `/finance/currencies/` | Devises et taux |
| `GET` | `/finance/reports/grand-livre/` | Grand livre |
| `GET` | `/finance/reports/balance/` | Balance |
| `GET` | `/finance/reports/bilan-simplifie/` | Bilan simplifié |
| `POST` | `/webhooks/orange-money/`, `/webhooks/mtn/`, `/webhooks/wave/` | Webhooks Mobile Money |

---

## 17. Module Paie et Ressources Humaines

### 17.1 Données RH

`SalaryGrid` (grade, échelon, salaire de base, devise). Informations contractuelles du salarié : type de contrat, date d'embauche, échelon, banque/Mobile Money pour le versement.

### 17.2 Éléments de paie

**Gains :** salaire de base, prime d'ancienneté (2,5 % tous les 2 ans, plafonnée à 10 incréments), prime de responsabilité, prime de transport, prime de risque, heures supplémentaires.

**Retenues :** CNSS (5 %), AMO (2,5 %), impôt progressif DGI, avances sur salaire, absences, sanctions.

### 17.3 Modèles techniques

- `PayrollElement` (salarié, type Gain/Retenue, code, libellé, montant ou taux, calcul automatique ou manuel).
- `Payslip` (salarié, période, statut Brouillon/Validé/Payé, éléments en JSON, brut, net, date de paiement).

### 17.4 Processus mensuel

Génération automatique à J-5, vérification à J-3, validation par le directeur à J-1, paiement effectif à J. Génération en masse ou individuelle.

### 17.5 Déclarations officielles

Export de la déclaration CNSS mensuelle (format officiel), export AMO mensuel, export DAS annuel (Déclaration Annuelle des Salaires).

### 17.6 Fiche de paie (PDF)

Génération PDF de la fiche de paie individuelle avec détail des gains, retenues et net à payer, historique consultable par employé.

### 17.7 Sécurité et permissions

`payroll:config:grids`, `payroll:read:all`, `payroll:generate:draft`, `payroll:validate`, `payroll:process`, `payroll:export:cnss` — accès strictement réservé au Comptable et au Directeur.

### 17.8 API

`GET/POST /payroll/payslips/`, `POST /payroll/payslips/{id}/validate/`, `POST /payroll/payslips/batch-generate/`.

---
## 18. Module Documents et Signature Numérique

### 18.1 Génération automatique de documents officiels

Templates HTML/Jinja2 pour : attestation d'inscription, certificat de scolarité, relevé de notes trimestriel, bulletin officiel, reçu de paiement, fiche de paie, attestation de réussite provisoire, diplômes. Conversion HTML → PDF (WeasyPrint ou équivalent), génération asynchrone (Celery) pour les traitements en masse (ex. bulletins de toute une classe). Stockage **WORM** (Write Once Read Many) sur S3/MinIO pour les documents officiels signés.

### 18.2 Signature numérique et vérification publique

- Génération d'une paire de clés cryptographiques par école (RSA ou Ed25519), rotation annuelle avec conservation de l'historique pour vérifier les anciens documents.
- Calcul d'empreinte SHA-256 du PDF généré, signature avec la clé privée de l'école.
- Génération d'un **QR code** de vérification (URL + empreinte tronquée + métadonnées), tamponné visuellement sur le PDF.
- **Portail public de vérification** (`/verify/{hash}`) : saisie du hash ou scan du QR code → affichage du type de document, établissement, élève concerné, date, signataire, statut (✅ Authentique / ❌ Altéré). Toute incohérence de hash déclenche une alerte.

### 18.3 Gestion documentaire générale

- Stockage organisé par tenant/type/entité (ex. `eduguinee-prod/schools/{tenant_id}/students/{student_id}/photos/`).
- Classification par catégorie (identité, pédagogique, financier, RH, disciplinaire).
- Types supportés : PDF, images (JPG/PNG), documents Office.
- Contrôle d'accès par type de document et par rôle.
- Archivage automatique selon la politique de rétention (10 ans pour les dossiers élèves sortis, 1 an minimum pour les logs d'audit).

### 18.4 API

`POST /documents/generate/` (`{type, entity_id}` → `task_id`), `GET /documents/{id}/download/`, `GET /verify/{hash}/`.

---

## 19. Modules Infrastructures (Transport, Cantine, Internat)

### 19.1 Transport scolaire

- `Vehicle` (immatriculation, type Bus/Minibus/Van, capacité, statut, conducteur, accompagnateur, dates d'expiration assurance et contrôle technique).
- `TransportRoute` (nom, véhicule, arrêts avec coordonnées GPS et heure théorique, tarif au trajet ou au forfait).
- `StudentTransport` (élève, trajet, arrêt de montée/descente).
- Présence par trajet saisie par l'accompagnateur ; suivi GPS temps réel optionnel (WebSocket/webhook).
- Facturation au forfait (annuel/trimestriel/mensuel) ou au kilométrage.
- Alertes d'expiration d'assurance/contrôle technique à J-30.
- Interface : carte des trajets, statut des véhicules, affectation des élèves aux arrêts.

### 19.2 Cantine

- `CanteenMenu` (semaine, jour, plat principal, dessert, allergènes, coût de revient).
- `CanteenTicket` (élève, type Pack 10/Pack 20/Mensuel/Unité, solde de repas, date d'expiration).
- Prise en compte des régimes alimentaires spéciaux (lien avec `StudentMedical.regime_alimentaire`).
- Saisie de consommation par scan de carte élève ou présence manuelle, alerte de solde faible (< 3 repas).
- Gestion de stock (`CanteenStock` : produit, quantité, seuil d'alerte).

### 19.3 Internat

- `DormBuilding` et `DormRoom` (bâtiment, numéro, capacité, type Garçons/Filles/Mixte, équipement).
- `StudentDorm` (élève, chambre, dates d'affectation).
- Appel du soir (présence nocturne), permissions de sortie (`DormLeavePermission` : dates, motif, validation), suivi des entrées/sorties (badge ou signature).
- Facturation : pension complète ou demi-pension par trimestre, gestion des cautions.
- Interface : plan de l'internat avec taux d'occupation, affectation des chambres, gestion des permissions de sortie.

### 19.4 API (synthèse)

`/transport/vehicles/`, `/transport/routes/`, `/transport/assignments/`, `/cantine/menus/`, `/cantine/tickets/`, `/cantine/attendance/`, `/dorm/rooms/`, `/dorm/assignments/`, `/dorm/attendance/`, `/dorm/leave-permissions/`.

---

## 20. Module Communication Multicanale

### 20.1 Centre de messagerie intégré

Vue unifiée par famille : modèle `Message` (expéditeur, destinataire, canal SMS/WhatsApp/Email/Push/Voix/USSD, contenu, statut Envoyé/Délivré/Lu/Échoué, horodatage, fil de discussion). Timeline chronologique consultable, statuts détaillés par canal (accusé de livraison SMS, accusé de lecture WhatsApp).

### 20.2 SMS et WhatsApp Business

- **SMS** : Africa's Talking (envoi individuel et diffusion de masse), sender ID personnalisé (« EDUGUINEE »), réponses à deux voies.
- **WhatsApp Business API** (Meta) : templates approuvés (« bonjour_parent », « alerte_absence », « rappel_paiement », « bulletin_disponible »), boutons interactifs (Confirmer, Voir détails), envoi de PDF (bulletins, reçus), webhook de réception des messages entrants, modération automatique de mots-clés sensibles.
- Interface de composition multi-canal, sélection des destinataires (établissement entier / classe / élève), prévisualisation adaptée (compteur de caractères SMS vs rendu riche WhatsApp).

### 20.3 Notifications automatisées par événement

| Événement | Destinataire | Canal | Délai |
|---|---|---|---|
| Nouvelle note validée | Parent concerné | Push + SMS/WhatsApp | Immédiat |
| Absence non justifiée | Parent + surveillant | SMS + WhatsApp | Immédiat |
| Retard répété (3 en 7j) | Parent | Email + WhatsApp | J+1 |
| Paiement reçu | Parent | SMS + WhatsApp | Immédiat |
| Échéance de paiement proche | Parent | Push + WhatsApp + SMS | J-3 |
| Bulletin disponible | Parent | Push + Email + WhatsApp | Immédiat |
| Conseil de classe programmé | Tous parents de la classe | SMS | J-7 |
| Fermeture exceptionnelle (grève, intempérie) | Tous parents de l'école | SMS broadcast + voix | Immédiat |

Respect des préférences de notification déclarées par chaque responsable légal ; file d'attente avec retry (tâches Celery) ; throttling à 3 SMS/jour maximum par famille pour limiter les coûts et la sur-sollicitation.

### 20.4 Canal USSD

Menu USSD (`*144#` ou équivalent, via Africa's Talking) pour les parents sans smartphone : consulter le solde, les dernières notes, la prochaine échéance, contacter l'école, changer de langue (Français/Pular/Susu/Malinké). Gestion de session en machine à états.

---

## 21. Module Monitoring, Support et Sécurité

### 21.1 Tableau de bord Super Admin

KPI globaux (établissements actifs, alertes, usage), graphiques d'évolution, cartographie des écoles (affichage carte, localisation des campus et du transport scolaire).

### 21.2 Alertes système

Types : erreur 500, échec de synchronisation, temps de réponse élevé, stockage plein, échec de sauvegarde, abonnement expiré. Niveaux : Info / Warning / Critical, avec notification adaptée au niveau.

### 21.3 Logs d'audit

**Actions à tracer obligatoirement** : connexions, créations/modifications/suppressions de ressources sensibles (élèves, notes, paiements, permissions), changements de rôle, exports de données, accès aux données médicales, décisions de fin d'année.

**Données enregistrées** : tenant (nullable pour actions plateforme), utilisateur, action, type d'entité, ID d'entité, ancienne valeur (JSON), nouvelle valeur (JSON), adresse IP, horodatage.

**Conservation** : minimum 1 an, logs immuables (pas de modification ni suppression possible).

### 21.4 Sécurité — alertes temps réel

Voir §5.4 pour le détail des règles de détection comportementale (élévation de privilèges, usage inhabituel de permissions, accès aux données médicales, connexions hors heures, partage de session).

### 21.5 Système de tickets de support

- Création de ticket : catégorie (Technique / Facturation / Fonctionnel / Demande de fonctionnalité / Compte bloqué / Problème de paiement), priorité (Bloquant / Majeur / Mineur / Question), description, capture d'écran optionnelle.
- Statuts : Ouvert / En cours / En attente client / Résolu / Fermé.
- Assignation à un agent, fil de discussion chronologique, SLA de réponse par priorité avec suivi des délais.
- Base de connaissances (FAQ) organisée par thème, avec recherche.

### 21.6 API principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/monitoring/auditlogs/` | Logs d'audit |
| `GET` | `/monitoring/systemalerts/` | Alertes système |
| `GET` | `/monitoring/security-alerts/` | Alertes de sécurité comportementale |
| `POST/GET` | `/support/tickets/` | Créer/lister les tickets |
| `GET` | `/support/tickets/{id}/` | Détail |
| `POST` | `/support/tickets/{id}/messages/` | Ajouter un message |
| `PATCH` | `/support/tickets/{id}/assign/` | Assigner |
| `PATCH` | `/support/tickets/{id}/status/` | Changer le statut |

---

## 22. Module Analytics et IA Prédictive [ROADMAP]

### 22.1 Tableau de bord Directeur 360°

KPI agrégés (effectifs, pédagogie, finances, RH), cache court (5 min) sur les métriques calculées, indicateurs de tendance, graphique d'effectifs sur 3 ans, heatmap des absences par jour/semaine, jauge de taux d'encaissement, comparatif inter-classes, widgets filtrables par campus.

### 22.2 Prédiction de décrochage scolaire

Score de risque (0-100) calculé chaque semaine (tâche Celery) à partir des absences cumulées (pondérées récentes), retards, évolution des moyennes, notes en baisse, impayés, incidents disciplinaires. Seuils : 0-30 (vert), 31-60 (orange), 61-90 (rouge), 91-100 (noir). Actions suggérées automatiquement selon les facteurs de risque identifiés. Accès restreint au Directeur/Directeur des études.

### 22.3 Chatbot WhatsApp pour les parents [ROADMAP long terme]

FAQ automatisée, consultation de solde, rappel des prochaines échéances.

### 22.4 API

`GET /analytics/director-dashboard/`, `GET /analytics/risk-scores/`.

---
## 23. Application Enseignant (PWA)

Interface allégée, **web + mobile responsive**, conçue en PWA (Progressive Web App) pour permettre l'installation sur mobile sans passer par un store, avec un fonctionnement **offline-first robuste**.

### 23.1 Authentification et multi-établissements

Connexion email/téléphone + mot de passe, option « rester connecté 30 jours », connexion par code OTP SMS, biométrie optionnelle (Face ID/Touch ID). Stockage sécurisé : access token en mémoire, refresh token chiffré en IndexedDB. Verrouillage automatique après 5 minutes d'inactivité (configurable). Gestion multi-établissements pour les vacataires avec sélecteur rapide d'école (« School Switcher »), synchronisation préalable avant le changement.

### 23.2 Dashboard enseignant

En-tête (nom, école, statut réseau, notifications). Widget « prochain cours » avec pré-chargement des données de présence. Section « actions urgentes » : présences non saisies (rouge), notes à soumettre (orange), messages parents en attente (orange foncé). Navigation principale : Accueil / Présences / Notes / Classes / Emploi du temps / Plus. Indicateur de synchronisation (« à jour » / « N modifications en attente ») avec bouton de synchronisation manuelle. Préchargement intelligent des données des cours dans les 30 minutes à venir.

### 23.3 Saisie des présences (mode ultra-optimisé)

Mode liste standard (photo + boutons Présent/Retard/Absent), mode « présents par défaut » (clic = absent, double-clic = retard), mode QR code (scan caméra), justification tardive intégrée, **mode hors-ligne complet** avec auto-sauvegarde toutes les 10 secondes et queue de synchronisation.

### 23.4 Saisie des notes

Interface tableur avec navigation clavier complète, commentaires par élève, statistiques en temps réel, code couleur, aperçu avant soumission (distribution, alertes, comptage des absents), avertissement pré-soumission rappelant que la modification post-soumission n'est possible que par le Directeur des études, import CSV optionnel, historique des modifications.

### 23.5 Consultations

Emploi du temps personnel (vue semaine), fiche élève simplifiée (photo, infos de base, contact parent en un clic — appel/WhatsApp/email —, notes/absences/emploi du temps/messages limités à ses propres matières), documents pédagogiques.

### 23.6 Architecture technique offline (spécifique PWA)

- **Stockage local** : Dexie.js (wrapper IndexedDB) avec schéma dédié (`attendance`, `gradeDrafts`, `evaluations`, `syncQueue`).
- **Hooks dédiés** : `useOffline` (détection réseau et type de connexion 4G/3G/2G), `useSync` (synchronisation différée, auto-sync toutes les 30 secondes), `useBattery` (alerte à 15 % de batterie).
- **State management** : stores Zustand persistants (`attendanceStore`, `gradesStore`, `uiStore`).
- **Synchronisation** : file d'attente avec retry exponentiel (5 tentatives max), compression LZ-string, résolution de conflits (dernière écriture gagne, sauf note déjà validée où le serveur fait autorité), Background Sync API (~toutes les 60 secondes).
- **Installation PWA** : bannière d'installation, Service Worker avec détection de mise à jour, page de repli hors-ligne dédiée.

### 23.7 Budgets de performance

First Contentful Paint < 1,5 s (max 3 s) ; Time to Interactive < 3 s (max 5 s) ; bundle JS initial < 150 Ko gzippé (max 250 Ko) ; consommation de données < 500 Ko par session ; lazy loading des routes lourdes (présences, notes) ; mode sombre natif (économie de batterie sur écrans OLED).

### 23.8 API dédiées enseignant

`GET /teacher/me/`, `GET /teacher/students/` (cache 24h), `GET /teacher/schedule/` (cache 7j), `GET /teacher/evaluations/` (cache 1h), `POST /teacher/attendance/`, `GET /teacher/attendance/`, `POST /teacher/grades/`, `GET /teacher/messages/` (cache 15 min), `POST /teacher/messages/`.

---

## 24. Application Parent (Mobile-first)

Application mobile prioritaire, **Android en premier** (parc guinéen majoritairement Android), avec équivalent web possible en secours.

### 24.1 Authentification et onboarding

Inscription par téléphone (OTP), association à un ou plusieurs enfants (code fourni par l'école ou recherche par matricule + validation par l'établissement), **gestion multi-enfants** dans une même interface avec bascule rapide entre profils.

### 24.2 Suivi scolaire

- **Vue synthétique enfant** : photo, classe, moyenne générale actuelle, taux de présence, solde financier, dernières notifications.
- **Détail des notes** : par matière et par période, évolution graphique.
- **Détail des absences** : historique, justificatifs, statut de validation.

### 24.3 Paiements mobiles

Vue des dettes en cours (par catégorie de frais), **paiement instantané** via Orange Money/MTN/Wave directement dans l'application (redirection app opérateur ou saisie de code, ou QR code à scanner), historique des paiements avec reçus téléchargeables.

### 24.4 Communication

Messagerie avec les enseignants (par matière/classe), centre de notifications (paramétrable par type d'événement), accès aux documents (bulletins, attestations, factures).

### 24.5 Paramètres

Choix de la langue (Français/Pular/Susu/Malinké), gestion fine des préférences de notification par canal et par type d'événement, mode hors-ligne / économie de données (désactivation des photos, texte uniquement).

### 24.6 API dédiées parent

Endpoints en lecture restreints à ses propres enfants (`finances:read:own_child`, etc.), endpoint de paiement, endpoint de préférences de notification.

---

## 25. Application Élève [optionnel]

Accès web/mobile optionnel selon la politique de l'établissement (généralement activé au secondaire).

### 25.1 Fonctionnalités

- Consultation des notes (lecture seule, ses propres résultats).
- Consultation de l'emploi du temps.
- Consultation des devoirs à venir (si le module est activé par les enseignants).
- **Messagerie encadrée** : contact avec les enseignants uniquement, aucune messagerie élève-élève, modération automatique, historique archivé.

---
## 26. Modèle de données — synthèse des entités

Cette section liste les entités principales à modéliser (schéma détaillé à finaliser en migrations Django). Toutes les tables métier portent une clé étrangère `tenant_id` (et `campus_id` le cas échéant).

| Domaine | Entités principales |
|---|---|
| **Plateforme** | `Tenant`, `Campus`, `TenantNetwork`, `Plan`, `Subscription`, `Coupon`, `Invoice` (SaaS) |
| **Identité & RBAC** | `User`, `Role`, `Permission`, `Guardian` (responsable légal), `RolePermission`, `Delegation` |
| **Pédagogie — structure** | `SchoolYear`, `AcademicPeriod`, `Level`, `Filiere`, `Class`, `MixedClass`, `MixedClassLevel`, `ClassGroup`, `SubGroup` |
| **Pédagogie — matières** | `Subject`, `ClassSubject`, `Syllabus`, `SyllabusChapter` |
| **Pédagogie — emploi du temps** | `TimetableSlot` |
| **Pédagogie — présences** | `Attendance` / `AttendanceRecord` |
| **Pédagogie — notes** | `Evaluation`, `Grade`, `GradeAuditLog`, `YearEndDecision` |
| **Examens officiels** | `OfficialExam`, `ExamCandidate`, `ExamCenter` |
| **Élèves** | `Student`, `Enrollment`, `StudentMedical`, `WaitingList` |
| **Finance** | `FeeCategory`, `StudentFee`, `Payment`, `Invoice`, `PaymentScheduleTemplate`, `PaymentReminder`, `Scholarship`, `Currency` |
| **Paie & RH** | `SalaryGrid`, `PayrollElement`, `Payslip` |
| **Infrastructures** | `Vehicle`, `TransportRoute`, `StudentTransport`, `CanteenMenu`, `CanteenTicket`, `CanteenStock`, `DormBuilding`, `DormRoom`, `StudentDorm`, `DormLeavePermission` |
| **Documents** | `Document`, `SignatureNumerique` |
| **Communication** | `Message`, `NotificationPreference` |
| **Monitoring & Sécurité** | `AuditLog`, `SystemAlert`, `SecurityAlert`, `SupportTicket`, `TicketMessage` |
| **Analytics** | `RiskScore` |

### 26.1 Détail des champs clés (rappel)

**`Tenant`** — id (UUID), name, slug (unique), code_minedu, type, status (Active/Suspended/Trial/Cancelled), plan (FK), created_at, settings (JSONB), school_type, education_system, active_levels, modules activables (`has_internat`, `has_transport`, `has_cantine`, `has_bibliotheque`, `has_labo`, `has_official_exams`, `has_payroll`, `has_whatsapp`, `has_offline_advanced`, `has_predictive_analytics`), network (FK nullable).

**`Student`** — id (UUID), tenant, matricule (unique par école/année), matricule_minedu, nom, prénom, date/lieu de naissance, sexe, nationalité, photo, adresse complète + GPS, classe_actuelle (FK nullable), année d'inscription, statut, école précédente, created_by, created_at, updated_at.

**`Guardian`** — student (FK), type, nom, téléphones, email, profession, employeur, adresse, vit_avec_eleve, contact_urgence, autorisation_recuperation, garde_legale, préférences de notification (JSON), documents.

**`User`** (personnel) — id, tenant, campus, email (unique), téléphone, password_hash, nom/prénom, role (FK ou enum), custom_permissions (JSON), matières (pour enseignants), is_active, last_login, email/phone_verified.

**`Grade`** — tenant, élève, évaluation, année scolaire, période, type de note, note, note_sur (barème), note_convertie (calculée), coefficient, saisi_par, valide (bool), created_at.

**`Payment`** — tenant, élève, montant, date, mode, référence, reçu (numéro unique), agent, statut, URL du reçu, indicateur SMS envoyé.

### 26.2 Relations clés et index

- `Student.tenant_id` + `Student.matricule` → index unique composite.
- `Grade` indexé sur (`eleve`, `evaluation`), (`eleve`, `periode`, `annee_scolaire`) pour accélérer les calculs de moyenne.
- `AuditLog` indexé sur (`tenant`, `timestamp`) et (`entity_type`, `entity_id`).
- `Payment.receipt_number` unique global (ou unique par tenant selon le choix d'architecture retenu).
- Toutes les tables avec fort volume (Attendance, Grade, AuditLog, Message) doivent être partitionnées ou indexées par année scolaire pour préserver les performances sur plusieurs années d'historique.

---

## 27. Workflows métier clés

### 27.1 Inscription d'un nouvel élève

Parent se présente → secrétaire crée la fiche élève → association ou création du(des) responsable(s) légal(aux) (avec envoi SMS de confirmation de compte parent si nouveau) → sélection de la classe et affectation → calcul des frais de scolarité de l'année → paiement immédiat ou génération d'un échéancier personnalisé → impression du reçu et de l'attestation d'inscription → notification SMS aux parents → activation de l'accès à l'application mobile.

### 27.2 Saisie et validation des notes

Enseignant ouvre l'interface de saisie → saisie des notes → sauvegarde automatique locale → vérification de cohérence (anomalies) → correction si besoin → verrouillage de l'évaluation → calcul automatique des moyennes → notification aux parents des nouvelles notes → consultation par le Directeur des études → validation finale ou renvoi pour correction → publication officielle des bulletins → archivage définitif des notes.

### 27.3 Paiement Mobile Money

Parent ouvre l'application → saisie du montant et sélection de l'opérateur → appel de l'API de l'opérateur → si opérateur indisponible, proposition d'un fallback USSD → sinon redirection vers l'application mobile de l'opérateur → validation par le parent sur son téléphone → en cas d'acceptation : webhook de confirmation reçu par l'école, mise à jour du solde en temps réel, génération du reçu PDF, SMS de confirmation avec lien vers le reçu, notification au comptable → en cas d'échec : notification de l'échec avec la raison et proposition de nouvelle tentative.

### 27.4 Gestion d'une absence et de sa justification

Enseignant marque un élève absent → notification SMS immédiate au parent → si le parent justifie : upload d'un certificat médical via l'application → notification au surveillant pour validation → si validé : statut « absent justifié » ; si rejeté : demande de complément d'information → si non justifiée après un délai : le compteur d'absences non justifiées s'incrémente → à 3 absences non justifiées, alerte au conseiller principal et convocation automatique des parents.

### 27.5 Clôture de l'année scolaire (processus annuel critique)

Décision de clôture du dernier trimestre par la direction → vérification des soldes financiers → si des impayés subsistent : relances finales → une fois les paiements réconciliés : calcul des moyennes annuelles → décisions de passage en conseil de classe (Admis/Redouble/Exclu/Oriente/Transfere) → génération des bulletins définitifs → signature numérique de la direction → publication aux parents via l'application → export des statistiques pour le MINEDU → archivage de l'année active vers l'historique → préparation de l'année N+1 (copie de structure) → promotion des élèves admis vers leur nouvelle classe → réinscription automatique avec report du solde éventuel.

---

## 28. Intégrations tierces

### 28.1 Paiements Mobile Money (intégration critique)

- **Orange Money Guinée** et **MTN Mobile Money** : intégration via leurs API REST respectives, devise GNF, frais de transaction (~1,5 %) à intégrer au modèle économique.
- **Wave** : intégration similaire, en complément.
- Architecture commune : interface abstraite `PaymentProvider` (`initiate_payment()`, `check_status()`, `webhook_verify()`) avec une implémentation par opérateur.
- Idempotence par référence unique de transaction, logique de retry (3 tentatives, backoff exponentiel), réconciliation nocturne automatique (comparaison des transactions opérateur vs base interne), polling de statut en secours si le webhook échoue.
- Génération de QR codes de paiement scannables par les parents.
- Sécurité : chiffrement des clés API (Vault ou AWS Secrets Manager), whitelisting IP par opérateur.

### 28.2 Communication

- **Africa's Talking** : SMS transactionnels (absences, paiements, rappels) et passerelle USSD ; bonne couverture Orange/MTN en Guinée ; budget indicatif 500 à 1 000 SMS/mois pour une école moyenne.
- **WhatsApp Business API (Meta)** : templates approuvés, messages riches, boutons interactifs.
- **SendGrid** (ou équivalent) : emails transactionnels (bulletins, reçus, notifications), templates avec DKIM/SPF configurés.
- **Firebase Cloud Messaging** : notifications push gratuites pour l'application mobile, avec fallback SMS si la notification n'est pas délivrée sous 5 minutes.

### 28.3 Stockage et CDN

- **MinIO / AWS S3** : documents scolaires (photos, bulletins PDF), organisation par préfixe tenant/type/entité, URLs pré-signées pour l'upload et le téléchargement sécurisé, politique de cycle de vie (archivage froid après 3 ans).
- **Cloudflare** (ou équivalent) : CDN pour les assets statiques, protection anti-DDoS, SSL/TLS automatique pour les sous-domaines et domaines personnalisés.

### 28.4 Gouvernement et conformité

- **Export MINEDU/MEPU-A** : format CSV/XML standardisé, effectifs par niveau/genre/âge, résultats d'examens, fréquence annuelle (septembre) et trimestrielle (décembre, mars, juin).
- **Inspection académique** : API en lecture seule, authentification dédiée, audit trail complet des consultations.

---

## 29. Exigences non-fonctionnelles

### 29.1 Performance

- Temps de réponse API < 200 ms pour 95 % des requêtes (hors rapports lourds).
- Support de 1 000 utilisateurs simultanés par établissement de grande taille.
- Upload de fichiers : photos max 2 Mo, documents PDF max 10 Mo, timeout 30 s.
- Génération de bulletins PDF pour une classe de 50 élèves en moins de 5 secondes.
- Application PWA enseignant : bundle initial < 150 Ko gzippé (voir §23.7).

### 29.2 Disponibilité et fiabilité

- SLA cible : 99,9 % de disponibilité (max 8,76 h d'indisponibilité/an).
- Fenêtres de maintenance planifiées (02h-04h GMT), notification 48h à l'avance.
- Sauvegardes quotidiennes à 3h GMT, rétention 30 jours ; synchronisation temps réel des fichiers vers un stockage secondaire.
- Plan de reprise d'activité : RTO < 4h, RPO < 1h (idéalement < 24h en phase de démarrage).

### 29.3 Sécurité

- JWT avec rotation des refresh tokens (access 15 min, refresh 7 jours).
- RBAC + ABAC pour les cas complexes.
- Chiffrement des données sensibles au repos (AES-256, notamment données médicales et financières) et en transit (TLS 1.3).
- Hashing des mots de passe avec Argon2id.
- Masquage des numéros de téléphone dans les logs.
- Audit trail immuable de toutes les actions critiques, conservé au moins 1 an.
- Protection contre les attaques par force brute, injections SQL, XSS, CSRF.
- Test d'intrusion (pentest) annuel par un cabinet tiers.
- Conformité RGPD pour les données de citoyens européens (parents de la diaspora) et vérification de la réglementation guinéenne de protection des données personnelles.

### 29.4 Scalabilité

- Scaling horizontal (Kubernetes HPA sur CPU > 70 % ou équivalent).
- Réplicas de lecture pour les requêtes de reporting (pas sur la base maître).
- Cache Redis pour les sessions et données fréquentes (emplois du temps, KPIs).
- Alertes de capacité multi-tenant à 80 %, blocage souple à 100 %, proposition automatique d'upgrade de plan.

### 29.5 Internationalisation et accessibilité

- Langues : français (100 %), Pular/Susu (couverture prioritaire), Malinké (couverture partielle) — voir §2.2.
- Format de date `DD/MM/YYYY`, devise GNF avec séparateur de milliers (espace), fuseau GMT (pas de changement d'heure).
- **Accessibilité WCAG 2.1 niveau AA** : contraste minimum 4,5:1, zones tactiles ≥ 44×44 dp, labels ARIA sur tous les éléments interactifs, navigation clavier complète, support de `prefers-reduced-motion`, zoom texte 200 % sans perte de fonctionnalité, test avec lecteur d'écran (NVDA/VoiceOver).

### 29.6 Compatibilité et responsive

Chrome/Firefox/Edge 120+, Safari 17+ (pas de support IE). Interface fonctionnelle de 320 px à 2560 px. First Contentful Paint < 1,5 s sur connexion 3G (contexte guinéen).

---

## 30. Stack technique recommandée

### 30.1 Backend

| Composant | Choix |
|---|---|
| Framework | Django 5.x + Django REST Framework 3.x |
| Authentification | djangorestframework-simplejwt |
| Base de données | PostgreSQL 15+ (support JSONB, Row-Level Security) |
| Cache / files | Redis 7+ |
| Tâches asynchrones | Celery + django-celery-beat + django-celery-results |
| Stockage fichiers | django-storages + boto3 (S3/MinIO) |
| Documentation API | drf-spectacular (OpenAPI/Swagger) |
| Filtrage/pagination | django-filter, pagination DRF standardisée |
| Variables d'environnement | python-decouple |
| Recherche [optionnel] | Meilisearch ou Elasticsearch |

### 30.2 Frontend web (Admin École + Super Admin)

| Composant | Choix |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| UI | shadcn/ui + Tailwind CSS, Lucide icons |
| Formulaires | react-hook-form + Zod |
| Données serveur | TanStack Query v5, Axios |
| Authentification | Auth.js v5 (next-auth), cookies httpOnly |
| Graphiques | Recharts |
| PDF | react-pdf |
| i18n | next-intl |
| État global léger | Zustand |

### 30.3 Application Enseignant (PWA)

Next.js/React en mode PWA, Service Worker, Dexie.js (IndexedDB), Zustand avec persistance, LZ-string pour la compression, Background Sync API.

### 30.4 Application Parent (mobile)

Application native (Kotlin/Swift) ou solution cross-platform (React Native/Flutter) selon les ressources de l'équipe — priorité Android. Alternative pragmatique de démarrage : PWA mobile-first si les ressources natives ne sont pas disponibles en V1.

### 30.5 Infrastructure

Docker + Kubernetes (ou Docker Compose pour un démarrage plus léger), CI/CD via GitHub Actions, monitoring (Sentry pour les erreurs, Prometheus + Grafana ou Datadog pour les métriques), logs centralisés (stack ELK ou équivalent managé), hébergement cloud avec latence maîtrisée vers la Guinée (région Europe ou Afrique selon disponibilité).

---
## 31. Sécurité — synthèse transversale

- **Chiffrement par tenant** [ROADMAP] : clé de chiffrement unique générée à la création de chaque établissement, gestion des clés via Vault ou AWS KMS, rotation annuelle, chiffrement des champs les plus sensibles (données médicales, données financières personnelles).
- **Isolation stricte multi-tenant** à tous les niveaux (requêtes, fichiers, cache, files d'attente).
- **Journalisation immuable** de toute action sensible (voir §21.3).
- **Détection comportementale** en temps réel (voir §5.4).
- **Signature numérique** des documents officiels avec vérification publique (voir §18.2).
- **Sécurité applicative standard** : protection CSRF/XSS/injection SQL (ORM Django), CSP headers, dépendances auditées en continu (npm audit / Dependabot, pip-audit).
- **Frontend** : jamais de token en `localStorage`/`sessionStorage` (cookies httpOnly uniquement), vérification des permissions à la fois côté serveur (source de vérité) et côté client (UX), pas de logs sensibles en production.

---

## 32. Plan de développement, équipe et budget indicatif

> Ces éléments sont indicatifs et doivent être recalibrés avec l'équipe et le budget réellement disponibles au moment du redémarrage. Ils sont conservés ici pour donner un ordre de grandeur et une trajectoire possible.

### 32.1 Phasage proposé

**Phase 1 — Fondations (mois 1-3) :** infrastructure cloud, CI/CD, authentification multi-tenant (JWT, RBAC, 2FA), API Gateway, module Super Admin de base, module Admin École V1 (élèves, classes, utilisateurs), application Parent V1 en lecture seule, documentation API.
*Critère d'acceptation : création d'école complète en moins de 10 minutes, API < 300 ms en staging.*

**Phase 2 — Pédagogique et financier (mois 4-6) :** emploi du temps (génération + détection de conflits), notes et évaluations complètes, présences, paiements V1 (espèces + Mobile Money Orange/MTN), application Enseignant V1 (PWA), notifications SMS/push, génération PDF (bulletins, reçus, attestations), tableaux de bord de base.
*Critère d'acceptation : saisie de notes pour 50 élèves en moins de 5 minutes, bulletin PDF < 3 s, paiement Mobile Money de bout en bout < 2 minutes.*

**Phase 3 — Production et scale (mois 7-9) :** mode offline complet, multi-campus, module financier avancé (paie, comptabilité, rapprochement bancaire), application Parent V2 (paiements in-app, messagerie, langues locales), module Inspection, export MINEDU conforme, système de tickets de support, monitoring avancé.
*Critère d'acceptation : synchronisation de 100 notes en moins de 10 s en 3G, 10 écoles en production simultanée sans dégradation, zéro bug critique ouvert plus de 24h.*

**Phase 4 — Optimisation et expansion (mois 10-12) :** analytics prédictif (décrochage scolaire), chatbot WhatsApp, marketplace [roadmap long terme], API publique pour partenaires, white-label pour les réseaux d'écoles, application Élève complète, certification sécurité.
*Critère d'acceptation : NPS parents > 50, adoption enseignants > 80 % dans les écoles pilotes.*

### 32.2 Jalons clés

| Jalon | Contenu |
|---|---|
| M1 | Environnement cloud opérationnel |
| M2 | Création d'école + gestion élèves fonctionnelle |
| M3 | Application parent — consultation basique |
| M4 | Notes et présences opérationnelles |
| M5 | Premier paiement Mobile Money réussi |
| M6 | Bêta fermée — 3 écoles pilotes en production |
| M8 | Synchronisation offline stable |
| M9 | Lancement commercial |
| M12 | Capacité de scale validée, rentabilité unitaire positive |

### 32.3 Équipe recommandée

Product Owner (1), Architecte technique/Lead dev (1), Développeurs Backend (2, Django/PostgreSQL, idéalement avec expérience fintech/paiements), Développeurs Frontend (2, React/Next.js + mobile), DevOps/Cloud Engineer (1), QA Engineer (1), UI/UX Designer (1, mobile-first, i18n), Data/BI Analyst (0,5). Côté support/commercial : Customer Success (1), Commerciaux terrain (2), partenaires techniques pour l'intégration Mobile Money.

### 32.4 Budget indicatif (ordre de grandeur, à requalifier)

| Poste | Phase 1 | Phase 2 | Phase 3 | Total |
|---|---|---|---|---|
| Développement | 80k€ | 120k€ | 100k€ | 300k€ |
| Infrastructure cloud | 5k€ | 15k€ | 25k€ | 45k€ |
| Licences/outils | 3k€ | 5k€ | 8k€ | 16k€ |
| Marketing/lancement | 5k€ | 20k€ | 30k€ | 55k€ |
| Opérations/support | 10k€ | 20k€ | 30k€ | 60k€ |
| Légal/conformité | 5k€ | 5k€ | 10k€ | 20k€ |
| Fonds de roulement | — | — | 50k€ | 50k€ |
| **Total** | **108k€** | **185k€** | **253k€** | **546k€** |

*Estimation pour une équipe hybride/offshore ; à majorer significativement (+40 % environ) pour une équipe 100 % Europe de l'Ouest.*

---

## 33. Annexes

### 33.1 Glossaire

| Terme | Définition |
|---|---|
| Tenant | École cliente isolée dans le SaaS (multi-tenancy) |
| MINEDU / MEPU-A | Ministère de l'Enseignement Pré-Universitaire et de l'Alphabétisation (Guinée) |
| CEE | Certificat d'Études Élémentaires (examen fin primaire) |
| BEPC | Brevet d'Études du Premier Cycle (examen fin collège) |
| BAC | Baccalauréat (examen fin lycée) |
| CC | Contrôle Continu |
| DS | Devoir Surveillé |
| Coef | Coefficient (pondération d'une matière dans la moyenne générale) |
| GNF | Franc Guinéen (devise locale) |
| USSD | Unstructured Supplementary Service Data (codes `*#` sur téléphone) |
| OHADA / Syscohada | Organisation pour l'Harmonisation en Afrique du Droit des Affaires / son système comptable |
| CNSS / AMO | Caisse Nationale de Sécurité Sociale / Assurance Maladie Obligatoire |
| RBAC / ABAC | Role-Based / Attribute-Based Access Control |
| WORM | Write Once Read Many (politique de stockage immuable) |

### 33.2 Modèles de documents type

**Reçu de paiement (PDF) :** en-tête (logo, nom, adresse, contact de l'école), numéro de reçu unique avec QR code, date et heure, nom de l'élève et classe, montant en lettres et en chiffres, mode de paiement, signature numérique du caissier, mention légale de validité électronique.

**Bulletin trimestriel :** identité élève et école, tableau des matières (notes CC/DS, moyenne, coefficient, moyenne pondérée), total des points et des coefficients, moyenne générale, rang, appréciation du conseil de classe (avertissement travail/discipline le cas échéant), signature numérique du directeur et cachet de l'école, mentions légales MINEDU.

### 33.3 Matrice de risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Instabilité des API Mobile Money | Moyenne | Critique | Fallback USSD, cache des paiements, réconciliation manuelle en secours |
| Grèves enseignantes (fermeture d'école) | Élevée | Majeur | Fonctionnalité « mode grève », report automatique des dates |
| Coupures internet prolongées | Élevée | Majeur | Mode offline robuste, synchronisation différée, fallback SMS |
| Concurrence low-tech | Moyenne | Majeur | Différenciation par le support client et les fonctionnalités avancées |
| Changement réglementaire MINEDU | Faible | Critique | Architecture flexible, paramétrage complet des formats d'export |
| Fraude aux paiements (faux reçus) | Moyenne | Majeur | QR code de vérification, filigrane PDF, audit trail complet |

### 33.4 Checklist pré-lancement

**Technique :** test de charge (1 000 utilisateurs simultanés), test d'intrusion (OWASP Top 10), test de sauvegarde/restauration (< 4h), simulation de reprise après sinistre, audit de conformité des données personnelles.

**Métier :** formation de l'équipe support (scénarios critiques), documentation utilisateur par rôle (PDF + vidéos), checklist d'onboarding d'une école pilote, SLA de support défini et communiqué, processus d'escalade des incidents critiques.

**Commercial :** contrats de service prêts (CGV, SLA, confidentialité), tarification publiée et outil de devis, partenariats Mobile Money signés (Orange, MTN, Wave), kit marketing (présentation, démo, témoignages pilotes).

### 33.5 Prochaines étapes recommandées

1. **Validation métier** : revue avec 2-3 directeurs d'écoles guinéennes et un inspecteur académique.
2. **Validation technique** : revue d'architecture par un expert cloud SaaS indépendant.
3. **Design UX** : maquettes haute fidélité des écrans critiques (dashboard directeur, saisie de notes, paiement parent).
4. **POC paiement** : prototype d'intégration Orange Money en une semaine pour valider le flux de bout en bout.
5. **Découpage en backlog** : traduire chaque section de ce document en épics/tickets (Jira/Trello/Linear) avec la même granularité que les checklists déjà produites (backend/frontend), en gardant la priorisation V1/V2/Roadmap indiquée dans ce document.

---

*Fin du cahier des charges consolidé. Ce document remplace les versions précédentes et doit être maintenu à jour au fil de l'avancement du projet.*
