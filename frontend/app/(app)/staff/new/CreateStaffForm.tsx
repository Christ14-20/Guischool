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
      <div className="max-w-2xl mx-auto bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 text-emerald-400">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Compte créé avec succès !</h2>
            <p className="text-slate-400 text-sm">Le membre du personnel a été ajouté.</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block">Nom</span>
              <span className="text-white font-medium">{successData.first_name} {successData.last_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email</span>
              <span className="text-white font-medium">{successData.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Rôle</span>
              <span className="text-white font-medium">{successData.role?.label}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Key className="size-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Mot de passe temporaire</h3>
          </div>
          <p className="text-xs text-slate-400">
            IMPORTANT : Ce mot de passe ne sera plus jamais affiché. Veuillez le copier
            et le transmettre de manière sécurisée au membre du personnel.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs text-slate-500 block mb-1">Mot de passe temporaire</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.temporary_password || ""}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-amber-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
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
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-colors"
          >
            Retourner à la liste
          </Link>
          <button
            onClick={() => setSuccessData(null)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Créer un autre membre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <UserPlus className="size-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Ajouter un membre du personnel</h2>
        </div>
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identité */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Identité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Prénom *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="first_name"
                  required
                  placeholder="Aissatou"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.first_name ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.first_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.first_name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Nom *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="last_name"
                  required
                  placeholder="Bah"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.last_name ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.last_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.last_name[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="enseignant@ecole.gn"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.email ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="phone"
                  placeholder="+224620000010"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.phone ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.phone[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rôle */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Rôle
          </h3>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase">Rôle *</label>
            <select
              name="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Informations RH (optionnel)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Date de naissance</label>
              <div className="relative">
                <Cake className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="date"
                  name="date_naissance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Sexe</label>
              <select
                name="sexe"
                defaultValue=""
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Non renseigné</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Date d&apos;embauche</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="date"
                  name="date_embauche"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Type de contrat</label>
              <select
                name="type_contrat"
                defaultValue=""
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Non renseigné</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="VACATAIRE">Vacataire</option>
                <option value="STAGE">Stage</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Numéro CNSS</label>
              <input
                type="text"
                name="numero_cnss"
                placeholder="Ex: CNSS-00123456"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Type de compte de paie</label>
              <select
                name="type_compte_paie"
                defaultValue=""
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Non renseigné</option>
                <option value="BANQUE">Compte bancaire</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="ESPECES">Espèces</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Numéro de compte / téléphone de paie</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="numero_compte_paie"
                  placeholder="Ex: BICIGUI-00998877 ou +224620000099"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Spécificités enseignant (STAFF-V2-04, TEACHER only) */}
        {selectedRole === "TEACHER" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
              Spécificités enseignant (optionnel)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Grade</label>
                <select
                  name="grade"
                  defaultValue=""
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Non renseigné</option>
                  <option value="INSTITUTEUR_ADJOINT">Instituteur adjoint</option>
                  <option value="INSTITUTEUR">Instituteur</option>
                  <option value="PROFESSEUR_ADJOINT">Professeur adjoint d&apos;enseignement secondaire</option>
                  <option value="PROFESSEUR_ENS_SECONDAIRE">Professeur d&apos;enseignement secondaire</option>
                  <option value="PROFESSEUR_CERTIFIE">Professeur certifié</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Statut d&apos;emploi</label>
                <select
                  name="statut_emploi"
                  defaultValue=""
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Non renseigné</option>
                  <option value="TITULAIRE">Titulaire</option>
                  <option value="CONTRACTUEL">Contractuel</option>
                  <option value="VACATAIRE">Vacataire</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Accès valide à partir du</label>
                <input
                  type="date"
                  name="access_start_date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Accès valide jusqu&apos;au</label>
                <input
                  type="date"
                  name="access_end_date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-600">
              Laissez les dates d&apos;accès vides pour un compte permanent. Un compte enseignant invité
              (remplaçant, vacataire ponctuel) devient inaccessible en dehors de cette période.
            </p>
          </div>
        )}

        {/* Matières (TEACHER only) */}
        {selectedRole === "TEACHER" && subjects.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
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

        {selectedRole === "TEACHER" && subjects.length === 0 && (
          <div className="text-xs text-slate-500 italic">
            Aucune matière disponible. Veuillez d&apos;abord créer des matières dans la section Pédagogie.
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-800 pt-6">
          <Link
            href="/staff"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Créer le compte
          </button>
        </div>
      </form>
    </div>
  );
}
