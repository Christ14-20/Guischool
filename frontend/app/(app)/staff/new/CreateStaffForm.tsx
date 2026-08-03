/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createStaffAction } from "../actions";
import {
  Mail,
  User,
  Phone,
  Check,
  Copy,
  Key,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  UserPlus,
  Cake,
  Briefcase,
  Landmark,
} from "lucide-react";
import Link from "next/link";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface CreateStaffFormProps {
  subjects: Subject[];
}

const ROLE_OPTIONS = [
  { value: "TEACHER", label: "Enseignant" },
  { value: "STUDENT_STUDIES", label: "Études" },
  { value: "ACCOUNTANT", label: "Comptable" },
];

const fieldClass =
  "w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function CreateStaffForm({ subjects }: CreateStaffFormProps) {
  const [isPending, startTransition] = useTransition();
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const [selectedRole, setSelectedRole] = useState("TEACHER");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleCopyPassword = () => {
    if (successData?.temporary_password) {
      navigator.clipboard.writeText(successData.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSubject = (code: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("subjects_taught", selectedSubjects.join(","));

    const phone = formData.get("phone") as string;
    if (phone && !/^\+224\d{9}$/.test(phone)) {
      setFieldErrors({ phone: ["Le numéro doit être au format guinéen (+224XXXXXXXXX)."] });
      return;
    }

    startTransition(async () => {
      const res = await createStaffAction(null, formData);
      if (res.success) {
        setSuccessData(res.data);
      } else {
        setErrorMsg(res.error);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
      }
    });
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto border border-ok/30 bg-card rounded-2xl p-8 shadow-[var(--shadow)] space-y-6">
        <div className="flex items-center gap-4 text-ok">
          <div className="h-12 w-12 rounded-full bg-ok/10 flex items-center justify-center">
            <Check className="size-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium text-text">Compte créé avec succès !</h2>
            <p className="text-text-soft text-sm">Le membre du personnel a été ajouté.</p>
          </div>
        </div>

        <div className="bg-paper-alt border border-line rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-faint block text-xs">Nom</span>
              <span className="font-medium">{successData.first_name} {successData.last_name}</span>
            </div>
            <div>
              <span className="text-text-faint block text-xs">Email</span>
              <span className="font-medium">{successData.email}</span>
            </div>
            <div>
              <span className="text-text-faint block text-xs">Rôle</span>
              <span className="font-medium">{successData.role?.label}</span>
            </div>
          </div>
        </div>

        <div className="bg-warn/5 border border-warn/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-warn">
            <Key className="size-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Mot de passe temporaire</h3>
          </div>
          <p className="text-xs text-text-soft">
            IMPORTANT : Ce mot de passe ne sera plus jamais affiché. Veuillez le copier
            et le transmettre de manière sécurisée au membre du personnel.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs text-text-faint block mb-1">Mot de passe temporaire</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.temporary_password || ""}
                  className="flex-1 bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm font-mono text-warn outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-4 bg-warn hover:opacity-90 text-white rounded-lg text-xs font-semibold transition-opacity flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/staff"
            className="px-5 py-2.5 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
          >
            Retourner à la liste
          </Link>
          <button
            onClick={() => setSuccessData(null)}
            className="px-5 py-2.5 bg-accent hover:opacity-90 text-white font-medium rounded-xl text-sm transition-opacity cursor-pointer"
          >
            Créer un autre membre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto border border-line bg-card rounded-2xl p-8 shadow-[var(--shadow)] space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <UserPlus className="size-6 text-accent" />
          <h2 className="font-serif text-xl font-medium">Ajouter un membre du personnel</h2>
        </div>
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-accent transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
        <div className="space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
            Identité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Prénom *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="text"
                  name="first_name"
                  required
                  placeholder="Aissatou"
                  className={`w-full bg-paper-alt border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors ${
                    fieldErrors.first_name ? "border-danger" : "border-line"
                  }`}
                />
              </div>
              {fieldErrors.first_name && (
                <p className="text-xs text-danger mt-1">{fieldErrors.first_name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Nom *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="text"
                  name="last_name"
                  required
                  placeholder="Bah"
                  className={`w-full bg-paper-alt border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors ${
                    fieldErrors.last_name ? "border-danger" : "border-line"
                  }`}
                />
              </div>
              {fieldErrors.last_name && (
                <p className="text-xs text-danger mt-1">{fieldErrors.last_name[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
            Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="enseignant@ecole.gn"
                  className={`w-full bg-paper-alt border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors ${
                    fieldErrors.email ? "border-danger" : "border-line"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-danger mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="text"
                  name="phone"
                  placeholder="+224620000010"
                  className={`w-full bg-paper-alt border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors ${
                    fieldErrors.phone ? "border-danger" : "border-line"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-danger mt-1">{fieldErrors.phone[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rôle */}
        <div className="space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
            Rôle
          </h3>
          <div className="space-y-2">
            <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Rôle *</label>
            <select
              name="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
              className={fieldClass}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Informations RH (STAFF-V2-01, toutes optionnelles) */}
        <div className="space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
            Informations RH (optionnel)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Date de naissance</label>
              <div className="relative">
                <Cake className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="date"
                  name="date_naissance"
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Sexe</label>
              <select name="sexe" defaultValue="" className={fieldClass}>
                <option value="">Non renseigné</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Date d&apos;embauche</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="date"
                  name="date_embauche"
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Type de contrat</label>
              <select name="type_contrat" defaultValue="" className={fieldClass}>
                <option value="">Non renseigné</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="VACATAIRE">Vacataire</option>
                <option value="STAGE">Stage</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Numéro CNSS</label>
              <input
                type="text"
                name="numero_cnss"
                placeholder="Ex: CNSS-00123456"
                className={fieldClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Type de compte de paie</label>
              <select name="type_compte_paie" defaultValue="" className={fieldClass}>
                <option value="">Non renseigné</option>
                <option value="BANQUE">Compte bancaire</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="ESPECES">Espèces</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Numéro de compte / téléphone de paie</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-faint" />
                <input
                  type="text"
                  name="numero_compte_paie"
                  placeholder="Ex: BICIGUI-00998877 ou +224620000099"
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Spécificités enseignant (STAFF-V2-04, TEACHER only) */}
        {selectedRole === "TEACHER" && (
          <div className="space-y-4">
            <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
              Spécificités enseignant (optionnel)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Grade</label>
                <select name="grade" defaultValue="" className={fieldClass}>
                  <option value="">Non renseigné</option>
                  <option value="INSTITUTEUR_ADJOINT">Instituteur adjoint</option>
                  <option value="INSTITUTEUR">Instituteur</option>
                  <option value="PROFESSEUR_ADJOINT">Professeur adjoint d&apos;enseignement secondaire</option>
                  <option value="PROFESSEUR_ENS_SECONDAIRE">Professeur d&apos;enseignement secondaire</option>
                  <option value="PROFESSEUR_CERTIFIE">Professeur certifié</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Statut d&apos;emploi</label>
                <select name="statut_emploi" defaultValue="" className={fieldClass}>
                  <option value="">Non renseigné</option>
                  <option value="TITULAIRE">Titulaire</option>
                  <option value="CONTRACTUEL">Contractuel</option>
                  <option value="VACATAIRE">Vacataire</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Accès valide à partir du</label>
                <input type="date" name="access_start_date" className={fieldClass} />
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Accès valide jusqu&apos;au</label>
                <input type="date" name="access_end_date" className={fieldClass} />
              </div>
            </div>
            <p className="text-[10px] text-text-faint">
              Laissez les dates d&apos;accès vides pour un compte permanent. Un compte enseignant invité
              (remplaçant, vacataire ponctuel) devient inaccessible en dehors de cette période.
            </p>
          </div>
        )}

        {/* Matières (TEACHER only) */}
        {selectedRole === "TEACHER" && subjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
              Matières enseignées
            </h3>
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

        {selectedRole === "TEACHER" && subjects.length === 0 && (
          <div className="text-xs text-text-faint italic">
            Aucune matière disponible. Veuillez d&apos;abord créer des matières dans la section Pédagogie.
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 border-t border-line pt-6">
          <Link
            href="/staff"
            className="px-5 py-2.5 rounded-lg border border-line text-text-soft font-medium text-sm hover:border-accent-line hover:text-text transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium text-sm transition-opacity flex items-center gap-2 cursor-pointer"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Créer le compte
          </button>
        </div>
      </form>
    </div>
  );
}
