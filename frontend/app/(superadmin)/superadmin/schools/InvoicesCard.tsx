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

const STATUS_STYLE: Record<string, { color: string; label: string; icon: typeof Clock }> = {
  PENDING: { color: "var(--warn)", label: "En attente", icon: Clock },
  PAID: { color: "var(--ok)", label: "Payée", icon: CheckCircle2 },
  OVERDUE: { color: "var(--danger)", label: "En retard", icon: AlertTriangle },
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
    <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="size-[26px] rounded-full border-[1.4px] border-line text-text-soft flex items-center justify-center shrink-0">
          <Receipt className="size-3.5" />
        </div>
        <h2 className="font-serif text-[15.5px] font-medium m-0">
          Facturation <span className="text-text-faint text-[13px] font-sans ml-1">({count})</span>
        </h2>
      </div>

      {errorMsg && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs mb-4">
          {errorMsg}
        </div>
      )}

      {invoices.length === 0 ? (
        <p className="text-text-faint text-[13px]">Aucune facture d&apos;abonnement pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Numéro</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Période</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Montant</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Échéance</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Statut</th>
                <th className="text-right text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 border-b border-line">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const st = STATUS_STYLE[invoice.status] || STATUS_STYLE.PENDING;
                const Icon = st.icon;
                const canMarkPaid = invoice.status === "PENDING" || invoice.status === "OVERDUE";
                return (
                  <tr key={invoice.id}>
                    <td className="py-3 border-b border-line font-mono text-xs text-text-soft">{invoice.invoice_number}</td>
                    <td className="py-3 border-b border-line text-xs text-text-faint">
                      {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                    </td>
                    <td className="py-3 border-b border-line font-mono text-text">{formatGNF(invoice.amount)}</td>
                    <td className="py-3 border-b border-line text-xs text-text-faint">{formatDate(invoice.due_date)}</td>
                    <td className="py-3 border-b border-line">
                      <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: st.color }}>
                        <Icon className="size-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 border-b border-line text-right">
                      {canMarkPaid && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id, invoice.invoice_number)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 text-xs text-ok hover:opacity-75 font-medium transition-opacity disabled:opacity-50 cursor-pointer"
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
