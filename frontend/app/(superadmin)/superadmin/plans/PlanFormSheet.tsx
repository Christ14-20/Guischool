/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
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

const fieldClass =
  "w-full bg-paper-alt border border-line rounded-xl px-4 py-2 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-[26px] rounded-full border-[1.4px] border-line text-accent flex items-center justify-center shrink-0">
              <CreditCard className="size-3.5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-text">
              {isEdit ? `Modifier « ${plan!.name} »` : "Créer un plan"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-faint hover:text-text transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {affectedTenants && affectedTenants.length > 0 && (
          <div className="p-3 bg-warn/10 border border-warn/20 rounded-xl text-warn text-xs space-y-2">
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
            <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
              Nom du plan *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={plan?.name || ""}
              placeholder="Ex: Pro"
              className={fieldClass}
            />
            {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
                Limite élèves *
              </label>
              <input
                type="number"
                name="max_students"
                required
                min={0}
                defaultValue={plan?.max_students ?? 0}
                className={fieldClass}
              />
              {fieldErrors.max_students && (
                <p className="text-xs text-danger">{fieldErrors.max_students[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
                Limite personnel *
              </label>
              <input
                type="number"
                name="max_staff"
                required
                min={0}
                defaultValue={plan?.max_staff ?? 0}
                className={fieldClass}
              />
              {fieldErrors.max_staff && (
                <p className="text-xs text-danger">{fieldErrors.max_staff[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
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
              className={fieldClass}
            />
            {fieldErrors.price_monthly && (
              <p className="text-xs text-danger">{fieldErrors.price_monthly[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={plan?.is_active ?? true}
              className="size-4 rounded border-line bg-paper-alt accent-accent"
            />
            <span className="text-sm text-text-soft">
              Plan actif <span className="text-text-faint">(disponible à la vente / création d&apos;école)</span>
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le plan"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
