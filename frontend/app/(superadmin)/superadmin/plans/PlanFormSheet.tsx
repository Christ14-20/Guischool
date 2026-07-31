/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, X, Loader2, AlertTriangle, Users } from "lucide-react";
import { createPlanAction, updatePlanAction } from "./actions";

interface Plan {
  id: string;
  name: string;
  max_students: number;
  max_staff: number;
  price_monthly: string;
  is_active: boolean;
}

interface PlanFormSheetProps {
  plan: Plan | null;
  onClose: () => void;
}

export default function PlanFormSheet({ plan, onClose }: PlanFormSheetProps) {
  const router = useRouter();
  const isEdit = !!plan;
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [affectedTenants, setAffectedTenants] = useState<any[] | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    setAffectedTenants(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      max_students: Number(formData.get("max_students")),
      max_staff: Number(formData.get("max_staff")),
      price_monthly: formData.get("price_monthly") as string,
      is_active: formData.get("is_active") === "on",
    };

    startTransition(async () => {
      const res = isEdit
        ? await updatePlanAction(plan!.id, payload)
        : await createPlanAction(payload);

      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setErrorMsg(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (res.affectedTenants) setAffectedTenants(res.affectedTenants);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">
              {isEdit ? `Modifier « ${plan!.name} »` : "Créer un plan"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {affectedTenants && affectedTenants.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="size-4 shrink-0" />
              Établissements dépassant les nouvelles limites
            </div>
            <ul className="space-y-1 pl-1">
              {affectedTenants.map((t) => (
                <li key={t.id} className="flex justify-between font-mono">
                  <span>{t.name}</span>
                  <span>
                    {t.student_count} élèves / {t.staff_count} personnel
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nom du plan *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={plan?.name || ""}
              placeholder="Ex: Pro"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.name ? "border-destructive" : "border-slate-800"
              }`}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Limite élèves *
              </label>
              <input
                type="number"
                name="max_students"
                required
                min={0}
                defaultValue={plan?.max_students ?? 0}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.max_students ? "border-destructive" : "border-slate-800"
                }`}
              />
              {fieldErrors.max_students && (
                <p className="text-xs text-destructive">{fieldErrors.max_students[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Limite personnel *
              </label>
              <input
                type="number"
                name="max_staff"
                required
                min={0}
                defaultValue={plan?.max_staff ?? 0}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.max_staff ? "border-destructive" : "border-slate-800"
                }`}
              />
              {fieldErrors.max_staff && (
                <p className="text-xs text-destructive">{fieldErrors.max_staff[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tarif mensuel (GNF) *
            </label>
            <input
              type="number"
              name="price_monthly"
              required
              min={0}
              step="0.01"
              defaultValue={plan?.price_monthly ?? ""}
              placeholder="Ex: 1500000"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.price_monthly ? "border-destructive" : "border-slate-800"
              }`}
            />
            {fieldErrors.price_monthly && (
              <p className="text-xs text-destructive">{fieldErrors.price_monthly[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={plan?.is_active ?? true}
              className="size-4 rounded border-slate-700 bg-slate-950 accent-indigo-500"
            />
            <span className="text-sm text-slate-300">
              Plan actif <span className="text-slate-500">(disponible à la vente / création d&apos;école)</span>
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
