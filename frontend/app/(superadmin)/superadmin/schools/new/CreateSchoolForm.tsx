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

const fieldClass =
  "w-full bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function CreateSchoolForm({ plans }: CreateSchoolFormProps) {
  const [isPending, startTransition] = useTransition();

  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
      <div className="max-w-[820px] mx-auto border border-ok/30 bg-card rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-4 text-ok">
          <div className="size-12 rounded-full bg-ok/10 flex items-center justify-center">
            <Check className="size-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium text-text">Établissement créé avec succès !</h2>
            <p className="text-text-soft text-sm">L&apos;école et son compte directeur ont été initialisés.</p>
          </div>
        </div>

        <div className="bg-paper-alt border border-line rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-faint block text-xs">Nom</span>
              <span className="text-text font-medium">{successData.name}</span>
            </div>
            <div>
              <span className="text-text-faint block text-xs">Sous-domaine</span>
              <span className="text-accent font-mono font-medium">{successData.slug}.eduguinee.gn</span>
            </div>
          </div>
        </div>

        <div className="bg-warn/5 border border-warn/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-warn">
            <Key className="size-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Identifiants du directeur</h3>
          </div>
          <p className="text-xs text-text-soft">
            IMPORTANT : Ce mot de passe temporaire ne sera affiché qu&apos;une seule fois. Veuillez le copier et le
            transmettre de manière sécurisée au directeur.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-faint block">Email de connexion</label>
              <span className="text-sm font-semibold text-text">{successData.director_account?.email}</span>
            </div>
            <div>
              <label className="text-xs text-text-faint block mb-1">Mot de passe temporaire</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.director_account?.temporary_password || ""}
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
            href="/superadmin/schools"
            className="px-5 py-2.5 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
          >
            Retourner à la liste
          </Link>
          <button
            onClick={() => setSuccessData(null)}
            className="px-5 py-2.5 bg-accent hover:opacity-90 text-white font-medium rounded-xl text-sm transition-opacity cursor-pointer"
          >
            Créer un autre établissement
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center max-w-[820px] mx-auto mb-[22px]">
        <div className="flex items-center gap-2.5">
          <div className="size-[30px] rounded-full border-[1.4px] border-line text-accent flex items-center justify-center">
            <Building2 className="size-3.5" />
          </div>
          <h1 className="font-serif text-xl font-medium m-0">Ajouter un établissement</h1>
        </div>
        <Link
          href="/superadmin/schools"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline"
        >
          <ArrowLeft className="size-3.5" />
          Retour
        </Link>
      </div>

      {errorMsg && (
        <div className="max-w-[820px] mx-auto mb-5 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-[820px] mx-auto border border-line bg-card rounded-xl shadow-[var(--shadow)] px-[26px]">
        {/* Section 1 */}
        <div className="py-7 border-t border-line first:border-t-0 first:pt-1">
          <div className="flex items-center gap-2.5 mb-[22px]">
            <span className="w-[3px] h-[13px] rounded-sm bg-accent" />
            <span className="text-[11px] tracking-[.1em] uppercase text-text-soft font-semibold">Informations générales</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Nom de l&apos;établissement *</label>
              <input type="text" name="name" required placeholder="Ex : Lycée Donka" className={fieldClass} />
              {fieldErrors.name && <p className="text-xs text-danger mt-1">{fieldErrors.name[0]}</p>}
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Type d&apos;école *</label>
              <select name="school_type" required className={fieldClass}>
                <option value="PRIMAIRE">Primaire</option>
                <option value="COLLEGE">Collège</option>
                <option value="LYCEE">Lycée</option>
                <option value="MIXTE">Mixte</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Code ministère (MINEDU)</label>
              <input type="text" name="code_minedu" placeholder="Ex : GN-CKY-00123" className={fieldClass} />
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Plan d&apos;abonnement *</label>
              <select name="plan_id" required className={fieldClass}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {fieldErrors.plan_id && <p className="text-xs text-danger mt-1">{fieldErrors.plan_id[0]}</p>}
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="py-7 border-t border-line">
          <div className="flex items-center gap-2.5 mb-[22px]">
            <span className="w-[3px] h-[13px] rounded-sm bg-accent" />
            <span className="text-[11px] tracking-[.1em] uppercase text-text-soft font-semibold">Contact principal &amp; directeur</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Nom complet du directeur *</label>
              <div className="relative">
                <User className="absolute left-[13px] top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="text"
                  name="contact_name"
                  required
                  placeholder="Mamadou Diallo"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {fieldErrors.contact_name && <p className="text-xs text-danger mt-1">{fieldErrors.contact_name[0]}</p>}
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Numéro de téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-[13px] top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="text"
                  name="contact_phone"
                  required
                  placeholder="+224 620 00 00 00"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {fieldErrors.contact_phone && <p className="text-xs text-danger mt-1">{fieldErrors.contact_phone[0]}</p>}
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Adresse email *</label>
              <div className="relative">
                <Mail className="absolute left-[13px] top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="email"
                  name="contact_email"
                  required
                  placeholder="directeur@ecole.gn"
                  className={`${fieldClass} pl-9`}
                />
              </div>
              {fieldErrors.contact_email && <p className="text-xs text-danger mt-1">{fieldErrors.contact_email[0]}</p>}
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="py-7 border-t border-line">
          <div className="flex items-center gap-2.5 mb-[22px]">
            <span className="w-[3px] h-[13px] rounded-sm bg-accent" />
            <span className="text-[11px] tracking-[.1em] uppercase text-text-soft font-semibold">Localisation (optionnel)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Région</label>
              <input type="text" name="region" placeholder="Ex : Conakry" className={fieldClass} />
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Préfecture</label>
              <input type="text" name="prefecture" placeholder="Ex : Conakry" className={fieldClass} />
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Commune</label>
              <input type="text" name="commune" placeholder="Ex : Ratoma" className={fieldClass} />
            </div>
            <div className="space-y-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Quartier</label>
              <input type="text" name="quartier" placeholder="Ex : Nongo" className={fieldClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 py-[26px] border-t border-line">
          <Link
            href="/superadmin/schools"
            className="px-4 py-2.5 rounded-lg border border-line bg-paper-alt text-text text-[13px] font-semibold hover:border-accent-line transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer l&apos;établissement
          </button>
        </div>
      </form>
    </>
  );
}
