"use client";

import React, { useState } from "react";
import { Plus, Pencil, CreditCard, CheckCircle2, Ban } from "lucide-react";
import PlanFormSheet from "./PlanFormSheet";

interface Plan {
  id: string;
  name: string;
  max_students: number;
  max_staff: number;
  price_monthly: string;
  is_active: boolean;
}

interface PlansManagerProps {
  plans: Plan[];
}

export default function PlansManager({ plans }: PlansManagerProps) {
  const [editingPlan, setEditingPlan] = useState<Plan | null | undefined>(undefined);

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setEditingPlan(null)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="size-4" />
          Nouveau plan
        </button>
      </div>

      <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)] mt-[22px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Plan</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Tarif mensuel</th>
                <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Limite élèves</th>
                <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Limite personnel</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Statut</th>
                <th className="text-right text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-faint text-sm">
                    Aucun plan d&apos;abonnement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="py-[15px] px-2 border-b border-line last:border-b-0">
                      <div className="flex items-center gap-2.5 font-semibold text-[13.5px]">
                        <CreditCard className="size-3.5 text-accent" />
                        {plan.name}
                      </div>
                    </td>
                    <td className="py-[15px] px-2 border-b border-line font-mono text-xs text-text-soft">
                      {Number(plan.price_monthly).toLocaleString("fr-FR")} GNF
                    </td>
                    <td className="py-[15px] px-2 border-b border-line text-center font-mono text-text-soft text-[13.5px]">
                      {plan.max_students}
                    </td>
                    <td className="py-[15px] px-2 border-b border-line text-center font-mono text-text-soft text-[13.5px]">
                      {plan.max_staff}
                    </td>
                    <td className="py-[15px] px-2 border-b border-line">
                      <span
                        className="inline-flex items-center gap-[7px] text-[12.5px]"
                        style={{ color: plan.is_active ? "var(--ok)" : "var(--mute)" }}
                      >
                        {plan.is_active ? <CheckCircle2 className="size-3" /> : <Ban className="size-3" />}
                        {plan.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="py-[15px] px-2 border-b border-line text-right">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-accent font-medium transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlan !== undefined && (
        <PlanFormSheet plan={editingPlan} onClose={() => setEditingPlan(undefined)} />
      )}
    </>
  );
}
