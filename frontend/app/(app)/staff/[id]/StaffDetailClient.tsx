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
const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIF: { bg: "rgba(16, 185, 129, 0.1)", color: "#10B981", label: "Actif" },
  EN_CONGE: { bg: "rgba(14, 165, 233, 0.1)", color: "#0EA5E9", label: "En congé" },
  SUSPENDU: { bg: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", label: "Suspendu" },
  PARTI: { bg: "rgba(100, 116, 139, 0.1)", color: "#94A3B8", label: "Parti" },
};

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors";

export default function StaffDetailClient({ staff, subjects, permissionsCatalog }: Props) {
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xl font-bold">
              {staff.first_name?.[0]}{staff.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {staff.first_name} {staff.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-400">{staff.email}</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                    staff.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {staff.is_active ? "Actif" : "Inactif"}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                    staff.role?.name === "TEACHER"
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {ROLE_LABELS[staff.role?.name] ?? staff.role?.name}
                </span>
                {(() => {
                  const st = STATUT_STYLES[staff.statut] || STATUT_STYLES.ACTIF;
                  return (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium"
                      style={{ background: st.bg, color: st.color, borderColor: st.color + "33" }}
                    >
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Informations
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
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
                <label className="text-xs text-slate-500 uppercase tracking-wider">Prénom</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Nom</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+224620000010"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  value={staff.email}
                  disabled
                  className={`${inputClass} opacity-50 cursor-not-allowed`}
                />
                <p className="text-[10px] text-slate-600">Non modifiable</p>
              </div>
            </div>

            {/* Informations RH (STAFF-V2-01) */}
            <div className="pt-2 border-t border-slate-800/60">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Informations RH</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Sexe</label>
                  <select value={sexe} onChange={(e) => setSexe(e.target.value)} className={inputClass}>
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Date d&apos;embauche</label>
                  <input
                    type="date"
                    value={dateEmbauche}
                    onChange={(e) => setDateEmbauche(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Type de contrat</label>
                  <select value={typeContrat} onChange={(e) => setTypeContrat(e.target.value)} className={inputClass}>
                    <option value="">Non renseigné</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="STAGE">Stage</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Numéro CNSS</label>
                  <input
                    value={numeroCnss}
                    onChange={(e) => setNumeroCnss(e.target.value)}
                    placeholder="Ex: CNSS-00123456"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Statut RH</label>
                  <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputClass}>
                    <option value="ACTIF">Actif</option>
                    <option value="EN_CONGE">En congé</option>
                    <option value="SUSPENDU">Suspendu</option>
                    <option value="PARTI">Parti</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Type de compte de paie</label>
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
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Numéro de compte / téléphone de paie</label>
                  <input
                    value={numeroComptePaie}
                    onChange={(e) => setNumeroComptePaie(e.target.value)}
                    placeholder="Ex: BICIGUI-00998877"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">
                Le statut RH n&apos;a aucun effet sur l&apos;accès au compte — utilisez Désactiver/Réactiver ci-dessous pour ça.
              </p>
            </div>

            {/* Subjects editable (TEACHER) */}
            {staff.role?.name === "TEACHER" && subjects.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Matières enseignées</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {subjects.map((s) => {
                    const isSelected = selectedSubjects.includes(s.code);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.code)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <span
                          className={`size-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-indigo-500 border-indigo-500"
                              : "border-slate-600"
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
              <p className="text-xs text-destructive">{editError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
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
                  setEditError(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <User className="size-3.5 inline mr-1" />
                Prénom
              </span>
              <span className="text-white font-medium">{staff.first_name || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <User className="size-3.5 inline mr-1" />
                Nom
              </span>
              <span className="text-white font-medium">{staff.last_name || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <Mail className="size-3.5 inline mr-1" />
                Email
              </span>
              <span className="text-white font-medium">{staff.email}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <Phone className="size-3.5 inline mr-1" />
                Téléphone
              </span>
              <span className="text-white font-medium">{staff.phone || "—"}</span>
            </div>
            {staff.role?.name === "TEACHER" && (staff.subjects_taught ?? []).length > 0 && (
              <div className="md:col-span-2">
                <span className="text-xs text-slate-500 block uppercase tracking-wider">
                  <BookOpen className="size-3.5 inline mr-1" />
                  Matières enseignées
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(staff.subjects_taught ?? []).map((code: string) => (
                    <span
                      key={code}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-medium bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">Rôle</span>
              <span className="text-white font-medium">
                {ROLE_LABELS[staff.role?.name] ?? staff.role?.name ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <Cake className="size-3.5 inline mr-1" />
                Date de naissance
              </span>
              <span className="text-white font-medium">{staff.date_naissance || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">Sexe</span>
              <span className="text-white font-medium">{SEXE_LABELS[staff.sexe] || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <Briefcase className="size-3.5 inline mr-1" />
                Date d&apos;embauche
              </span>
              <span className="text-white font-medium">{staff.date_embauche || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">Type de contrat</span>
              <span className="text-white font-medium">{CONTRAT_LABELS[staff.type_contrat] || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <IdCard className="size-3.5 inline mr-1" />
                Numéro CNSS
              </span>
              <span className="text-white font-medium">{staff.numero_cnss || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase tracking-wider">
                <Landmark className="size-3.5 inline mr-1" />
                Compte de paie
              </span>
              <span className="text-white font-medium">
                {staff.type_compte_paie
                  ? `${COMPTE_PAIE_LABELS[staff.type_compte_paie]}${staff.numero_compte_paie ? " — " + staff.numero_compte_paie : ""}`
                  : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Permissions individuelles / rôles composites (STAFF-V2-03) */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Permissions individuelles
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Ajoutées au-delà du rôle {ROLE_LABELS[staff.role?.name] ?? staff.role?.name} — simule un rôle composite sans en créer un nouveau.
            </p>
          </div>
          {!editingPermissions && permissionsCatalog.length > 0 && (
            <button
              onClick={() => {
                setPermError(null);
                setSelectedPermissions(staff.custom_permissions ?? []);
                setEditingPermissions(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0"
            >
              <Pencil className="size-3.5" />
              Modifier
            </button>
          )}
        </div>

        {permissionsCatalog.length === 0 ? (
          <p className="text-xs text-slate-600">Catalogue des permissions indisponible.</p>
        ) : editingPermissions ? (
          <div className="space-y-4">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module}>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{module}</p>
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                          roleGranted
                            ? "bg-slate-900 border-slate-800/60 text-slate-600 cursor-not-allowed"
                            : isSelected
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300 cursor-pointer"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 cursor-pointer"
                        }`}
                      >
                        <span
                          className={`size-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            roleGranted
                              ? "bg-slate-800 border-slate-700"
                              : isSelected
                              ? "bg-indigo-500 border-indigo-500"
                              : "border-slate-600"
                          }`}
                        >
                          {roleGranted ? (
                            <Lock className="size-2.5 text-slate-500" />
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

            {permError && <p className="text-xs text-destructive">{permError}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePermissions}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : (staff.custom_permissions ?? []).length === 0 ? (
          <p className="text-xs text-slate-600">Aucune permission individuelle — rôle de base uniquement.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(staff.custom_permissions ?? []).map((code: string) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              >
                <KeyRound className="size-3" />
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Actions
        </h3>

        {actionError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
            {actionError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {staff.is_active ? (
            <button
              onClick={() => {
                setActionError(null);
                setShowDisableModal(true);
              }}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
              Désactiver
            </button>
          ) : (
            <button
              onClick={handleEnable}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Réactiver
            </button>
          )}
          <button
            onClick={() => {
              setChangeRoleError(null);
              setNewRole(CHANGE_ROLE_OPTIONS.find((r) => r !== staff.role?.name) || CHANGE_ROLE_OPTIONS[0]);
              setShowChangeRoleModal(true);
            }}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <Repeat className="size-4" />
            Changer de rôle
          </button>
        </div>

        {/* Disable Confirmation Modal */}
        {showDisableModal && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Désactiver le compte</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Voulez-vous vraiment désactiver le compte de{" "}
                  <strong>{staff.first_name} {staff.last_name}</strong> ?
                  Cette personne ne pourra plus se connecter.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDisable}
                  disabled={isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Changer de rôle</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Rôle actuel : <strong>{ROLE_LABELS[staff.role?.name] ?? staff.role?.name}</strong>.
                  {staff.role?.name === "TEACHER" && (staff.subjects_taught ?? []).length > 0 && (
                    <> Les matières enseignées seront réinitialisées si le nouveau rôle n&apos;est pas Enseignant.</>
                  )}
                </p>
              </div>

              {changeRoleError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                  {changeRoleError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Nouveau rôle</label>
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangeRole}
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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
    </div>
  );
}
