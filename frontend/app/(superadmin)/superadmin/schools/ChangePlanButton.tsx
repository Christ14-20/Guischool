"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2, AlertTriangle } from "lucide-react";
import { changePlanAction } from "./actions";

interface Plan {
  id: string;
  name: string;
  max_students: number;
  max_staff: number;
}

interface ChangePlanButtonProps {
  schoolId: string;
  currentPlanId?: string;
  plans: Plan[];
}

export default function ChangePlanButton({ schoolId, currentPlanId, plans }: ChangePlanButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId || "");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || selectedPlanId === currentPlanId) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await changePlanAction(schoolId, selectedPlanId);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-full transition-colors cursor-pointer"
      >
        <ArrowLeftRight className="size-3" />
        Changer de plan
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Changer de plan</h3>
              <p className="text-slate-400 text-sm mt-1">
                Effet immédiat sur les limites d&apos;élèves et de personnel de cet établissement.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nouveau plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.max_students} élèves / {plan.max_staff} personnel)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedPlanId || selectedPlanId === currentPlanId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
