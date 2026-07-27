/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-slate-700/50 text-slate-300",
  PARTIAL: "bg-amber-900/30 text-amber-400",
  PAID: "bg-emerald-900/30 text-emerald-400",
  OVERDUE: "bg-red-900/40 text-red-400 ring-1 ring-red-500/30",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  ORANGE_MONEY: "Orange Money",
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { PENDING: "En attente", PARTIAL: "Partiel", PAID: "Payé", OVERDUE: "En retard" };
  return map[s] || s;
};

export default function StudentFinancesTab({
  invoices,
  payments,
}: {
  invoices: any[];
  payments: any[];
}) {
  const totalDue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_due || 0), 0);
  const totalPaid = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_paid || 0), 0);
  const balance = totalDue - totalPaid;
  const unpaidInvoices = invoices.filter((inv: any) => inv.status === "PENDING" || inv.status === "PARTIAL" || inv.status === "OVERDUE");
  const overdueCount = invoices.filter((inv: any) => inv.status === "OVERDUE").length;

  const thClass = "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/50";
  const tdClass = "px-4 py-3 text-sm text-slate-300 border-b border-slate-800/30";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total dû</p>
          <p className="text-2xl font-bold mt-1 text-white">{totalDue.toLocaleString()} GNF</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total payé</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{totalPaid.toLocaleString()} GNF</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Solde restant</p>
          <p className={`text-2xl font-bold mt-1 ${balance > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {balance.toLocaleString()} GNF
          </p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Imp ayés en retard</p>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {overdueCount > 0 ? `${overdueCount}` : "0"}
          </p>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/50">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Factures ({invoices.length})
          </h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Aucune facture pour cet élève.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className={thClass}>Année</th>
                <th className={thClass}>Dû</th>
                <th className={thClass}>Payé</th>
                <th className={thClass}>Solde</th>
                <th className={thClass}>Échéance</th>
                <th className={thClass}>Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-900/35 transition-colors">
                  <td className={tdClass}>{inv.school_year_label}</td>
                  <td className={tdClass}>{Number(inv.total_due).toLocaleString()} GNF</td>
                  <td className={tdClass}>{Number(inv.total_paid).toLocaleString()} GNF</td>
                  <td className={`${tdClass} font-medium ${Number(inv.balance) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {Number(inv.balance).toLocaleString()} GNF
                  </td>
                  <td className={tdClass}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className={tdClass}>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[inv.status] || "bg-slate-700/50 text-slate-300"}`}>
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payments table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/50">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Paiements ({payments.length})
          </h3>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Aucun paiement pour cet élève.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className={thClass}>Reçu</th>
                <th className={thClass}>Montant</th>
                <th className={thClass}>Méthode</th>
                <th className={thClass}>Statut</th>
                <th className={thClass}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-900/35 transition-colors">
                  <td className={tdClass}>
                    {p.receipt_number || "-"}
                    {p.receipt_pdf_url && (
                      <a href={p.receipt_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="ml-2 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                        PDF
                      </a>
                    )}
                  </td>
                  <td className={tdClass}>{Number(p.amount).toLocaleString()} GNF</td>
                  <td className={tdClass}>{METHOD_LABEL[p.method] || p.method}</td>
                  <td className={tdClass}>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === "COMPLETED" ? "bg-emerald-900/30 text-emerald-400" :
                      p.status === "PENDING" ? "bg-amber-900/30 text-amber-400" :
                      p.status === "FAILED" ? "bg-red-900/40 text-red-400" :
                      "bg-slate-700/50 text-slate-400"
                    }`}>
                      {p.status === "COMPLETED" ? "Complété" :
                       p.status === "PENDING" ? "En attente" :
                       p.status === "FAILED" ? "Échoué" : p.status}
                    </span>
                  </td>
                  <td className={tdClass}>
                    {new Date(p.payment_date).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
