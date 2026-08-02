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
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:opacity-75 transition-opacity cursor-pointer bg-transparent border-none p-0"
      >
        <ArrowLeftRight className="size-3.5" />
        Changer de plan
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="font-serif text-lg font-medium text-text">Changer de plan</h3>
              <p className="text-text-soft text-sm mt-1">
                Effet immédiat sur les limites d&apos;élèves et de personnel de cet établissement.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
                  Nouveau plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-paper-alt border border-line rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
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
                  className="px-4 py-2 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedPlanId || selectedPlanId === currentPlanId}
                  className="px-4 py-2 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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
