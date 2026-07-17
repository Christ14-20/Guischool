/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createSchoolAction } from "../actions";
import { Building2, Mail, Phone, User, Check, Copy, AlertTriangle, Key, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
}

interface CreateSchoolFormProps {
  plans: Plan[];
}

export default function CreateSchoolForm({ plans }: CreateSchoolFormProps) {
  const [isPending, startTransition] = useTransition();
  
  // State for success credentials
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Field validation and API errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const handleCopyPassword = () => {
    if (successData?.director_account?.temporary_password) {
      navigator.clipboard.writeText(successData.director_account.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    
    // Quick client-side phone validation format check (+224 followed by 9 digits)
    const phone = formData.get("contact_phone") as string;
    if (phone && !/^\+224\d{9}$/.test(phone)) {
      setFieldErrors({ contact_phone: ["Le numéro de téléphone doit être au format guinéen (+224XXXXXXXXX)."] });
      return;
    }

    startTransition(async () => {
      const res = await createSchoolAction(null, formData);
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
            <h2 className="text-xl font-bold text-white">Établissement créé avec succès !</h2>
            <p className="text-slate-400 text-sm">L’école et son compte directeur ont été initialisés.</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block">Nom</span>
              <span className="text-white font-medium">{successData.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Sous-domaine</span>
              <span className="text-indigo-400 font-mono font-medium">{successData.slug}.eduguinee.gn</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Key className="size-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Identifiants du Directeur</h3>
          </div>
          <p className="text-xs text-slate-400">
            IMPORTANT : Ce mot de passe temporaire ne sera affiché qu’une seule fois. Veuillez le copier et le transmettre de manière sécurisée au directeur.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 block">Email de connexion</label>
              <span className="text-sm font-semibold text-white">{successData.director_account?.email}</span>
            </div>
            <div className="relative">
              <label className="text-xs text-slate-500 block mb-1">Mot de passe temporaire</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.director_account?.temporary_password || ""}
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
            href="/superadmin/schools"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-colors"
          >
            Retourner à la liste
          </Link>
          <button
            onClick={() => setSuccessData(null)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Créer un autre établissement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Building2 className="size-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Ajouter un établissement</h2>
        </div>
        <Link
          href="/superadmin/schools"
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
        {/* Section 1 : Informations Générales */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Informations Générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Nom de l’établissement *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ex: Lycée Donka"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.name ? "border-destructive" : "border-slate-800"
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Type d’école *</label>
              <select
                name="school_type"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="PRIMAIRE">Primaire</option>
                <option value="COLLEGE">Collège</option>
                <option value="LYCEE">Lycée</option>
                <option value="MIXTE">Mixte</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Code Ministère (MINEDU)</label>
              <input
                type="text"
                name="code_minedu"
                placeholder="Ex: GN-CKY-00123"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Plan d’Abonnement *</label>
              <select
                name="plan_id"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {fieldErrors.plan_id && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.plan_id[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 : Contact Principal */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Contact Principal & Directeur
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Nom Complet du Directeur *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="contact_name"
                  required
                  placeholder="Mamadou Diallo"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.contact_name ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.contact_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.contact_name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Numéro de Téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="text"
                  name="contact_phone"
                  required
                  placeholder="+224620000000"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.contact_phone ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.contact_phone && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.contact_phone[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Adresse Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <input
                  type="email"
                  name="contact_email"
                  required
                  placeholder="directeur@ecole.gn"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                    fieldErrors.contact_email ? "border-destructive" : "border-slate-800"
                  }`}
                />
              </div>
              {fieldErrors.contact_email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.contact_email[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3 : Localisation */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Localisation (Optionnel)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Région</label>
              <input
                type="text"
                name="region"
                placeholder="Ex: Conakry"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Préfecture</label>
              <input
                type="text"
                name="prefecture"
                placeholder="Ex: Conakry"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Commune</label>
              <input
                type="text"
                name="commune"
                placeholder="Ex: Ratoma"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Quartier</label>
              <input
                type="text"
                name="quartier"
                placeholder="Ex: Nongo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-800 pt-6">
          <Link
            href="/superadmin/schools"
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
            Enregistrer l’établissement
          </button>
        </div>
      </form>
    </div>
  );
}
