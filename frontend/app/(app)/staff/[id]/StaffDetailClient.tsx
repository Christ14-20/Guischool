/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Loader2,
  ShieldAlert,
  PlayCircle,
  Check,
  X,
  Pencil,
  Cake,
  Briefcase,
  Landmark,
  IdCard,
  Repeat,
  KeyRound,
  Lock,
} from "lucide-react";
import {
  updateStaffAction,
  disableStaffAction,
  enableStaffAction,
  changeRoleStaffAction,
  updateCustomPermissionsAction,
} from "../actions";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface PermissionCatalogItem {
  codename: string;
  name: string;
  module: string;
}

interface Props {
  staff: any;
  subjects: Subject[];
  permissionsCatalog: PermissionCatalogItem[];
  viewerPermissions?: string[];
}

// STAFF-V2-02 : ACCOUNTANT ajouté — absent jusqu'ici bien que déjà créable
// (résidu pré-existant, corrigé en marge car change-role rend ce rôle
// couramment rencontré sur cette page).
const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Enseignant",
  STUDENT_STUDIES: "Études",
  ACCOUNTANT: "Comptable",
};

// Mêmes rôles cibles que la création (ALLOWED_CREATE_ROLES côté backend).
const CHANGE_ROLE_OPTIONS = ["TEACHER", "STUDENT_STUDIES", "ACCOUNTANT"];

const SEXE_LABELS: Record<string, string> = { M: "Masculin", F: "Féminin" };
const CONTRAT_LABELS: Record<string, string> = {
  CDI: "CDI", CDD: "CDD", VACATAIRE: "Vacataire", STAGE: "Stage",
};
const COMPTE_PAIE_LABELS: Record<string, string> = {
  BANQUE: "Compte bancaire", ORANGE_MONEY: "Orange Money", ESPECES: "Espèces",
};
const GRADE_LABELS: Record<string, string> = {
  INSTITUTEUR_ADJOINT: "Instituteur adjoint",
  INSTITUTEUR: "Instituteur",
  PROFESSEUR_ADJOINT: "Professeur adjoint d'enseignement secondaire",
  PROFESSEUR_ENS_SECONDAIRE: "Professeur d'enseignement secondaire",
  PROFESSEUR_CERTIFIE: "Professeur certifié",
};
const STATUT_EMPLOI_LABELS: Record<string, string> = {
  TITULAIRE: "Titulaire", CONTRACTUEL: "Contractuel", VACATAIRE: "Vacataire",
};
const STATUT_STYLES: Record<string, { color: string; label: string }> = {
  ACTIF: { color: "var(--ok)", label: "Actif" },
  EN_CONGE: { color: "var(--info)", label: "En congé" },
  SUSPENDU: { color: "var(--warn)", label: "Suspendu" },
  PARTI: { color: "var(--mute)", label: "Parti" },
};

const inputClass =
  "w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function StaffDetailClient({ staff, subjects, permissionsCatalog, viewerPermissions }: Props) {
  const canUpdate = hasPermission(viewerPermissions, PERMISSIONS.STAFF_UPDATE);
  const canDisable = hasPermission(viewerPermissions, PERMISSIONS.STAFF_DISABLE);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(staff.first_name || "");
  const [lastName, setLastName] = useState(staff.last_name || "");
  const [phone, setPhone] = useState(staff.phone || "");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    staff.subjects_taught ?? []
  );
  const [dateNaissance, setDateNaissance] = useState(staff.date_naissance || "");
  const [sexe, setSexe] = useState(staff.sexe || "");
  const [dateEmbauche, setDateEmbauche] = useState(staff.date_embauche || "");
  const [typeContrat, setTypeContrat] = useState(staff.type_contrat || "");
  const [numeroCnss, setNumeroCnss] = useState(staff.numero_cnss || "");
  const [typeComptePaie, setTypeComptePaie] = useState(staff.type_compte_paie || "");
  const [numeroComptePaie, setNumeroComptePaie] = useState(staff.numero_compte_paie || "");
  const [statut, setStatut] = useState(staff.statut || "ACTIF");
  const [grade, setGrade] = useState(staff.grade || "");
  const [statutEmploi, setStatutEmploi] = useState(staff.statut_emploi || "");
  const [accessStartDate, setAccessStartDate] = useState(staff.access_start_date || "");
  const [accessEndDate, setAccessEndDate] = useState(staff.access_end_date || "");
  const [editError, setEditError] = useState<string | null>(null);

  // Disable/Reactivate modal
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Change-role modal (STAFF-V2-02)
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [newRole, setNewRole] = useState(
    CHANGE_ROLE_OPTIONS.find((r) => r !== staff.role?.name) || CHANGE_ROLE_OPTIONS[0]
  );
  const [changeRoleError, setChangeRoleError] = useState<string | null>(null);

  // Permissions individuelles / rôles composites (STAFF-V2-03)
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    staff.custom_permissions ?? []
  );
  const [permError, setPermError] = useState<string | null>(null);

  const rolePermissionSet = new Set<string>(staff.role?.permissions ?? []);
  const permissionsByModule = permissionsCatalog.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {} as Record<string, PermissionCatalogItem[]>);

  const togglePermission = (codename: string) => {
    if (rolePermissionSet.has(codename)) return;
    setSelectedPermissions((prev) =>
      prev.includes(codename) ? prev.filter((c) => c !== codename) : [...prev, codename]
    );
  };

  const handleSavePermissions = () => {
    setPermError(null);
    startTransition(async () => {
      const res = await updateCustomPermissionsAction(staff.id, selectedPermissions);
      if (res.success) {
        setEditingPermissions(false);
        router.refresh();
      } else {
        setPermError(res.error);
      }
    });
  };

  const handleChangeRole = () => {
    setChangeRoleError(null);
    startTransition(async () => {
      const res = await changeRoleStaffAction(staff.id, newRole);
      if (res.success) {
        setShowChangeRoleModal(false);
        router.refresh();
      } else {
        setChangeRoleError(res.error);
      }
    });
  };

  const toggleSubject = (code: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = () => {
    setEditError(null);
    if (phone && !/^\+224\d{9}$/.test(phone)) {
      setEditError("Le numéro doit être au format guinéen (+224XXXXXXXXX).");
      return;
    }
    startTransition(async () => {
      const res = await updateStaffAction(staff.id, {
        first_name: firstName,
        last_name: lastName,
        phone,
        subjects_taught: selectedSubjects,
        date_naissance: dateNaissance || null,
        sexe,
        date_embauche: dateEmbauche || null,
        type_contrat: typeContrat,
        numero_cnss: numeroCnss,
        type_compte_paie: typeComptePaie,
        numero_compte_paie: numeroComptePaie,
        statut,
        grade,
        statut_emploi: statutEmploi,
        access_start_date: accessStartDate || null,
        access_end_date: accessEndDate || null,
      });
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else {
        setEditError(res.error || "Erreur lors de la mise à jour.");
      }
    });
  };

  const handleDisable = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await disableStaffAction(staff.id);
      if (res.success) {
        setShowDisableModal(false);
        router.refresh();
      } else {
        setActionError(res.error);
      }
    });
  };

  const handleEnable = () => {
    if (!confirm(`Voulez-vous vraiment réactiver le compte de ${staff.first_name} ${staff.last_name} ?`)) return;
    setActionError(null);
    startTransition(async () => {
      const res = await enableStaffAction(staff.id);
      if (res.success) {
        router.refresh();
      } else {
        setActionError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-xl font-semibold">
              {staff.first_name?.[0]}{staff.last_name?.[0]}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-medium">
                {staff.first_name} {staff.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-text-soft">{staff.email}</span>
                <span
                  className="inline-flex items-center gap-[7px] text-[12.5px]"
                  style={{ color: staff.is_active ? "var(--ok)" : "var(--danger)" }}
                >
                  <span
                    className="size-[9px] rounded-full border-2"
                    style={{ borderColor: staff.is_active ? "var(--ok)" : "var(--danger)" }}
                  />
                  {staff.is_active ? "Actif" : "Inactif"}
                </span>
                <span
                  className="inline-flex items-center gap-[7px] text-[12.5px]"
                  style={{ color: staff.role?.name === "TEACHER" ? "var(--accent)" : "var(--ok)" }}
                >
                  <span
                    className="size-[9px] rounded-full border-2"
                    style={{ borderColor: staff.role?.name === "TEACHER" ? "var(--accent)" : "var(--ok)" }}
                  />
                  {ROLE_LABELS[staff.role?.name] ?? staff.role?.name}
                </span>
                {(() => {
                  const st = STATUT_STYLES[staff.statut] || STATUT_STYLES.ACTIF;
                  return (
                    <span
                      className="inline-flex items-center gap-[7px] text-[12.5px]"
                      style={{ color: st.color }}
                    >
                      <span className="size-[9px] rounded-full border-2" style={{ borderColor: st.color }} />
                      {st.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / Info Card */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Informations
          </h3>
          {canUpdate && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:opacity-80 cursor-pointer"
            >
              <Pencil className="size-3.5" />
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Prénom</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Nom</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+224620000010"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Email</label>
                <input
                  value={staff.email}
                  disabled
                  className={`${inputClass} opacity-50 cursor-not-allowed`}
                />
                <p className="text-[10px] text-text-faint">Non modifiable</p>
              </div>
            </div>

            {/* Informations RH (STAFF-V2-01) */}
            <div className="pt-2 border-t border-line">
              <p className="text-[10.5px] text-text-faint uppercase tracking-[.08em] mb-3">Informations RH</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Sexe</label>
                  <select value={sexe} onChange={(e) => setSexe(e.target.value)} className={inputClass}>
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Date d&apos;embauche</label>
                  <input
                    type="date"
                    value={dateEmbauche}
                    onChange={(e) => setDateEmbauche(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Type de contrat</label>
                  <select value={typeContrat} onChange={(e) => setTypeContrat(e.target.value)} className={inputClass}>
                    <option value="">Non renseigné</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="STAGE">Stage</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Numéro CNSS</label>
                  <input
                    value={numeroCnss}
                    onChange={(e) => setNumeroCnss(e.target.value)}
                    placeholder="Ex: CNSS-00123456"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Statut RH</label>
                  <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputClass}>
                    <option value="ACTIF">Actif</option>
                    <option value="EN_CONGE">En congé</option>
                    <option value="SUSPENDU">Suspendu</option>
                    <option value="PARTI">Parti</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Type de compte de paie</label>
                  <select
                    value={typeComptePaie}
                    onChange={(e) => setTypeComptePaie(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Non renseigné</option>
                    <option value="BANQUE">Compte bancaire</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="ESPECES">Espèces</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Numéro de compte / téléphone de paie</label>
                  <input
                    value={numeroComptePaie}
                    onChange={(e) => setNumeroComptePaie(e.target.value)}
                    placeholder="Ex: BICIGUI-00998877"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-faint mt-2">
                Le statut RH n&apos;a aucun effet sur l&apos;accès au compte — utilisez Désactiver/Réactiver ci-dessous pour ça.
              </p>
            </div>

            {/* Spécificités enseignant (STAFF-V2-04, TEACHER only) */}
            {staff.role?.name === "TEACHER" && (
              <div className="pt-2 border-t border-line space-y-3">
                <p className="text-[10.5px] text-text-faint uppercase tracking-[.08em] mb-1">Spécificités enseignant</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Grade</label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                      <option value="">Non renseigné</option>
                      <option value="INSTITUTEUR_ADJOINT">Instituteur adjoint</option>
                      <option value="INSTITUTEUR">Instituteur</option>
                      <option value="PROFESSEUR_ADJOINT">Professeur adjoint d&apos;enseignement secondaire</option>
                      <option value="PROFESSEUR_ENS_SECONDAIRE">Professeur d&apos;enseignement secondaire</option>
                      <option value="PROFESSEUR_CERTIFIE">Professeur certifié</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Statut d&apos;emploi</label>
                    <select value={statutEmploi} onChange={(e) => setStatutEmploi(e.target.value)} className={inputClass}>
                      <option value="">Non renseigné</option>
                      <option value="TITULAIRE">Titulaire</option>
                      <option value="CONTRACTUEL">Contractuel</option>
                      <option value="VACATAIRE">Vacataire</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Accès valide à partir du</label>
                    <input
                      type="date"
                      value={accessStartDate}
                      onChange={(e) => setAccessStartDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Accès valide jusqu&apos;au</label>
                    <input
                      type="date"
                      value={accessEndDate}
                      onChange={(e) => setAccessEndDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-text-faint">
                  Laissez les dates d&apos;accès vides pour un compte permanent. En dehors de cette période, le compte
                  ne peut plus se connecter (compte enseignant invité/remplaçant).
                </p>
              </div>
            )}

            {/* Subjects editable (TEACHER) */}
            {staff.role?.name === "TEACHER" && subjects.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Matières enseignées</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {subjects.map((s) => {
                    const isSelected = selectedSubjects.includes(s.code);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.code)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-accent-soft border-accent-line text-accent"
                            : "bg-paper-alt border-line text-text-faint hover:border-accent-line"
                        }`}
                      >
                        <span
                          className={`size-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-accent border-accent"
                              : "border-line"
                          }`}
                        >
                          {isSelected && <Check className="size-3 text-white" />}
                        </span>
                        <span className="text-xs font-medium">{s.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editError && (
              <p className="text-xs text-danger">{editError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setFirstName(staff.first_name || "");
                  setLastName(staff.last_name || "");
                  setPhone(staff.phone || "");
                  setSelectedSubjects(staff.subjects_taught ?? []);
                  setDateNaissance(staff.date_naissance || "");
                  setSexe(staff.sexe || "");
                  setDateEmbauche(staff.date_embauche || "");
                  setTypeContrat(staff.type_contrat || "");
                  setNumeroCnss(staff.numero_cnss || "");
                  setTypeComptePaie(staff.type_compte_paie || "");
                  setNumeroComptePaie(staff.numero_compte_paie || "");
                  setStatut(staff.statut || "ACTIF");
                  setGrade(staff.grade || "");
                  setStatutEmploi(staff.statut_emploi || "");
                  setAccessStartDate(staff.access_start_date || "");
                  setAccessEndDate(staff.access_end_date || "");
                  setEditError(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <User className="size-3.5 inline mr-1" />
                Prénom
              </span>
              <span className="font-medium">{staff.first_name || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <User className="size-3.5 inline mr-1" />
                Nom
              </span>
              <span className="font-medium">{staff.last_name || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <Mail className="size-3.5 inline mr-1" />
                Email
              </span>
              <span className="font-medium">{staff.email}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <Phone className="size-3.5 inline mr-1" />
                Téléphone
              </span>
              <span className="font-medium">{staff.phone || "—"}</span>
            </div>
            {staff.role?.name === "TEACHER" && (staff.subjects_taught ?? []).length > 0 && (
              <div className="md:col-span-2">
                <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                  <BookOpen className="size-3.5 inline mr-1" />
                  Matières enseignées
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(staff.subjects_taught ?? []).map((code: string) => (
                    <span
                      key={code}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-soft text-accent"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {staff.role?.name === "TEACHER" && (staff.grade || staff.statut_emploi || staff.access_start_date || staff.access_end_date) && (
              <>
                {staff.grade && (
                  <div>
                    <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Grade</span>
                    <span className="font-medium">{GRADE_LABELS[staff.grade] ?? staff.grade}</span>
                  </div>
                )}
                {staff.statut_emploi && (
                  <div>
                    <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Statut d&apos;emploi</span>
                    <span className="font-medium">{STATUT_EMPLOI_LABELS[staff.statut_emploi] ?? staff.statut_emploi}</span>
                  </div>
                )}
                {(staff.access_start_date || staff.access_end_date) && (
                  <div className="md:col-span-2">
                    <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Fenêtre d&apos;accès</span>
                    <span className="font-medium">
                      {staff.access_start_date || "—"} → {staff.access_end_date || "—"}
                    </span>
                  </div>
                )}
              </>
            )}
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Rôle</span>
              <span className="font-medium">
                {ROLE_LABELS[staff.role?.name] ?? staff.role?.name ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <Cake className="size-3.5 inline mr-1" />
                Date de naissance
              </span>
              <span className="font-medium">{staff.date_naissance || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Sexe</span>
              <span className="font-medium">{SEXE_LABELS[staff.sexe] || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <Briefcase className="size-3.5 inline mr-1" />
                Date d&apos;embauche
              </span>
              <span className="font-medium">{staff.date_embauche || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">Type de contrat</span>
              <span className="font-medium">{CONTRAT_LABELS[staff.type_contrat] || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <IdCard className="size-3.5 inline mr-1" />
                Numéro CNSS
              </span>
              <span className="font-medium">{staff.numero_cnss || "—"}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-text-faint block uppercase tracking-[.08em]">
                <Landmark className="size-3.5 inline mr-1" />
                Compte de paie
              </span>
              <span className="font-medium">
                {staff.type_compte_paie
                  ? `${COMPTE_PAIE_LABELS[staff.type_compte_paie]}${staff.numero_compte_paie ? " — " + staff.numero_compte_paie : ""}`
                  : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Permissions individuelles / rôles composites (STAFF-V2-03) */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
              Permissions individuelles
            </h3>
            <p className="text-xs text-text-faint mt-1">
              Ajoutées au-delà du rôle {ROLE_LABELS[staff.role?.name] ?? staff.role?.name} — simule un rôle composite sans en créer un nouveau.
            </p>
          </div>
          {canUpdate && !editingPermissions && permissionsCatalog.length > 0 && (
            <button
              onClick={() => {
                setPermError(null);
                setSelectedPermissions(staff.custom_permissions ?? []);
                setEditingPermissions(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:opacity-80 cursor-pointer shrink-0"
            >
              <Pencil className="size-3.5" />
              Modifier
            </button>
          )}
        </div>

        {permissionsCatalog.length === 0 ? (
          <p className="text-xs text-text-faint">Catalogue des permissions indisponible.</p>
        ) : editingPermissions ? (
          <div className="space-y-4">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module}>
                <p className="text-[10.5px] text-text-faint uppercase tracking-[.08em] mb-2">{module}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {perms.map((p) => {
                    const roleGranted = rolePermissionSet.has(p.codename);
                    const isSelected = roleGranted || selectedPermissions.includes(p.codename);
                    return (
                      <button
                        key={p.codename}
                        type="button"
                        disabled={roleGranted}
                        onClick={() => togglePermission(p.codename)}
                        title={roleGranted ? "Déjà inclus via le rôle" : p.name}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                          roleGranted
                            ? "bg-paper-alt border-line text-text-faint opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-accent-soft border-accent-line text-accent cursor-pointer"
                            : "bg-paper-alt border-line text-text-faint hover:border-accent-line cursor-pointer"
                        }`}
                      >
                        <span
                          className={`size-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            roleGranted
                              ? "bg-paper-alt border-line"
                              : isSelected
                              ? "bg-accent border-accent"
                              : "border-line"
                          }`}
                        >
                          {roleGranted ? (
                            <Lock className="size-2.5 text-text-faint" />
                          ) : (
                            isSelected && <Check className="size-3 text-white" />
                          )}
                        </span>
                        <span className="text-xs font-medium truncate">{p.codename}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {permError && <p className="text-xs text-danger">{permError}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePermissions}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setEditingPermissions(false);
                  setSelectedPermissions(staff.custom_permissions ?? []);
                  setPermError(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : (staff.custom_permissions ?? []).length === 0 ? (
          <p className="text-xs text-text-faint">Aucune permission individuelle — rôle de base uniquement.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(staff.custom_permissions ?? []).map((code: string) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-soft text-accent"
              >
                <KeyRound className="size-3" />
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {(canDisable || canUpdate) && (
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
        <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
          Actions
        </h3>

        {actionError && (
          <div className="p-3 rounded-lg text-xs bg-danger/10 border border-danger/20 text-danger">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canDisable && (staff.is_active ? (
            <button
              onClick={() => {
                setActionError(null);
                setShowDisableModal(true);
              }}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              style={{ color: "var(--warn)", boxShadow: "inset 0 0 0 1px var(--warn)" }}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
              Désactiver
            </button>
          ) : (
            <button
              onClick={handleEnable}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              style={{ color: "var(--ok)", boxShadow: "inset 0 0 0 1px var(--ok)" }}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Réactiver
            </button>
          ))}
          {canUpdate && (
            <button
              onClick={() => {
                setChangeRoleError(null);
                setNewRole(CHANGE_ROLE_OPTIONS.find((r) => r !== staff.role?.name) || CHANGE_ROLE_OPTIONS[0]);
                setShowChangeRoleModal(true);
              }}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-accent text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              style={{ boxShadow: "inset 0 0 0 1px var(--accent-line)" }}
            >
              <Repeat className="size-4" />
              Changer de rôle
            </button>
          )}
        </div>

        {/* Disable Confirmation Modal */}
        {showDisableModal && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-[var(--shadow)] space-y-4">
              <div>
                <h3 className="font-serif text-lg font-medium">Désactiver le compte</h3>
                <p className="text-text-soft text-sm mt-1">
                  Voulez-vous vraiment désactiver le compte de{" "}
                  <strong>{staff.first_name} {staff.last_name}</strong> ?
                  Cette personne ne pourra plus se connecter.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 rounded-lg border border-line text-text-soft font-medium text-sm hover:border-accent-line hover:text-text transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDisable}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                  style={{ background: "var(--warn)" }}
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirmer la désactivation
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Change Role Modal (STAFF-V2-02) */}
        {showChangeRoleModal && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-[var(--shadow)] space-y-4">
              <div>
                <h3 className="font-serif text-lg font-medium">Changer de rôle</h3>
                <p className="text-text-soft text-sm mt-1">
                  Rôle actuel : <strong>{ROLE_LABELS[staff.role?.name] ?? staff.role?.name}</strong>.
                  {staff.role?.name === "TEACHER" && (staff.subjects_taught ?? []).length > 0 && (
                    <> Les matières enseignées seront réinitialisées si le nouveau rôle n&apos;est pas Enseignant.</>
                  )}
                </p>
              </div>

              {changeRoleError && (
                <div className="p-3 rounded-lg text-xs bg-danger/10 border border-danger/20 text-danger">
                  {changeRoleError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10.5px] text-text-faint uppercase tracking-[.08em]">Nouveau rôle</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={inputClass}>
                  {CHANGE_ROLE_OPTIONS.filter((r) => r !== staff.role?.name).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangeRoleModal(false)}
                  className="px-4 py-2 rounded-lg border border-line text-text-soft font-medium text-sm hover:border-accent-line hover:text-text transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangeRole}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium text-sm transition-opacity flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      )}
    </div>
  );
}
