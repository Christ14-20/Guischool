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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setEditingPlan(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="size-4" />
          Nouveau plan
        </button>
      </div>

      <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Tarif mensuel</th>
                <th className="px-6 py-4 text-center">Limite élèves</th>
                <th className="px-6 py-4 text-center">Limite personnel</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Aucun plan d&apos;abonnement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-900/35 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5 font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        <CreditCard className="size-4 text-indigo-400" />
                        {plan.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {Number(plan.price_monthly).toLocaleString("fr-FR")} GNF
                    </td>
                    <td className="px-6 py-4 text-center tabular-nums">{plan.max_students}</td>
                    <td className="px-6 py-4 text-center tabular-nums">{plan.max_staff}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          plan.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-700/30 text-slate-400"
                        }`}
                      >
                        {plan.is_active ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <Ban className="size-3" />
                        )}
                        {plan.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
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
    </div>
  );
}
