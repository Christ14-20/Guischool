/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-mute/10 text-mute",
  PARTIAL: "bg-warn/10 text-warn",
  PAID: "bg-ok/10 text-ok",
  OVERDUE: "bg-danger/10 text-danger ring-1 ring-danger/30",
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
  const overdueCount = invoices.filter((inv: any) => inv.status === "OVERDUE").length;

  const thClass = "text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-4 py-3 border-b border-line";
  const tdClass = "px-4 py-3 text-sm text-text-soft border-b border-line";

  return (
    <div className="space-y-6">
      {/* Summary cards (toutes années confondues) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
          <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Total dû (toutes années)</p>
          <p className="text-2xl font-semibold mt-1">{totalDue.toLocaleString()} GNF</p>
        </div>
        <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
          <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Total payé (toutes années)</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: "var(--ok)" }}>{totalPaid.toLocaleString()} GNF</p>
        </div>
        <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
          <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Solde restant (toutes années)</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: balance > 0 ? "var(--warn)" : "var(--ok)" }}>
            {balance.toLocaleString()} GNF
          </p>
        </div>
        <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
          <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Factures en retard (toutes années)</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: overdueCount > 0 ? "var(--danger)" : "var(--ok)" }}>
            {overdueCount > 0 ? `${overdueCount}` : "0"}
          </p>
        </div>
      </div>

      {/* Invoices table */}
      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Factures ({invoices.length})
          </h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-text-faint">Aucune facture pour cet élève.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Année</th>
                <th className={thClass}>Dû</th>
                <th className={thClass}>Payé</th>
                <th className={thClass}>Solde</th>
                <th className={thClass}>Échéance</th>
                <th className={thClass}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-paper-alt transition-colors">
                  <td className={tdClass}>{inv.school_year_label}</td>
                  <td className={tdClass}>{Number(inv.total_due).toLocaleString()} GNF</td>
                  <td className={tdClass}>{Number(inv.total_paid).toLocaleString()} GNF</td>
                  <td className={`${tdClass} font-medium`} style={{ color: Number(inv.balance) > 0 ? "var(--warn)" : "var(--ok)" }}>
                    {Number(inv.balance).toLocaleString()} GNF
                  </td>
                  <td className={tdClass}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className={tdClass}>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[inv.status] || "bg-mute/10 text-mute"}`}>
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
      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Paiements ({payments.length})
          </h3>
        </div>
        {payments.length === 0 ? (
          <div className="p-12 text-center text-text-faint">Aucun paiement pour cet élève.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Reçu</th>
                <th className={thClass}>Montant</th>
                <th className={thClass}>Méthode</th>
                <th className={thClass}>Statut</th>
                <th className={thClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-paper-alt transition-colors">
                  <td className={tdClass}>
                    {p.receipt_number || "-"}
                    {p.receipt_pdf_url && (
                      <a href={p.receipt_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="ml-2 text-xs font-medium transition-colors hover:opacity-80" style={{ color: "var(--ok)" }}>
                        PDF
                      </a>
                    )}
                  </td>
                  <td className={tdClass}>{Number(p.amount).toLocaleString()} GNF</td>
                  <td className={tdClass}>{METHOD_LABEL[p.method] || p.method}</td>
                  <td className={tdClass}>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === "COMPLETED" ? "bg-ok/10 text-ok" :
                      p.status === "PENDING" ? "bg-warn/10 text-warn" :
                      p.status === "FAILED" ? "bg-danger/10 text-danger" :
                      "bg-mute/10 text-mute"
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
