# 🗂️ Trello — Mises à Jour Eduguinée 3.0
## Basé sur : CDC Complet v1.0 + Module Enseignant v1.0

> **Stack Backend :** Django + DRF · **Stack Frontend :** Next.js 15 · shadcn/ui · TypeScript · PWA  
> **Légende :** `[x]` = Fait · `[ ]` = À faire · `[/]` = En cours  
> Ce fichier couvre **uniquement les nouvelles tâches** issues du CDC complet et du module enseignant. Les tâches déjà complétées dans les checklists existantes ne sont pas répétées.

---

## MODULE A — 🏗️ ARCHITECTURE MULTI-TENANT AVANCÉE
> _Nouveau par rapport à l'existant : multi-campus, réseau de tenants, modèle économique_

---

### 🃏 [ARCH-01] Modèle Multi-Campus
**Description :** Étendre le modèle `Tenant` pour supporter plusieurs campus géographiques par tenant.

**Checklist Backend :**
- [x] Créer modèle `Campus` (nom, adresse, coordonnées GPS, tenant FK, niveaux activés)
- [x] Ajouter FK `campus` sur modèles : `Class`, `Staff`, `TimetableSlot`, `Student`
- [x] Filtrage multi-campus dans tous les ViewSets (isolation campus)
- [x] Endpoints : `GET/POST /superadmin/schools/{id}/campuses/`
- [x] Endpoint : `PATCH /superadmin/schools/{id}/campuses/{campus_id}/`
- [x] Ajouter `campus_id` dans les claims JWT (après le `tenant_id`)
- [x] Tests inter-campus : vérifier isolation données

**Checklist Frontend :**
- [x] Sélecteur de campus dans la `TopBar` (si multi-campus activé)
- [x] Filtrage dynamique des classes/élèves selon campus sélectionné
- [x] Page de configuration campus : `/superadmin/schools/[id]/campuses`

**Labels :** `architecture` `multi-tenant` `priorité-haute`

---

### 🃏 [ARCH-02] Réseau de Tenants (Chaînes d'Écoles)
**Description :** Permettre le regroupement de plusieurs tenants en un réseau avec reporting consolidé.

**Checklist Backend :**
- [x] Créer modèle `TenantNetwork` (nom, description, admin_network)
- [x] Association `Tenant.network` FK nullable
- [x] Rôle `NETWORK_ADMIN` avec accès lecture agrégée sur ses tenants
- [x] Endpoint : `GET /network/dashboard/` → KPIs agrégés (effectifs, CA, taux réussite)
- [x] Endpoint : `GET /network/schools/` → liste écoles du réseau
- [ ] Partage de programmes pédagogiques inter-écoles (optionnel)

**Labels :** `architecture` `multi-tenant`

---

### 🃏 [ARCH-03] Configuration Avancée par Tenant
**Description :** Implémenter le panneau de configuration maître de chaque tenant (CDC §1.4).

**Checklist Backend :**
- [x] Étendre modèle `Tenant` : `logo`, `code_minedu`, `nif`, `registre_commerce`
- [x] Champs localisation : `timezone`, `date_format`, `first_day_week`, `default_lang`
- [x] Champs éducatifs : `education_system` (Guinéen/Franco-arabe/IB/Mixte), `active_levels`, `exams_prepared`
- [x] Modules activables : `has_internat`, `has_transport`, `has_cantine`, `has_bibliotheque`, `has_labo`, `has_official_exams`, `has_payroll`, `has_whatsapp`, `has_offline_advanced`, `has_predictive_analytics`
- [x] Endpoint : `GET/PATCH /settings/tenant/` (Directeur uniquement)
- [x] Serializer de validation par modules

**Checklist Frontend :**
- [x] Page `/app/settings/tenant` avec formulaire multi-section
- [x] Section "Identité" : logo upload, nom, code MINEDU, NIF
- [x] Section "Localisation" : fuseau, format date, langue par défaut, devises
- [x] Section "Éducation" : système éducatif, niveaux actifs, examens
- [x] Section "Modules" : toggle switches par module (avec indication plan requis)

**Labels :** `configuration` `tenant` `superadmin`

---

### 🃏 [ARCH-04] Modèle Économique et Plans Avancés
**Description :** Étendre la gestion des plans selon le CDC (§1.3).

**Checklist Backend :**
- [ ] Étendre modèle `Plan` : `plan_type` (individual/standard/network/ministry/international), `max_campuses`, `max_students`, `modules_included`, `price_per_student`
- [ ] Logique de facturation par élève (pour plans réseau)
- [ ] Endpoint contrôle de limites : middleware qui vérifie `max_students` et `max_campuses` avant création

**Labels :** `plans` `billing`

---

## MODULE B — 🏫 TYPES D'ÉTABLISSEMENTS ET NIVEAUX COMPLETS
> _Nouveau : couverture complète du système éducatif guinéen, filières, classes mixtes_

---

### 🃏 [EDU-01] Catalogue Complet des Niveaux Éducatifs
**Description :** Implémenter tous les cycles du système éducatif guinéen (CDC §2.1).

**Checklist Backend :**
- [ ] Étendre modèle `Level` : `cycle` (MATERNELLE/PRIMAIRE/CQP/COLLEGE/LYCEE_GEN/LYCEE_TECH/ETFP_A/ETFP_B), `code_officiel_minedu`, `age_min`, `age_max`, `diplome_final`, `duree_annees`
- [ ] Spécificité maternelle : `evaluation_type = 'DESCRIPTIVE'` (pas de notes chiffrées)
- [ ] Données initiales (fixtures) : TPS, PS, MS, GS / CP1→CM2 / 6ème→3ème / 2nde→Tle / BEP, CAP, BTS
- [ ] Endpoint : `GET /pedagogy/levels/` avec filtre par `cycle`

**Checklist Frontend :**
- [ ] Page `/app/pedagogy/levels` : liste par cycle avec icônes
- [ ] Création de niveau avec sélecteur de cycle et type d'évaluation

**Labels :** `pédagogie` `niveaux`

---

### 🃏 [EDU-02] Types d'Établissements et Configurations
**Description :** Gérer les types d'établissements configurables (CDC §2.2).

**Checklist Backend :**
- [ ] Étendre modèle `Tenant` : `school_type` (PUB/PRIV/FRAR/ETP/ETPR/INT/COM/INC)
- [ ] Mapping `school_type` → modules requis automatiquement activés
- [ ] Restrictions spécifiques : école publique → pas de module paie (CNSS standard)

**Labels :** `configuration`

---

### 🃏 [EDU-03] Gestion des Filières
**Description :** Implémenter les filières secondaires et supérieures (CDC §2.3).

**Checklist Backend :**
- [ ] Créer modèle `Filiere` (code, nom, cycle, matières_dominantes)
- [ ] Filières prédéfinies : S, L, SE, SM, SS (Lycée Général) / T1, T2, T3, T4 (Technique) / BEP, CAP, BTS
- [ ] Association `Class.filiere` FK nullable
- [ ] Filtrage des matières disponibles selon filière

**Checklist Frontend :**
- [ ] Sélecteur filière dans le formulaire de création de classe
- [ ] Filtre par filière dans la liste des classes

**Labels :** `pédagogie` `filières`

---

### 🃏 [EDU-04] Classes Mixtes (Spécificité Guinée Rurale)
**Description :** Gérer les classes physiques accueillant plusieurs niveaux (CDC §5.2).

**Checklist Backend :**
- [ ] Créer modèle `MixedClass` (classe_physique, classes_logiques M2M, type_mixte, répartition)
- [ ] Présences prises sur classe physique, notes sur classe logique
- [ ] Validation : max 3 niveaux par classe mixte, sinon validation inspection requise
- [ ] Emploi du temps adapté (alternance)

**Checklist Frontend :**
- [ ] Option "Classe mixte" dans la création de classe
- [ ] Interface de sélection des niveaux combinés
- [ ] Avertissement si > 2 niveaux : "Validation inspection requise"

**Labels :** `pédagogie` `classes-mixtes`

---

### 🃏 [EDU-05] Groupes et Sous-Groupes de Classe
**Description :** Implémenter les groupes de TD/TP et sous-groupes (CDC §5.1).

**Checklist Backend :**
- [ ] Créer modèle `ClassGroup` (type: TD/TP/LANGUE, classe_mere FK, capacite, enseignant, horaire_specifique)
- [ ] Créer modèle `SubGroup` (type: NIVEAU_COMBINE/FILIERE_PARTAGEE, classes M2M)
- [ ] Association `TimetableSlot.group` FK nullable
- [ ] Endpoints CRUD : `GET/POST /pedagogy/classes/{id}/groups/`

**Labels :** `pédagogie` `groupes`

---

## MODULE C — 📴 MODE OFFLINE ET SYNCHRONISATION
> _Nouveau : architecture offline-first, LAN, gestion conflits avancée_

---

### 🃏 [OFFLINE-01] Architecture Offline Backend (API Sync)
**Description :** Mettre en place les endpoints de synchronisation pour le mode offline (CDC §3.3).

**Checklist Backend :**
- [ ] Ajouter champ `updated_at` avec auto-update sur tous les modèles critiques
- [ ] Ajouter champ `version` (integer) sur `AttendanceRecord`, `Grade` pour détection conflits
- [ ] Endpoint : `POST /sync/push/` → reçoit batch de modifications offline, retourne conflicts
- [ ] Endpoint : `GET /sync/pull/?since={timestamp}` → retourne delta depuis dernière sync
- [ ] Logique de résolution conflits : LAST_WRITE_WINS pour présences, SERVER_WINS pour notes validées
- [ ] File d'attente sync avec priorité : Paiements > Présences > Notes > Messages
- [ ] Endpoint : `GET /sync/status/` → état de la file d'attente

**Labels :** `offline` `sync` `priorité-haute`

---

### 🃏 [OFFLINE-02] Déploiement LAN Local
**Description :** Préparer la configuration pour déploiement sur serveur local (CDC §3.4).

**Checklist Backend :**
- [ ] Script Docker Compose pour déploiement LAN (Raspberry Pi / mini-PC)
- [ ] Configuration PostgreSQL local avec sync vers cloud
- [ ] Mode `LAN_MODE` dans `.env` : désactive certaines features cloud-only
- [ ] Endpoint health check : `GET /health/` → retourne mode (CLOUD/LAN/HYBRID)
- [ ] Documentation déploiement LAN

**Labels :** `offline` `infra` `déploiement`

---

### 🃏 [OFFLINE-03] PWA Enseignant — Infrastructure Offline
**Description :** Implémenter la PWA offline-first pour les enseignants (Module Enseignant §2).

**Checklist Frontend (PWA) :**
- [ ] Initialiser projet `teacher-app/` : React 18 + TypeScript + Vite + Tailwind
- [ ] Configurer `manifest.json` (PWA installable)
- [ ] Créer `sw.js` (Service Worker) avec stratégie Cache First pour assets statiques
- [ ] Installer et configurer `Dexie.js` (IndexedDB wrapper)
- [ ] Définir schéma IndexedDB : `students`, `attendance`, `gradeDrafts`, `evaluations`, `syncQueue`
- [ ] Hook `useOffline.ts` : détection état réseau en temps réel
- [ ] Hook `useSync.ts` : logique de synchronisation différée
- [ ] Hook `useBattery.ts` : monitoring batterie (alertes à 15%)
- [ ] Store Zustand : `authStore`, `attendanceStore`, `gradesStore`, `uiStore`
- [ ] Service `syncQueue.ts` : file d'attente avec retry exponentiel
- [ ] Service `conflictResolver.ts` : résolution LAST_WRITE_WINS / SERVER_WINS / MANUAL
- [ ] Compression données avant stockage local (LZ-string)
- [ ] Background Sync API + Workbox configuration

**Labels :** `pwa` `offline` `enseignant` `priorité-haute`

---

### 🃏 [OFFLINE-04] PWA Enseignant — Authentification & Multi-École
**Description :** Authentification enseignant avec support multi-établissements (Module Enseignant §3).

**Checklist Frontend (PWA) :**
- [ ] Page de connexion : email/téléphone + mot de passe + "Rester connecté 30 jours"
- [ ] Option "Se connecter avec code SMS" (OTP)
- [ ] Stockage sécurisé : access token en mémoire, refresh token en IndexedDB chiffré
- [ ] Auto-lock après 5min d'inactivité (configurable)
- [ ] Gestion multi-établissements : `TeacherContext` avec `availableTenants`
- [ ] Composant `SchoolSwitcher` : switch rapide entre écoles avec sync préalable
- [ ] Support Biométrie : Face ID / Touch ID si disponible (optionnel)
- [ ] Endpoint backend : `GET /teacher/me/` → profil + assignments

**Labels :** `pwa` `auth` `enseignant`

---

### 🃏 [OFFLINE-05] PWA Enseignant — Dashboard
**Description :** Dashboard enseignant avec actions urgentes (Module Enseignant §4).

**Checklist Frontend (PWA) :**
- [ ] Header : nom enseignant, école, statut réseau (🟢/🔴), badge notifications
- [ ] Widget "Prochain cours" : heure, classe, salle, bouton présences pré-chargées
- [ ] Section "Actions urgentes" : présences non saisies (🔴), notes à soumettre (🟡), messages parents (🟠)
- [ ] Navigation principale : Accueil / Présences / Notes / Classes / Emploi / Plus
- [ ] Widget activité semaine : présences saisies X/X, notes en cours
- [ ] Indicateur sync : "À jour" / "12 modifs en attente" + bouton sync manuelle
- [ ] Prefetch intelligent : précharger données des prochains cours (dans les 30min)

**Labels :** `pwa` `dashboard` `enseignant`

---

### 🃏 [OFFLINE-06] PWA Enseignant — Gestion des Présences
**Description :** Interface d'appel offline-first (Module Enseignant §5).

**Checklist Frontend (PWA) :**
- [ ] Mode liste : photo élève + boutons P/Retard/Absent, saisie minutes retard
- [ ] Mode "Présents par défaut" : tous présents, clic = absent, double-clic = retard
- [ ] Mode QR Code : caméra scan, feedback visuel, liste des derniers scans
- [ ] Auto-save toutes les 10 secondes (brouillon IndexedDB)
- [ ] Barre de statut : Effectif / Présents / Absents / Retards en temps réel
- [ ] Validation : alerte si < 50% de la classe saisie avant soumission
- [ ] Soumission offline : stockage local + queue sync + notification utilisateur
- [ ] Historique présences avec stats (94% présents / 3% absents)
- [ ] Interface justifications : voir document, valider/refuser avec raison
- [ ] Modification sous 24h seulement, verrouillage après

**Checklist Backend :**
- [ ] Endpoints enseignant : `POST /teacher/attendance/` (soumission batch)
- [ ] `GET /teacher/attendance/?class={id}&date={date}` (consultation)
- [ ] Validation : permissions `attendance:create` limitées à sa classe

**Labels :** `pwa` `présences` `offline` `enseignant`

---

### 🃏 [OFFLINE-07] PWA Enseignant — Saisie des Notes
**Description :** Interface tableur notes avec détection anomalies (Module Enseignant §6).

**Checklist Frontend (PWA) :**
- [ ] Interface tableur : numéro, nom élève, note saisie, commentaire, indicateur statut
- [ ] Navigation clavier complète : ↑↓←→, Tab, Entrée, Ctrl+S, Ctrl+Enter
- [ ] Saisie décimales (12.5), valeur "ABS" pour absent
- [ ] Stats auto en temps réel : moyenne, médiane, σ
- [ ] Détection anomalies : note < Q1-1.5IQR ou > Q3+1.5IQR → avertissement
- [ ] Alerte élève en difficulté (moyenne < 8) : suggestion contact parents
- [ ] Code couleur : rouge < 5, orange < 10, vert ≥ 14
- [ ] Auto-save brouillon IndexedDB toutes les 10s
- [ ] Aperçu avant soumission : distribution, alertes, comptage ABS
- [ ] Avertissement pré-soumission : "Après soumission, modification uniquement par Directeur des Études"
- [ ] Import CSV optionnel

**Checklist Backend :**
- [ ] Endpoint : `POST /teacher/grades/` (soumission notes en batch)
- [ ] `GET /teacher/evaluations/` → évaluations à saisir (cache 1h)
- [ ] Validation anomalies côté serveur (doublon de vérification)

**Labels :** `pwa` `notes` `offline` `enseignant`

---

### 🃏 [OFFLINE-08] PWA Enseignant — Consultations & Communication
**Description :** Fiche élève simplifiée et messagerie parents (Module Enseignant §7-8).

**Checklist Frontend (PWA) :**
- [ ] Fiche élève : photo, infos de base, contact parent (appel/WhatsApp/email)
- [ ] Onglets fiche : Notes / Absences / Emploi / Messages
- [ ] Vue moyennes trimestre avec code couleur par matière (uniquement ses matières)
- [ ] Graphique évolution sparkline T1→T2→T3
- [ ] Emploi du temps personnel : vue semaine (grille), indicateurs modification récente
- [ ] Messagerie parents : conversations par famille, SLA 48h affiché
- [ ] Restrictions : pas de partage données médicales, modération mots-clés sensibles
- [ ] Archivage 2 ans minimum

**Checklist Backend :**
- [ ] `GET /teacher/students/` → élèves des classes (champs minimaux, cache 24h)
- [ ] `GET /teacher/schedule/` → emploi du temps (cache 7j)
- [ ] `GET /teacher/messages/` → messages parents (cache 15min)
- [ ] `POST /teacher/messages/` → envoi message parent
- [ ] Permissions : `students:read:basic?class=own` seulement

**Labels :** `pwa` `communication` `enseignant`

---

## MODULE D — 📅 ANNÉES SCOLAIRES ET PÉRIODES AVANCÉES
> _Nouveau : trimestres, sous-périodes, workflow de clôture avancé_

---

### 🃏 [YEAR-01] Gestion des Trimestres/Périodes
**Description :** Implémenter la structure temporelle complète avec trimestres (CDC §4.1).

**Checklist Backend :**
- [ ] Créer modèle `AcademicPeriod` (school_year FK, nom, type: TRIMESTRE/SEMESTRE/QUARTER/UNIT, date_debut, date_fin, statut, order)
- [ ] Validation : pas de chevauchement de périodes pour une même année
- [ ] Endpoints : `GET/POST /pedagogy/school-years/{id}/periods/`
- [ ] `PATCH /pedagogy/periods/{id}/close/` → clôture période

**Checklist Frontend :**
- [ ] Section "Périodes" dans la page de détail d'une année scolaire
- [ ] Timeline visuelle des périodes (Gantt simplifié)
- [ ] Bouton "Clôturer trimestre" avec `ConfirmDialog`

**Labels :** `pédagogie` `années-scolaires`

---

### 🃏 [YEAR-02] Workflow de Clôture Annuelle
**Description :** Implémenter la checklist de clôture obligatoire (CDC §4.2).

**Checklist Backend :**
- [ ] Endpoint : `GET /pedagogy/school-years/{id}/closure-checklist/` → état de chaque critère
- [ ] Critères vérifiés automatiquement : tous bulletins générés, tous trimestres clôturés, archive cloud
- [ ] Critères manuels : décisions de passage saisies, soldes soldés, rapprochement bancaire, année N+1 préparée
- [ ] `POST /pedagogy/school-years/{id}/close/` → bloqué si critères bloquants non remplis
- [ ] Logique préparation année N+1 : copie structure classes (sans élèves), matières, coefficients, enseignants

**Checklist Frontend :**
- [ ] Page `/app/pedagogy/school-years/[id]/closure` avec checklist visuelle (✅/❌/⚠️)
- [ ] Progress bar de clôture (critères validés / total)
- [ ] Bouton "Préparer Année N+1" déclenche la copie de structure
- [ ] Blocage UI sur "Clôturer" si critères bloquants ❌

**Labels :** `pédagogie` `clôture` `années-scolaires`

---

## MODULE E — 👥 GESTION DES ÉLÈVES AVANCÉE
> _Nouveau : fiche complète, responsables légaux, médical, workflow inscription 5 étapes, transferts_

---

### 🃏 [STUDENT-01] Fiche Élève Complète (Extended)
**Description :** Étendre le modèle Student avec tous les champs du CDC §6.1.

**Checklist Backend :**
- [ ] Étendre `Student` : `matricule_minedu`, `nationalite`, `genre` (M/F/AUTRE/NON_PRECISE), `photo`, `adresse_complete`, `quartier`, `secteur`, `commune`, `prefecture`, `coordonnees_gps`
- [ ] `Ecole_precedente` : nom, localisation, type, classe_precedente, moyenne_precedente, raison_transfert
- [ ] Statuts : ACTIF / TRANSFERT_SORTANT / DIPLOME / EXCLU / DECE
- [ ] Format matricule étendu : `EDG-AAAA-NNNNNNN` (7 chiffres)
- [ ] Endpoint : `POST /students/{id}/photo/` (upload photo)

**Checklist Frontend :**
- [ ] Formulaire élève : onglet "Identité" avec tous les nouveaux champs
- [ ] Onglet "Localisation" : adresse complète + carte GPS optionnelle
- [ ] Onglet "Origine scolaire" : école précédente, documents de transfert (upload)
- [ ] Avatar élève avec aperçu photo

**Labels :** `élèves` `fiche-élève`

---

### 🃏 [STUDENT-02] Responsables Légaux (Multi-Parents)
**Description :** Gérer jusqu'à 4 responsables par élève (CDC §6.2).

**Checklist Backend :**
- [ ] Créer modèle `Guardian` (student FK, type: PERE/MERE/TUTEUR/AUTRE, nom, telephone_principal, telephone_secondaire, email, profession, employeur, adresse, vit_avec_eleve, contact_urgence, autorisation_recuperation, garde_legale)
- [ ] `Guardian.preferences_notification` : JSON (sms_notes, sms_absences, sms_factures, langue)
- [ ] Documents : `Guardian.piece_identite`, `Guardian.jugement_garde`, `Guardian.acte_deces`
- [ ] Validation : minimum 1 responsable, au moins 1 contact urgence
- [ ] Endpoints : `GET/POST /students/{id}/guardians/` + `PATCH/DELETE /students/{id}/guardians/{g_id}/`

**Checklist Frontend :**
- [ ] Section "Responsables légaux" dans la fiche élève
- [ ] Formulaire ajout responsable avec tous les champs
- [ ] Upload documents responsable
- [ ] Indicateurs : icône "Contact urgence" ☎️, icône "Garde légale" ⚖️
- [ ] Préférences notification par responsable (toggles SMS/Email par type)

**Labels :** `élèves` `responsables`

---

### 🃏 [STUDENT-03] Données Médicales et d'Urgence
**Description :** Gérer les informations médicales avec accès restreint (CDC §6.3).

**Checklist Backend :**
- [ ] Créer modèle `StudentMedical` (student 1-1, groupe_sanguin, allergies JSON, maladies_chroniques JSON, medicaments JSON, handicap, regime_alimentaire, vaccinations JSON, certificat_medical, hopital_prefere, medecin_traitant, assurance_maladie, autorisation_traitement_urgence, autorisation_medicaments)
- [ ] Permissions spécifiques : `eleves:read:medical` → DIRECTOR, NURSE, SUPERVISOR (contact urgence + allergies uniquement)
- [ ] Log d'accès audité sur chaque lecture données médicales
- [ ] Endpoint séparé : `GET/PATCH /students/{id}/medical/`

**Checklist Frontend :**
- [ ] Onglet "Médical" dans la fiche élève (affiché seulement si permission)
- [ ] Avertissement visuel : "Accès aux données médicales est audité"
- [ ] Champs allergies et maladies : tags multi-valeurs
- [ ] Affichage restreint pour Superviseur : allergies + contact urgence uniquement

**Labels :** `élèves` `médical` `sécurité`

---

### 🃏 [STUDENT-04] Workflow d'Inscription en 5 Étapes
**Description :** Implémenter le processus complet d'inscription (CDC §6.4).

**Checklist Backend :**
- [ ] Statuts d'inscription : PRE_INSCRIPTION / ATTENTE_DOCUMENTS / DOCUMENTS_COMPLETS / CLASSE_ASSIGNEE / ACTIF
- [ ] Étape 1 : Pré-inscription → vérification doublon (nom+prénom+date naissance), génération matricule provisoire `EDG-TEMP-XXXXX`
- [ ] Étape 2 : Validation documents → liste requise selon type (Nouveau/Transfert/Réinscription), OCR optionnel
- [ ] Étape 3 : Test de niveau (pour transferts hors système guinéen) → résultat: CONFIRME/AJUSTE/REFUS
- [ ] Étape 4 : Affectation classe → vérification capacité, alerte 90%, blocage à 100% (sauf validation directeur +5%)
- [ ] Étape 5 : Configuration financière → calcul frais, application bourse, échéancier, paiement 40% minimum, génération matricule définitif, création compte parent, génération carte QR
- [ ] Attestation d'inscription signée numériquement (PDF)

**Checklist Frontend :**
- [ ] Wizard multi-étapes `/app/students/new` avec stepper visuel
- [ ] Indicateur de progression (étapes 1-5 avec statut ✅/⏳/❌)
- [ ] Étape 1 : formulaire de base + détection doublon en temps réel
- [ ] Étape 2 : checklist documents avec statut + upload fichiers
- [ ] Étape 3 : formulaire résultat test niveau (si applicable)
- [ ] Étape 4 : sélecteur de classe avec indicateur de capacité (jauge)
- [ ] Étape 5 : récapitulatif financier, sélection plan paiement, confirmation
- [ ] Génération et téléchargement attestation PDF

**Labels :** `élèves` `inscription` `workflow` `priorité-haute`

---

### 🃏 [STUDENT-05] Transferts Entrants et Sortants
**Description :** Implémenter la gestion complète des transferts (CDC §6.6).

**Checklist Backend :**
- [ ] Transfert entrant : mapping matières (système étranger → guinéen), création évaluations historiques non modifiables
- [ ] Transfert sortant : vérification solde = 0 obligatoire (ou plan apurement), génération documents sortie
- [ ] Documents de sortie : certificat scolarité "Sorti le...", relevé de notes complet, bulletin dernier trimestre, lettre de recommandation (sur demande)
- [ ] Clôture dossier : archivage après 7 jours, conservation 10 ans
- [ ] Endpoints : `POST /students/{id}/transfer-out/` + `POST /students/transfer-in/`

**Checklist Frontend :**
- [ ] Modal "Demande de transfert sortant" : vérification soldes, upload documents
- [ ] Alerte si solde > 0 : "Régulariser avant transfert ou créer plan d'apurement"
- [ ] Page génération documents de sortie avec sélection
- [ ] Formulaire transfert entrant : mapping matières

**Labels :** `élèves` `transferts`

---

### 🃏 [STUDENT-06] Alertes Capacité et Liste d'Attente
**Description :** Gérer la capacité des classes avec liste d'attente (CDC §5.3).

**Checklist Backend :**
- [ ] Calcul taux de remplissage auto sur `Class.current_count / Class.max_capacity`
- [ ] Alertes : 90% → WARNING, 100% → blocage inscription (sauf directeur +5%)
- [ ] Suggestion automatique : si classe A pleine → proposer classe B même niveau
- [ ] Créer modèle `WaitingList` (student, class_target, priorité, date_ajout)
- [ ] Alerte direction si liste > 10 élèves : proposer ouverture nouvelle classe
- [ ] Endpoint : `GET /pedagogy/classes/{id}/waiting-list/`

**Checklist Frontend :**
- [ ] Jauge de capacité sur chaque card de classe
- [ ] Toast rouge si classe pleine, proposition alternatives
- [ ] Section "Liste d'attente" dans la page détail classe

**Labels :** `élèves` `classes` `capacité`

---

## MODULE F — 👔 PERSONNEL ET RBAC AVANCÉ
> _Nouveau : rôles avancés, ABAC, délégations, fiche personnel complète_

---

### 🃏 [RBAC-01] Rôles Système et Tenant Complets
**Description :** Implémenter tous les rôles définis dans le CDC §7.2-7.5.

**Checklist Backend :**
- [ ] Rôles tenant à ajouter : `DEPUTY_DIRECTOR`, `STUDIES_DIRECTOR`, `CENSOR`, `NURSE`, `LIBRARIAN`, `TRANSPORT_MANAGER`, `CANTEEN_MANAGER`, `DORM_MANAGER`, `HEAD_TEACHER`, `GUEST_TEACHER`
- [ ] Rôles spécifiques Guinée : `CLASS_REP`, `PTA_PRESIDENT`, `INSPECTOR`, `CNSS_AGENT`, `MOBILE_COLLECTOR`
- [ ] Rôles composites : `SECRETARY_ACCOUNTANT`, `SUPERVISOR_CENSOR`, `TEACHER_HEAD_CLASS`, `ALL_IN_ONE_SMALL`
- [ ] Mapping permissions complet selon matrices CDC §7.6 pour chaque module
- [ ] `GUEST_TEACHER` : restriction temporelle (date_debut, date_fin), matières assignées uniquement

**Labels :** `rbac` `rôles` `priorité-haute`

---

### 🃏 [RBAC-02] Permissions Granulaires par Module
**Description :** Implémenter toutes les permissions des matrices CDC §7.6.

**Checklist Backend :**
- [ ] Module Élèves : `eleves:create`, `eleves:read:full`, `eleves:read:basic`, `eleves:read:medical`, `eleves:update:identity`, `eleves:update:medical`, `eleves:update:photo`, `eleves:transfer:in`, `eleves:transfer:out`, `eleves:export`, `eleves:delete`
- [ ] Module Notes : `notes:create:evaluation`, `notes:read:all`, `notes:read:own_subject`, `notes:update:draft`, `notes:validate`, `notes:lock`, `notes:unlock`
- [ ] Module Finances : `finances:config:fees`, `finances:read:all`, `finances:read:own_child`, `finances:payment:record`, `finances:payment:cancel`, `finances:payment:refund`, `finances:report:generate`, `finances:export:ohada`
- [ ] Module Présences : `attendance:create`, `attendance:read:all`, `attendance:validate:justif`, `attendance:export`
- [ ] Module EDT : `timetable:create`, `timetable:update`, `timetable:validate`, `timetable:read:all`
- [ ] Module Communication : `comm:send:broadcast`, `comm:send:class`, `comm:send:private`, `comm:read:all`, `comm:read:own`
- [ ] Module Documents : `docs:generate:all`, `docs:sign:official`, `docs:sign:pedagogical`, `docs:sign:financial`
- [ ] Module Paie : `payroll:config:grids`, `payroll:read:all`, `payroll:generate:draft`, `payroll:validate`, `payroll:process`, `payroll:export:cnss`
- [ ] Module Infra : `infra:transport:manage`, `infra:cantine:manage`, `infra:dorm:manage`
- [ ] Endpoint : `GET /auth/permissions/me` → liste complète permissions avec restrictions

**Labels :** `rbac` `permissions`

---

### 🃏 [RBAC-03] ABAC — Conditions Dynamiques
**Description :** Implémenter les conditions d'accès contextuelles (CDC §7.9).

**Checklist Backend :**
- [ ] Conditions temporelles : `time_between` (ex: 07:00-20:00)
- [ ] Conditions de localisation : `campus_assigned`, `ip_whitelist`
- [ ] Condition MFA : `mfa_required_for` (ex: `finances:payment:record`, `notes:lock`)
- [ ] Condition type connexion : adaptation selon `connection_quality` (2G/3G/WiFi)
- [ ] Condition type école : `school_type` → certaines permissions désactivées (école publique → pas paie)
- [ ] Middleware ABAC : évaluation conditions à chaque requête sensible

**Labels :** `rbac` `abac` `sécurité`

---

### 🃏 [RBAC-04] Constructeur de Rôles Personnalisés
**Description :** Interface de création de rôles sur mesure (CDC §7.7).

**Checklist Backend :**
- [ ] Endpoint : `POST /settings/roles/` → création rôle custom avec héritage
- [ ] Champs : `name`, `parent_role` (héritage), `added_permissions`, `removed_permissions`, `campus_restriction`, `subjects_restriction`, `time_restriction`, `max_actions_per_day`
- [ ] Validation : les permissions supprimées ne peuvent pas dépasser l'héritage
- [ ] `GET/PUT/DELETE /settings/roles/{id}/`

**Checklist Frontend :**
- [ ] Page `/app/settings/roles` : liste des rôles (standards + customs)
- [ ] Formulaire "Nouveau rôle" : héritage, permissions checkboxes par module
- [ ] Restrictions contextuelles : campus, matières, horaires, plafond actions
- [ ] Permissions "retirées" vs héritage clairement visualisées
- [ ] Bouton "Dupliquer rôle existant" pour partir d'une base

**Labels :** `rbac` `rôles-custom` `frontend`

---

### 🃏 [RBAC-05] Délégations et Intérims
**Description :** Gérer les délégations temporaires de permissions (CDC §7.11).

**Checklist Backend :**
- [ ] Créer modèle `Delegation` (delegateur FK, delegue FK, date_debut, date_fin, permissions_delegees JSON)
- [ ] Validation : ne peut pas déléguer plus que ses propres permissions
- [ ] Activation auto à `date_debut`, révocation auto à `date_fin`
- [ ] Log complet des actions effectuées sous délégation
- [ ] Notification automatique au délégué + au délégateur en début/fin
- [ ] Endpoints : `GET/POST /settings/delegations/` + `DELETE /settings/delegations/{id}/`
- [ ] Rapport actions effectuées pendant délégation (à la clôture)

**Checklist Frontend :**
- [ ] Page `/app/settings/delegations` : liste délégations actives et historique
- [ ] Formulaire : sélecteur collaborateur, période, permissions à déléguer (checkboxes)
- [ ] Badge "En délégation" affiché dans l'interface du délégué
- [ ] Timeline délégation avec indicateur temps restant

**Labels :** `rbac` `délégations`

---

### 🃏 [RBAC-06] Fiche Personnel Complète
**Description :** Étendre le modèle Staff avec tous les champs du CDC §7.13.

**Checklist Backend :**
- [ ] Créer modèle `Staff` (si pas déjà existant) : `matricule_interne`, `statut` (PERMANENT/VACATAIRE/STAGIAIRE/BENEVOLE/CONTRACTUEL), `type_contrat` (CDI/CDD/FONCTIONNAIRE/PRESTATAIRE), `date_debut`, `date_fin`, `grade`, `anciennete` (calculée), `echelon`
- [ ] Spécialités enseignant : `matieres_enseignables` M2M, `niveaux_enseignement`, `max_heures_hebdo` (défaut 18h), `heures_assignees` (calculé auto)
- [ ] Rémunération : `salaire_base`, `devise`, `compte_bancaire`, `banque`, `primes` JSON
- [ ] Multi-établissements : `affiliations_externes` JSON (autres écoles), `heures_externes`, alertes dépassement 40h/sem
- [ ] Photos : portrait + plein pied (2 requises)

**Checklist Frontend :**
- [ ] Page `/app/hr/staff/[id]` avec onglets Identité / Contrat / Matières / Rémunération
- [ ] Jauge "Heures assignées / Max heures hebdo" avec alertes rouge si dépassement
- [ ] Section multi-établissements : liste affiliations + calcul total heures

**Labels :** `rh` `personnel`

---

## MODULE G — 📚 MATIÈRES ET PROGRAMMES
> _Nouveau : catalogue MINEDU, programmes pédagogiques_

---

### 🃏 [SUBJECT-01] Catalogue Matières MINEDU Guinée
**Description :** Implémenter le catalogue officiel des matières (CDC §8.1).

**Checklist Backend :**
- [ ] Étendre modèle `Subject` : `code_officiel` (FR, MATH, HG, PC, SVT, ANG, EPS...), `categorie` (Langue/Scientifique/Humaines/Sport/Civique/Technique), `cycles` M2M, `coef_min`, `coef_max`, `examen_final` (booléen)
- [ ] Fixture catalogue : 15 matières officielles MINEDU Guinée
- [ ] Matières spéciales : AR (Arabe) et REL (Religion) → franco-arabe uniquement
- [ ] Endpoint : `GET /pedagogy/subjects/catalog/` → catalogue complet avec filtres

**Checklist Frontend :**
- [ ] Page `/app/pedagogy/subjects/catalog` : vue catalogue groupé par catégorie
- [ ] Import depuis catalogue lors de la création des matières d'une classe

**Labels :** `matières` `catalogue`

---

### 🃏 [SUBJECT-02] Configuration Matières par Classe
**Description :** Configuration détaillée des matières pour chaque classe (CDC §8.2).

**Checklist Backend :**
- [ ] Étendre `ClassSubject` : `enseignant_remplacant` FK, `bareme` (20 défaut / 10), `seuil_passage` (10 défaut), `optionnelle`, `examinable`
- [ ] Validation : coefficient dans les bornes du catalogue (coef_min / coef_max)
- [ ] Endpoint : `GET/POST /pedagogy/classes/{id}/subjects/` + `PATCH /pedagogy/classes/{id}/subjects/{id}/`

**Checklist Frontend :**
- [ ] Section "Matières" dans le détail d'une classe
- [ ] Formulaire par matière : coefficient (slider dans les bornes), enseignant principal + remplaçant, barème, seuil passage

**Labels :** `matières` `classes`

---

### 🃏 [SUBJECT-03] Programmes et Progression Pédagogique
**Description :** Gérer les programmes chapitres et leur suivi (CDC §8.3).

**Checklist Backend :**
- [ ] Créer modèle `Syllabus` (class_subject FK, version, statut: BROUILLON/VALIDE)
- [ ] Créer modèle `SyllabusChapter` (syllabus FK, titre, order, competences JSON, heures_prevues, heures_realisees, evaluations_liees M2M, documents JSON)
- [ ] Validation syllabus par Directeur des Études
- [ ] Partage inter-écoles (réseau) : `is_shared`, `source_syllabus` FK
- [ ] Endpoints : `GET/POST /pedagogy/syllabi/` + CRUD chapitres

**Checklist Frontend :**
- [ ] Page "Programme" dans le détail d'une matière/classe
- [ ] Gestion des chapitres avec drag & drop pour réordonner
- [ ] Indicateur avancement : heures réalisées / heures prévues (progress bar)
- [ ] Bouton "Valider programme" (Directeur des Études)

**Labels :** `matières` `programmes`

---

## MODULE H — 🗓️ EMPLOIS DU TEMPS AVANCÉS
> _Nouveau : contraintes dures/molles, génération automatique_

---

### 🃏 [TIMETABLE-01] Contraintes et Validation EDT
**Description :** Implémenter les contraintes de validation de l'emploi du temps (CDC §9.2).

**Checklist Backend :**
- [ ] Validation contraintes dures : chevauchement professeur / salle / classe
- [ ] Contraintes horaires par cycle : Primaire max 6h/jour, Collège/Lycée max 8h/jour
- [ ] Pause obligatoire après 2h (15 min), déjeuner après 4h (60 min)
- [ ] Étendre `TimetableSlot` : `type` (COURS/TD/TP/DS/CONSEIL/RECREATION), `groupe` FK nullable, `recurrence` (HEBDO/PONCTUEL)
- [ ] Endpoint validation : `POST /pedagogy/timetable/validate/` → retourne liste des conflits

**Checklist Frontend :**
- [ ] Vue calendrier hebdomadaire (grille) avec code couleur par matière
- [ ] Indication des conflits en rouge avec tooltip explicatif
- [ ] Filtre par prof / par classe / par salle

**Labels :** `emploi-du-temps` `validation`

---

### 🃏 [TIMETABLE-02] Génération Automatique EDT
**Description :** Algorithme de génération automatique basé sur CSP (CDC §9.3).

**Checklist Backend :**
- [ ] Endpoint : `POST /pedagogy/timetable/generate/` → lance tâche Celery
- [ ] Paramètres : `school_year`, `classes`, `mode` (EQUILIBRE/PREFS_PROFS/EFFICACITE_SALLES/PEDAGOGIQUE)
- [ ] Implémentation algorithme CSP (ou appel solver externe : Google OR-Tools)
- [ ] Timeout 5 minutes, fallback : relaxation progressive des contraintes molles
- [ ] Retour : `task_id` pour polling statut
- [ ] Endpoint : `GET /pedagogy/timetable/generate/{task_id}/status/`
- [ ] Préférences professeurs : `preferred_schedule` JSON (matin/après-midi par jour)

**Checklist Frontend :**
- [ ] Bouton "Générer automatiquement" avec sélection du mode
- [ ] Loading state avec progression + message "Calcul en cours (max 5 min)"
- [ ] Aperçu de l'EDT généré avant validation

**Labels :** `emploi-du-temps` `génération-auto` `celery`

---

## MODULE I — 📊 NOTES ET ÉVALUATIONS AVANCÉES
> _Nouveau : types évaluation complets, mentions, audit traçabilité_

---

### 🃏 [GRADE-01] Types d'Évaluations Complets
**Description :** Implémenter tous les types d'évaluations (CDC §11.1).

**Checklist Backend :**
- [ ] Étendre modèle `Evaluation` : `type` complet (CC/DS/TP/PARTICIPATION/DR/EB), `coef_min`, `coef_max` par type, `periode` FK (trimestre)
- [ ] Validation coefficient dans les bornes par type (ex: DS → coef 3-6)
- [ ] Type PARTICIPATION : coefficient 0.5 supporté

**Labels :** `notes` `évaluations`

---

### 🃏 [GRADE-02] Calculs Avancés et Mentions
**Description :** Calculs complets avec arrondi académique et mentions (CDC §11.3-11.4).

**Checklist Backend :**
- [ ] Arrondi académique : au centième supérieur si ≥5 millième (12.345 → 12.35, 12.344 → 12.34)
- [ ] Classement avec règles ex-aequo : moyenne → nb TB → nb Bien → moy Français → moy Maths → alphabétique
- [ ] Mentions automatiques : TB (≥16), Bien (≥14), AB (≥12), Passable (≥10), Insuffisant (≥8), TI (<8)
- [ ] Appréciations standard par mention (texte automatique configurable)
- [ ] Endpoint : `GET /students/{id}/bulletin/{period_id}/` → données complètes bulletin

**Checklist Frontend :**
- [ ] Affichage mention avec code couleur (vert foncé → rouge)
- [ ] Appréciation auto modifiable par enseignant principal

**Labels :** `notes` `calculs` `bulletins`

---

### 🃏 [GRADE-03] Audit et Traçabilité Notes
**Description :** Traçabilité complète des modifications de notes (CDC §11.5).

**Checklist Backend :**
- [ ] Modèle `GradeAuditLog` : action, ancienne_valeur, nouvelle_valeur, modifie_par FK, timestamp, raison, ip, session_id
- [ ] Déverrouillage directeur : `PATCH /pedagogy/evaluations/{id}/unlock/` → log spécial obligatoire avec justification
- [ ] Après déverrouillage : fenêtre de modification limitée (ex: 24h) puis re-verrouillage auto
- [ ] Endpoint : `GET /pedagogy/evaluations/{id}/audit-log/`

**Checklist Frontend :**
- [ ] Page "Historique modifications" accessible au Directeur depuis le détail d'une évaluation
- [ ] Timeline des modifications avec avant/après

**Labels :** `notes` `audit` `sécurité`

---

## MODULE J — 🎓 EXAMENS OFFICIELS
> _Entièrement nouveau_

---

### 🃏 [EXAM-01] Gestion des Examens Officiels (CEE, BEPC, BAC)
**Description :** Implémenter le module examens officiels complet (CDC §12).

**Checklist Backend :**
- [ ] Créer modèle `OfficialExam` (type: CEE/BEPC/BAC, school_year FK, date_debut, date_fin, organisme, frais_examen, statut)
- [ ] Créer modèle `ExamCandidate` (exam FK, student FK, statut: SELECTIONNE/VALIDE/EXCLU/CANDIDAT, code_anonymat, centre_examen FK, salle FK)
- [ ] Créer modèle `ExamCenter` (nom, adresse, capacite, est_notre_ecole)
- [ ] Sélection automatique : tous élèves niveau terminal + validation individuelle (dettes, exclusions)
- [ ] Génération codes anonymat (aléatoire ou séquentiel)
- [ ] Saisie notes par code anonymat uniquement
- [ ] Calcul final : CC 40% + examen 60%
- [ ] Export format MEPU-A : XML/CSV avec champs officiels
- [ ] Import résultats officiels (fichier MEPU-A)
- [ ] Génération attestations de réussite provisoires (PDF signé)
- [ ] Endpoints : `GET/POST /exams/`, `POST /exams/{id}/candidates/`, `POST /exams/{id}/export-mepu/`, `POST /exams/{id}/import-results/`

**Checklist Frontend :**
- [ ] Section "Examens officiels" dans le module pédagogie
- [ ] Liste candidats avec indicateurs de validation (documents, dettes)
- [ ] Interface saisie notes anonymisées (sans nom visible)
- [ ] Bouton "Export MEPU-A" avec format
- [ ] Import résultats + publication aux élèves
- [ ] Statistiques : taux réussite par école/classe/matière

**Labels :** `examens-officiels` `MEPU-A` `priorité-haute`

---

## MODULE K — 💰 FINANCE AVANCÉE
> _Nouveau : multi-devises, échéanciers, impayés automatisés, OHADA, Mobile Money_

---

### 🃏 [FINANCE-01] Catégories de Frais Complètes
**Description :** Implémenter toutes les catégories de frais du CDC §13.1.

**Checklist Backend :**
- [ ] Catégories supplémentaires : `CANT`, `TRANS`, `TENUE`, `FOURN`, `SORTIE`, `EXAM`, `GARD`, `INTER`, `CAUT`
- [ ] Propriétés par catégorie : `obligatoire`, `remboursable`, `optionnel`
- [ ] Caution : `is_caution=True`, remboursement en fin d'année
- [ ] Frais examen : `transferable_mepu=True`, lié au module examens officiels

**Labels :** `finance` `frais`

---

### 🃏 [FINANCE-02] Multi-Devises et Taux de Change
**Description :** Support multi-devises GNF/XOF/EUR/USD (CDC §13.2).

**Checklist Backend :**
- [ ] Créer modèle `Currency` (code, nom, symbole, taux_vers_gnf, date_taux)
- [ ] Historisation taux du jour pour chaque transaction
- [ ] Arrondi 500 GNF (pas de pièces en Guinée)
- [ ] Champ `currency_preference` sur `Guardian`
- [ ] Conversion automatique à l'affichage selon préférence parent
- [ ] Endpoints : `GET /finance/currencies/` + `POST /finance/currencies/{code}/update-rate/`

**Checklist Frontend :**
- [ ] Sélecteur devise dans les formulaires de paiement
- [ ] Affichage double devise (ex: 500,000 GNF ≈ 55 EUR)
- [ ] Admin : page mise à jour des taux de change

**Labels :** `finance` `multi-devises`

---

### 🃏 [FINANCE-03] Échéanciers Personnalisables
**Description :** Modèles d'échéanciers avec pénalités et relances (CDC §13.3).

**Checklist Backend :**
- [ ] Créer modèle `PaymentScheduleTemplate` (nom, echeances JSON [{date_butoir, pourcentage, penalite_taux, penalite_delai}])
- [ ] Templates prédéfinis : Standard 3x, Standard 2x, Mensuel 10x
- [ ] `StudentFee.schedule` FK vers template ou custom JSON
- [ ] Calcul pénalités de retard automatique
- [ ] Blocage accès notes si impayé (configurable par catégorie)
- [ ] Endpoint : `GET/POST /finance/schedule-templates/`

**Checklist Frontend :**
- [ ] Page `/app/finance/schedule-templates` : gestion modèles
- [ ] Éditeur d'échéancier : pourcentages par échéance (validation somme = 100%)
- [ ] Configuration blocage : toggle "Bloquer accès notes si impayé"

**Labels :** `finance` `échéanciers`

---

### 🃏 [FINANCE-04] Gestion Automatisée des Impayés et Relances
**Description :** Séquence de relances automatisées selon le CDC §13.4.

**Checklist Backend :**
- [ ] Tâche Celery `check_overdue_payments` (quotidienne)
- [ ] Logique de relance : J-3 push, J+1 SMS, J+3 SMS+Email, J+7 SMS+Email+App, J+15 note interne, J+30 SMS+Appel, J+60 blocage partiel, J+90 plan apurement, J+180 mise en demeure
- [ ] Créer modèle `PaymentReminder` (student_fee FK, type, date_envoi, canal, statut)
- [ ] `POST /finance/student-fees/{id}/payment-plan/` → plan d'apurement sur 6 mois

**Checklist Frontend :**
- [ ] Tableau de bord impayés : liste avec tranche de retard (J+1 à J+180)
- [ ] Historique relances par élève
- [ ] Bouton "Créer plan d'apurement" avec formulaire

**Labels :** `finance` `impayés` `relances` `celery`

---

### 🃏 [FINANCE-05] Conformité OHADA
**Description :** Plan comptable Syscohada et déclarations fiscales (CDC §13.5).

**Checklist Backend :**
- [ ] Mapping paiements → plan comptable Syscohada (comptes 6 et 7)
- [ ] Journal des recettes automatique avec codes comptables
- [ ] Endpoint : `GET /finance/reports/grand-livre/` (filtres date, compte)
- [ ] Endpoint : `GET /finance/reports/balance/`
- [ ] Endpoint : `GET /finance/reports/bilan-simplifie/`
- [ ] Export mensuel DGI (recettes brutes)
- [ ] Calcul TVA (si applicable)

**Checklist Frontend :**
- [ ] Page `/app/finance/reports/ohada` : sélection rapport + export PDF/Excel
- [ ] Grand livre avec filtres date et numéro de compte

**Labels :** `finance` `ohada` `comptabilité`

---

### 🃏 [FINANCE-06] Mobile Money (Orange Money, MTN, Wave)
**Description :** Intégration API paiements mobiles (CDC §15).

**Checklist Backend :**
- [ ] Interface `PaymentProvider` (abstract) : `initiate_payment()`, `check_status()`, `webhook_verify()`
- [ ] Implémentation `OrangeMoneyProvider`, `MTNMobileMoneyProvider`, `WaveProvider`
- [ ] Génération référence unique par transaction
- [ ] Génération QR code paiement (scan par parent)
- [ ] Endpoint webhook : `POST /webhooks/orange-money/`, `POST /webhooks/mtn/`, `POST /webhooks/wave/`
- [ ] Polling statut si webhook échoue (retry avec backoff)
- [ ] Réconciliation automatique (match référence + montant)
- [ ] Chiffrement clés API (Vault / AWS Secrets Manager)
- [ ] IP whitelisting par opérateur

**Checklist Frontend :**
- [ ] Interface caisse : recherche élève + affichage soldes + sélection méthode paiement
- [ ] QR code dynamique affiché pour scan Orange Money / MTN / Wave
- [ ] Indicateur de statut paiement en temps réel (polling)
- [ ] Impression reçu thermique (API navigateur) + PDF + SMS

**Labels :** `finance` `mobile-money` `intégrations` `priorité-haute`

---

## MODULE L — 💼 PAIE ET RESSOURCES HUMAINES
> _Entièrement nouveau_

---

### 🃏 [PAYROLL-01] Module Paie (Backend)
**Description :** Implémenter la gestion de la paie avec conformité guinéenne (CDC §14).

**Checklist Backend :**
- [ ] Créer modèle `SalaryGrid` (grade, echelon, salaire_base, devise)
- [ ] Créer modèle `PayrollElement` (staff FK, type: GAIN/RETENUE, code, libelle, montant_ou_taux, calcul_auto)
- [ ] Éléments gains : salaire_base, prime_anciennete (2.5% tous 2 ans, max 10 incrément), prime_responsabilite, prime_transport, prime_risque, heures_sup
- [ ] Retenues : CNSS 5%, AMO 2.5%, impôt progressif DGI, avances, absences, sanctions
- [ ] Créer modèle `Payslip` (staff FK, periode, statut: BROUILLON/VALIDE/PAYE, elements JSON, brut, net, date_paiement)
- [ ] Processus mensuel : génération auto J-5, vérif J-3, validation directeur J-1, paiement J
- [ ] Export déclaration CNSS mensuelle (format officiel)
- [ ] Export déclaration AMO mensuelle
- [ ] Export DAS annuel (Déclaration Annuelle Salaires)
- [ ] Endpoints : `GET/POST /payroll/payslips/`, `POST /payroll/payslips/{id}/validate/`, `POST /payroll/payslips/batch-generate/`

**Labels :** `paie` `rh` `cnss`

---

### 🃏 [PAYROLL-02] Module Paie (Frontend)
**Description :** Interface de gestion de la paie.

**Checklist Frontend :**
- [ ] Page `/app/payroll/dashboard` : liste fiches de paie du mois (statuts BROUILLON/VALIDE/PAYE)
- [ ] Fiche de paie individuelle : détail gains, retenues, net à payer
- [ ] Bouton "Générer fiches du mois" (Comptable)
- [ ] Validation en masse ou individuelle (Directeur)
- [ ] Exports : CNSS format officiel, AMO, DAS annuel
- [ ] Historique fiches par employé

**Labels :** `paie` `rh` `frontend`

---

## MODULE M — 🏛️ INFRASTRUCTURES (TRANSPORT, CANTINE, INTERNAT)
> _Entièrement nouveau_

---

### 🃏 [INFRA-01] Gestion du Transport Scolaire
**Description :** Implémenter le module transport (CDC §17.1).

**Checklist Backend :**
- [ ] Créer modèle `Vehicle` (immatriculation, type: BUS/MINIBUS/VAN, capacite, statut, conducteur FK, accompagnateur FK, assurance_expiry, controle_technique_expiry)
- [ ] Créer modèle `TransportRoute` (nom, vehicule FK, arrets JSON [{nom, coordonnees_gps, heure_theorique}], tarif_trajet, tarif_forfait)
- [ ] Créer modèle `StudentTransport` (student FK, route FK, arret_montee, arret_descente)
- [ ] Présence par trajet (saisie accompagnateur)
- [ ] Suivi GPS temps réel (optionnel) : WebSocket ou webhook GPS
- [ ] Facturation : forfait annuel/trimestriel/mensuel ou kilométrique
- [ ] Alertes : assurance/CT expiration J-30
- [ ] Endpoints CRUD : `/transport/vehicles/`, `/transport/routes/`, `/transport/assignments/`

**Checklist Frontend :**
- [ ] Page `/app/transport/dashboard` : carte des trajets + statut véhicules
- [ ] Gestion véhicules : liste avec alertes d'expiration
- [ ] Affectation élèves aux arrêts
- [ ] Saisie présence trajet (accompagnateur)

**Labels :** `infra` `transport`

---

### 🃏 [INFRA-02] Gestion de la Cantine
**Description :** Implémenter le module cantine (CDC §17.2).

**Checklist Backend :**
- [ ] Créer modèle `CanteenMenu` (semaine, jour, plat_principal, dessert, allergenes JSON, cout_revient)
- [ ] Créer modèle `CanteenTicket` (student FK, type: PACK_10/PACK_20/MENSUEL/UNITE, solde_repas, date_expiry)
- [ ] Régimes spéciaux : lien vers `StudentMedical.regime_alimentaire`
- [ ] Saisie consommation : scan carte élève ou présence manuelle
- [ ] Alerte solde faible (< 3 repas)
- [ ] Gestion stocks : `CanteenStock` (produit, quantite, seuil_alerte)
- [ ] Endpoints : `/cantine/menus/`, `/cantine/tickets/`, `/cantine/attendance/`

**Checklist Frontend :**
- [ ] Page `/app/cantine/dashboard` : menus semaine + stats consommation
- [ ] Gestion des tickets par élève (rechargement)
- [ ] Interface saisie consommation (scan QR ou liste)

**Labels :** `infra` `cantine`

---

### 🃏 [INFRA-03] Gestion de l'Internat
**Description :** Implémenter le module internat (CDC §17.3).

**Checklist Backend :**
- [ ] Créer modèle `DormBuilding` (nom, etages, tenant FK)
- [ ] Créer modèle `DormRoom` (batiment FK, numero, capacite, type: GARCONS/FILLES/MIXTE, equipement JSON)
- [ ] Créer modèle `StudentDorm` (student FK, chambre FK, date_debut, date_fin)
- [ ] Appel du soir : présence nocturne (similaire à `AttendanceRecord`)
- [ ] Permissions de sortie : modèle `DormLeavePermission` (student, date_debut, date_fin, motif, validé_par)
- [ ] Suivi entrées/sorties (badge ou signature)
- [ ] Facturation : pension complète / demi-pension par trimestre + cautions
- [ ] Endpoints : `/dorm/rooms/`, `/dorm/assignments/`, `/dorm/attendance/`, `/dorm/leave-permissions/`

**Checklist Frontend :**
- [ ] Page `/app/dorm/dashboard` : plan de l'internat avec taux d'occupation
- [ ] Affectation chambres (drag & drop)
- [ ] Interface appel du soir
- [ ] Gestion permissions de sortie

**Labels :** `infra` `internat`

---

## MODULE N — 📄 DOCUMENTS ET SIGNATURE NUMÉRIQUE
> _Entièrement nouveau_

---

### 🃏 [DOCS-01] Génération Documents Officiels
**Description :** Générer tous les documents officiels de l'école (CDC §18.1).

**Checklist Backend :**
- [ ] Templates HTML/Jinja2 pour : attestation inscription, certificat scolarité, relevé notes trimestriel, bulletin officiel, reçu paiement, fiche de paie, attestation réussite provisoire
- [ ] Service PDF : HTML → PDF avec WeasyPrint ou Playwright
- [ ] Tâches Celery pour génération asynchrone (bulletins en masse)
- [ ] Endpoint : `POST /documents/generate/` → `{type, entity_id}` → `task_id`
- [ ] `GET /documents/{id}/download/`
- [ ] Stockage WORM (Write Once Read Many) sur S3/MinIO

**Labels :** `documents` `pdf` `celery`

---

### 🃏 [DOCS-02] Signature Numérique et Vérification
**Description :** Implémenter la signature cryptographique et vérification QR (CDC §18.2).

**Checklist Backend :**
- [ ] Génération paire de clés par école (RSA ou Ed25519)
- [ ] Calcul empreinte SHA-256 du PDF généré
- [ ] Signature cryptographique avec clé privée école
- [ ] Génération QR code : URL vérification + hash tronqué + métadonnées
- [ ] Tamponnage visuel sur le PDF (signature + QR)
- [ ] Portail public de vérification : `GET /verify/{hash}/` → retourne infos document
- [ ] Alerte si hash mismatch (document modifié)
- [ ] Rotation clés annuelle avec historique pour vérification anciens documents

**Checklist Frontend :**
- [ ] Page publique `/verify` : input hash ou scan QR → affichage résultat
- [ ] Affichage : type document, établissement, élève, date, signataire, statut (✅ AUTHENTIQUE / ❌ ALTÉRÉ)

**Labels :** `documents` `signature` `sécurité`

---

## MODULE O — 📡 COMMUNICATION MULTICANALE
> _Nouveau : SMS, WhatsApp, USSD, Email, notifications automatisées_

---

### 🃏 [COMM-01] Centre de Messagerie Intégré
**Description :** Vue unifiée des communications par famille (CDC §19.1).

**Checklist Backend :**
- [ ] Créer modèle `Message` (expediteur FK, destinataire FK, canal: SMS/WHATSAPP/EMAIL/PUSH/VOIX/USSD, contenu, statut: ENVOYE/DELIVRE/LU/ECHOUE, timestamp, thread_id)
- [ ] Vue timeline chronologique par famille
- [ ] Statuts détaillés par canal (SMS delivery report, WhatsApp read receipt)

**Checklist Frontend :**
- [ ] Page `/app/communication/inbox` : liste des conversations par famille
- [ ] Vue conversation : timeline SMS + WhatsApp + Email + Push dans un même fil
- [ ] Filtres : par canal, par statut, par classe

**Labels :** `communication` `messagerie`

---

### 🃏 [COMM-02] SMS et WhatsApp Business
**Description :** Intégration SMS (Africas Talking) et WhatsApp Business API (CDC §19.2-19.4).

**Checklist Backend :**
- [ ] Service SMS : intégration AfricasTalking API (envoi individuel et broadcast)
- [ ] Service WhatsApp : intégration API Meta WhatsApp Business
- [ ] Templates approuvés : `bonjour_parent`, `alerte_absence`, `rappel_paiement`, `bulletin_disponible`
- [ ] Boutons interactifs WhatsApp (Confirmer, Voir détails)
- [ ] Envoi PDF via WhatsApp (bulletins, reçus)
- [ ] Webhook réception messages entrants WhatsApp
- [ ] Modération mots-clés sensibles automatique

**Checklist Frontend :**
- [ ] Page `/app/communication/send` : composer message multi-canal
- [ ] Sélection destinataires : tout l'établissement / par classe / par élève
- [ ] Prévisualisation SMS (compteur caractères) vs WhatsApp (rendu riche)
- [ ] Historique envois avec statuts

**Labels :** `communication` `sms` `whatsapp` `intégrations`

---

### 🃏 [COMM-03] Notifications Automatisées
**Description :** Déclencher les notifications automatiques selon les événements (CDC §19.3).

**Checklist Backend :**
- [ ] Signal Django / post_save sur chaque événement clé :
  - Nouvelle note validée → Push + WhatsApp parents
  - Absence enregistrée → SMS + WhatsApp immédiat
  - Retard répété (3 en 7j) → Email + WhatsApp J+1
  - Paiement reçu → SMS + WhatsApp immédiat
  - Échéance J-3 → Push + WhatsApp + SMS
  - Bulletin disponible → Push + Email + WhatsApp
  - Fermeture exceptionnelle → tous canaux + voix
- [ ] Respect préférences notification par responsable
- [ ] File d'attente avec retry (tâches Celery)
- [ ] Throttling : max 3 SMS/jour par famille

**Labels :** `communication` `notifications` `celery`

---

### 🃏 [COMM-04] USSD (*144#)
**Description :** Menu USSD pour parents sans smartphone (CDC §19.5).

**Checklist Backend :**
- [ ] Intégration USSD gateway (AfricasTalking USSD)
- [ ] Menu : Consulter solde / Dernières notes / Prochaine échéance / Contacter école / Changer langue
- [ ] Support langues : Français / Pular / Susu / Malinké
- [ ] Session USSD : gestion état machine à états

**Labels :** `communication` `ussd`

---

## MODULE P — 📈 ANALYTICS ET IA PRÉDICTIVE
> _Nouveau_

---

### 🃏 [ANALYTICS-01] Dashboard Directeur 360°
**Description :** KPIs temps réel et visualisations directeur (CDC §20.1).

**Checklist Backend :**
- [ ] Endpoint : `GET /analytics/director-dashboard/` → KPIs agrégés (effectifs, pédagogie, finances, RH)
- [ ] Cache Redis 5 minutes sur les KPIs
- [ ] Métriques : taux encaissement, impayés >30j, trésorerie, charge horaire, absentéisme personnel

**Checklist Frontend :**
- [ ] Page `/app/dashboard` améliorée : cards KPI avec tendances (↑↓)
- [ ] Graphique effectifs sur 3 ans (`LineChart` Recharts)
- [ ] Heatmap absences par jour/semaine (matrice colorée)
- [ ] Jauge taux encaissement (objectif >90%)
- [ ] Comparatif inter-classes (bar chart)
- [ ] Widgets filtrables par campus

**Labels :** `analytics` `dashboard`

---

### 🃏 [ANALYTICS-02] Prédiction Décrochage Scolaire
**Description :** Modèle IA de score de risque décrochage (CDC §20.2).

**Checklist Backend :**
- [ ] Tâche Celery hebdomadaire : calcul score risque par élève
- [ ] Variables : absences cumulées (pondérées récentes), retards, évolution moyenne, notes en baisse, impayés, discipline
- [ ] Score 0-100, seuils : 0-30 vert, 31-60 orange, 61-90 rouge, 91-100 noir
- [ ] Créer modèle `RiskScore` (student FK, score, date, facteurs JSON, actions_suggerees JSON)
- [ ] Actions suggérées par l'IA selon les facteurs
- [ ] Endpoint : `GET /analytics/risk-scores/` (Directeur/D.Etudes uniquement)

**Checklist Frontend :**
- [ ] Widget "Élèves à risque" dans le dashboard directeur
- [ ] Page `/app/analytics/risk` : liste élèves par niveau de risque + actions suggérées
- [ ] Badge risque sur la fiche élève (si permission)

**Labels :** `analytics` `ia` `décrochage`

---

### 🃏 [ANALYTICS-03] Bourses et Aides Sociales
**Description :** Implémenter la gestion complète des bourses (CDC §16).

**Checklist Backend :**
- [ ] Créer modèle `Scholarship` (student FK, type: MERITE/EXCEL/SOCIAL/STAFF/FRATRI/HAND/EXCEPT, montant_ou_pourcentage, date_debut, date_fin, statut: DEMANDE/ETUDIE/ACCORDE/REFUSE/RENOUVELE, justificatifs JSON)
- [ ] Commission bourses : Directeur + Comptable + D.Etudes → vote
- [ ] Application automatique sur prochaine facture
- [ ] Alertes renouvellement J-30
- [ ] Vérification conditions (notes ≥ seuil pour bourse mérite)
- [ ] Endpoints : `GET/POST /finance/scholarships/`, `PATCH /finance/scholarships/{id}/decision/`

**Checklist Frontend :**
- [ ] Section "Bourses" dans la fiche financière élève
- [ ] Page `/app/finance/scholarships` : liste demandes avec filtre statut
- [ ] Interface commission : vote accordé/refusé avec motif
- [ ] Alerte renouvellement dans le dashboard

**Labels :** `finance` `bourses`

---

## MODULE Q — 🔒 SÉCURITÉ ET AUDIT AVANCÉS

---

### 🃏 [SEC-01] Alertes Sécurité en Temps Réel
**Description :** Détecter et alerter sur les comportements suspects (CDC §7.12).

**Checklist Backend :**
- [ ] Détection élévation de privilèges : notification Directeur immédiate
- [ ] Permission inhabituelle utilisée 3x/24h → alerte admin sécurité
- [ ] Accès données médicales → log immédiat + rapport batch quotidien
- [ ] Connexion hors heures (22h-06h) + action sensible → MFA obligatoire + notification
- [ ] Partage session (2 IP simultanées) → blocage compte + investigation
- [ ] Créer modèle `SecurityAlert` (type, user FK, details JSON, resolved)
- [ ] Endpoint : `GET /monitoring/security-alerts/`

**Checklist Frontend :**
- [ ] Section "Alertes sécurité" dans le dashboard Super Admin et Directeur
- [ ] Notification temps réel (WebSocket ou polling) pour alertes critiques

**Labels :** `sécurité` `audit`

---

### 🃏 [SEC-02] Chiffrement des Données par Tenant
**Description :** Chiffrement au repos avec clé unique par tenant (CDC §1.2).

**Checklist Backend :**
- [ ] Génération clé de chiffrement unique par tenant (à la création)
- [ ] Chiffrement des champs sensibles : données médicales, données financières personnelles
- [ ] Gestion des clés : Vault ou AWS KMS
- [ ] Rotation des clés annuelle

**Labels :** `sécurité` `chiffrement` `infra`

---

## MODULE R — 🌍 LOCALISATION ET ACCESSIBILITÉ

---

### 🃏 [I18N-01] Support Langues Locales Guinéennes
**Description :** Ajouter les langues Pular, Susu, Malinké à l'interface (CDC §19.5).

**Checklist Frontend :**
- [ ] Ajouter fichiers `messages/ff.json` (Pular), `messages/sus.json` (Susu), `messages/ml.json` (Malinké)
- [ ] Traductions prioritaires : navigation principale, messages notifications, USSD
- [ ] Sélecteur de langue dans les préférences utilisateur
- [ ] Détection automatique langue navigateur

**Labels :** `i18n` `localisation`

---

### 🃏 [ACCESS-01] Accessibilité Web (WCAG 2.1 AA)
**Description :** Checklist accessibilité complète (Module Enseignant Annexe C).

**Checklist Frontend :**
- [ ] Contraste 4.5:1 minimum sur tous les textes
- [ ] Touch targets minimum 44×44dp (mobile)
- [ ] Labels ARIA sur tous les éléments interactifs
- [ ] Navigation clavier complète (Tab, Entrée, Échap)
- [ ] Support `prefers-reduced-motion` (désactiver animations)
- [ ] Texte zoomable 200% sans perte de fonctionnalité
- [ ] Test lecteur d'écran (NVDA ou VoiceOver)

**Labels :** `accessibilité` `a11y`

---

## MODULE S — ⚙️ PERFORMANCE ET INFRASTRUCTURE PROD

---

### 🃏 [PERF-01] Budgets Performance PWA Enseignant
**Description :** Respecter les objectifs performance critiques (Module Enseignant §10).

**Checklist Frontend (PWA) :**
- [ ] First Contentful Paint < 1.5s (max 3s)
- [ ] Time to Interactive < 3s (max 5s)
- [ ] Bundle JS initial < 150 Ko gzippé (max 250 Ko)
- [ ] Consommation données/session < 500 Ko
- [ ] Lazy loading routes : `AttendancePage`, `GradesPage`
- [ ] Compression données avant stockage LZ-string
- [ ] Prefetch intelligent selon emploi du temps (prochains 30 min)
- [ ] Dark mode natif (économie batterie sur OLED)

**Labels :** `performance` `pwa`

---

### 🃏 [INFRA-PROD-01] Configuration Production
**Description :** Finaliser les éléments de mise en production (Backend checklist §15).

**Checklist :**
- [ ] Configurer Gunicorn (workers = 2*CPU + 1)
- [ ] Configurer Nginx (proxy inverse, compression gzip, headers sécurité)
- [ ] Configuration PostgreSQL en production (remplacer SQLite)
- [ ] Définir environments : dev / staging / prod avec variables séparées
- [ ] Stratégie backup : PostgreSQL dump quotidien, rétention 30j
- [ ] Plan de reprise (DR) : RTO < 4h, RPO < 24h
- [ ] Monitoring : Sentry (erreurs), Prometheus + Grafana (métriques)
- [ ] CDN pour assets statiques (CloudFront ou BunnyCDN)

**Labels :** `infra` `production` `déploiement`

---

### 🃏 [INFRA-PROD-02] Stockage Fichiers et Médias
**Description :** Finaliser la configuration S3/MinIO (Backend checklist §10).

**Checklist :**
- [ ] Configurer bucket S3/MinIO par tenant (isolation)
- [ ] URLs pré-signées pour upload direct (éviter transit serveur)
- [ ] Politique WORM pour documents officiels signés
- [ ] Quotas de stockage par plan
- [ ] Compression images (photos élèves, documents)
- [ ] CDN pour servir les médias (cache edge)

**Labels :** `infra` `stockage`

---

## MODULE T — 🧪 TESTS ET QUALITÉ

---

### 🃏 [TEST-01] Tests Unitaires Services Métier (Phase 7)
**Description :** Finaliser la couverture de tests (Backend checklist §12).

**Checklist :**
- [ ] Tests services élèves : inscription 5 étapes, transferts, réinscription
- [ ] Tests calcul notes : arrondi académique, mentions, classement ex-aequo
- [ ] Tests paie : calcul CNSS, AMO, primes, pénalités
- [ ] Tests finance : échéanciers, relances automatiques, mobile money
- [ ] Tests RBAC : chaque rôle sur chaque endpoint critique
- [ ] Tests offline sync : résolution conflits, queue priorité
- [ ] Couverture cible : > 80% sur services métiers

**Labels :** `tests` `qualité`

---

### 🃏 [TEST-02] Tests E2E Scénarios Critiques
**Description :** Tests de bout en bout sur les flux critiques.

**Checklist :**
- [ ] Scénario : inscription élève complet (5 étapes) → paiement → carte générée
- [ ] Scénario : appel présences offline → sync → notification parents
- [ ] Scénario : saisie notes → validation directeur → bulletin généré → signature
- [ ] Scénario : paiement Mobile Money → webhook → reçu SMS
- [ ] Scénario : délégation de permissions → actions sous délégation → clôture

**Labels :** `tests` `e2e`

---

## 📊 TABLEAU DE BORD — ÉTAT D'AVANCEMENT

| Module | Nouvelles tâches | Priorité |
|--------|-----------------|----------|
| A — Architecture Multi-Tenant | 4 cartes | 🔴 Haute |
| B — Niveaux et Types | 5 cartes | 🟡 Moyenne |
| C — Offline & PWA Enseignant | 8 cartes | 🔴 Haute |
| D — Années Scolaires | 2 cartes | 🟡 Moyenne |
| E — Élèves Avancé | 6 cartes | 🔴 Haute |
| F — Personnel & RBAC | 6 cartes | 🔴 Haute |
| G — Matières & Programmes | 3 cartes | 🟡 Moyenne |
| H — Emplois du Temps | 2 cartes | 🟡 Moyenne |
| I — Notes Avancées | 3 cartes | 🟡 Moyenne |
| J — Examens Officiels | 1 carte | 🔴 Haute |
| K — Finance Avancée | 6 cartes | 🔴 Haute |
| L — Paie & RH | 2 cartes | 🟠 Moyenne-Haute |
| M — Infrastructures | 3 cartes | 🟠 Moyenne-Haute |
| N — Documents & Signature | 2 cartes | 🟡 Moyenne |
| O — Communication | 4 cartes | 🟠 Moyenne-Haute |
| P — Analytics & IA | 3 cartes | 🟡 Moyenne |
| Q — Sécurité | 2 cartes | 🔴 Haute |
| R — Localisation | 2 cartes | 🟢 Basse |
| S — Performance & Prod | 3 cartes | 🟠 Moyenne-Haute |
| T — Tests | 2 cartes | 🟡 Moyenne |
| **TOTAL** | **69 nouvelles cartes** | — |

---

> **Note :** Les tâches marquées `priorité-haute` (🔴) correspondent aux fonctionnalités critiques pour l'adoption (PWA enseignant, inscription élèves, Mobile Money, examens officiels) et à la sécurité. Elles sont recommandées pour la prochaine sprint.
