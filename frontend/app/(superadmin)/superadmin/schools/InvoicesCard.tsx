"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { markInvoicePaidAction } from "./actions";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: string;
  plan_name: string;
  period_start: string;
  period_end: string;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
}

interface InvoicesCardProps {
  schoolId: string;
  invoices: Invoice[];
  count: number;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; icon: typeof Clock }> = {
  PENDING: { bg: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", label: "En attente", icon: Clock },
  PAID: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981", label: "Payée", icon: CheckCircle2 },
  OVERDUE: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", label: "En retard", icon: AlertTriangle },
};

function formatGNF(value: string) {
  return `${Number(value).toLocaleString("fr-FR")} GNF`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR");
}

export default function InvoicesCard({ schoolId, invoices, count }: InvoicesCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMarkPaid = (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Confirmer le règlement (hors plateforme) de la facture ${invoiceNumber} ?`)) {
      return;
    }
    setErrorMsg(null);
    setPendingId(invoiceId);
    startTransition(async () => {
      const res = await markInvoicePaidAction(schoolId, invoiceId);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error);
      }
      setPendingId(null);
    });
  };

  return (
    <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
      <h2 className="font-bold text-white text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
        <Receipt className="size-5 text-indigo-400" />
        Facturation
        <span className="text-xs font-normal text-slate-500 ml-1">({count})</span>
      </h2>

      {errorMsg && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
          {errorMsg}
        </div>
      )}

      {invoices.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucune facture d&apos;abonnement pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-2 pr-4">Numéro</th>
                <th className="py-2 pr-4">Période</th>
                <th className="py-2 pr-4">Montant</th>
                <th className="py-2 pr-4">Échéance</th>
                <th className="py-2 pr-4">Statut</th>
                <th className="py-2 pr-0 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {invoices.map((invoice) => {
                const st = STATUS_STYLE[invoice.status] || STATUS_STYLE.PENDING;
                const Icon = st.icon;
                const canMarkPaid = invoice.status === "PENDING" || invoice.status === "OVERDUE";
                return (
                  <tr key={invoice.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-300">{invoice.invoice_number}</td>
                    <td className="py-3 pr-4 text-xs text-slate-400">
                      {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-white">{formatGNF(invoice.amount)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(invoice.due_date)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: st.bg, color: st.color }}
                      >
                        <Icon className="size-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 pr-0 text-right">
                      {canMarkPaid && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id, invoice.invoice_number)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending && pendingId === invoice.id && (
                            <Loader2 className="size-3.5 animate-spin" />
                          )}
                          Marquer payée
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
