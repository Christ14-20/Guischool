"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  listInvoicesAction,
  generateInvoicePdfAction,
  pollTaskStatusAction,
} from "./actions";

type Invoice = {
  id: string;
  student_name: string;
  school_year_label: string;
  total_due: string;
  total_paid: string;
  balance: string;
  due_date: string | null;
  status: string;
  pdf_url: string;
  generated_at: string | null;
};

const INPUT_CLASS =
  "w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";
const TABLE_CLASS = "w-full text-left border-collapse";
const TH_CLASS =
  "px-4 py-3 text-[10.5px] font-medium uppercase tracking-[.08em] text-text-faint border-b border-line";
const TD_CLASS = "px-4 py-3 text-sm text-text-soft border-b border-line";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-mute/10 text-mute",
  PARTIAL: "bg-warn/10 text-warn",
  PAID: "bg-ok/10 text-ok",
  OVERDUE: "bg-danger/10 text-danger ring-1 ring-danger/30",
};

export default function InvoicesClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // PDF generation state (per invoice)
  const [genStatus, setGenStatus] = useState<Record<string, "idle" | "loading" | "polling" | "done" | "failed">>({});
  const pollTimers = useRef<Record<string, number>>({});

  const feedback = useCallback((e: string | null, s: string | null) => {
    if (e) setError(e);
    if (s) setSuccess(s);
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleFilter = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    const res = await listInvoicesAction(Object.keys(params).length ? params : undefined);
    if (res.success) setInvoices(res.data as Invoice[]);
  }, [filterStatus]);

  const handleGeneratePdf = useCallback(async (invoiceId: string) => {
    setGenStatus((prev) => ({ ...prev, [invoiceId]: "loading" }));
    const res = await generateInvoicePdfAction(invoiceId);
    if (!res.success || !res.data) {
      setGenStatus((prev) => ({ ...prev, [invoiceId]: "failed" }));
      feedback("Erreur lors de la génération du PDF.", null);
      return;
    }

    const taskId = (res.data as Record<string, unknown>)?.task_id as string;
    if (!taskId) {
      setGenStatus((prev) => ({ ...prev, [invoiceId]: "failed" }));
      feedback("Réponse invalide du serveur.", null);
      return;
    }

    setGenStatus((prev) => ({ ...prev, [invoiceId]: "polling" }));
    let pollCount = 0;
    const maxPolls = 30;

    const doPoll = async () => {
      pollCount++;
      const statusRes = await pollTaskStatusAction(taskId);
      const st = (statusRes.data as Record<string, string>)?.status;
      if (st === "done" || st === "SUCCESS") {
        setGenStatus((prev) => ({ ...prev, [invoiceId]: "done" }));
        feedback(null, "PDF généré !");
        refreshInvoices();
        return;
      }
      if (st === "failed" || st === "FAILURE") {
        setGenStatus((prev) => ({ ...prev, [invoiceId]: "failed" }));
        feedback("Échec de la génération du PDF.", null);
        return;
      }
      if (pollCount < maxPolls) {
        pollTimers.current[invoiceId] = window.setTimeout(doPoll, 2000);
      } else {
        setGenStatus((prev) => ({ ...prev, [invoiceId]: "failed" }));
        feedback("Délai d'attente dépassé.", null);
      }
    };
    pollTimers.current[invoiceId] = window.setTimeout(doPoll, 2000);
  }, [feedback]);

  const refreshInvoices = async () => {
    const res = await listInvoicesAction();
    if (res.success) setInvoices(res.data as Invoice[]);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { PENDING: "En attente", PARTIAL: "Partiel", PAID: "Payé", OVERDUE: "En retard" };
    return map[s] || s;
  };

  return (
    <div className="space-y-[22px]">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-ok/10 border border-ok/20 text-ok text-sm">{success}</div>
      )}

      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-line">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Statut</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className={`${INPUT_CLASS} w-44`}>
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="PARTIAL">Partiel</option>
                <option value="PAID">Payé</option>
                <option value="OVERDUE">En retard</option>
              </select>
            </div>
            <button onClick={handleFilter}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:opacity-90 text-white transition-opacity cursor-pointer">
              Filtrer
            </button>
          </div>
        </div>

        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              <th className={TH_CLASS}>Élève</th>
              <th className={TH_CLASS}>Année</th>
              <th className={TH_CLASS}>Dû</th>
              <th className={TH_CLASS}>Payé</th>
              <th className={TH_CLASS}>Solde</th>
              <th className={TH_CLASS}>Échéance</th>
              <th className={TH_CLASS}>Statut</th>
              <th className={`${TH_CLASS} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={8} className={`${TD_CLASS} text-center text-text-faint py-8`}>Aucune facture.</td></tr>
            ) : (
              invoices.map((inv) => {
                const gs = genStatus[inv.id] || "idle";
                return (
                  <tr key={inv.id} className="hover:bg-paper-alt transition-colors">
                    <td className={TD_CLASS}>{inv.student_name}</td>
                    <td className={TD_CLASS}>{inv.school_year_label}</td>
                    <td className={TD_CLASS}>{Number(inv.total_due).toLocaleString()} GNF</td>
                    <td className={TD_CLASS}>{Number(inv.total_paid).toLocaleString()} GNF</td>
                    <td className={`${TD_CLASS} font-medium`} style={{ color: Number(inv.balance) > 0 ? "var(--warn)" : "var(--ok)" }}>
                      {Number(inv.balance).toLocaleString()} GNF
                    </td>
                    <td className={TD_CLASS}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR") : "-"}</td>
                    <td className={TD_CLASS}>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[inv.status] || "bg-mute/10 text-mute"}`}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className={`${TD_CLASS} text-right`}>
                      {gs === "loading" || gs === "polling" ? (
                        <span className="text-text-faint text-xs">Génération...</span>
                      ) : gs === "done" || inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="text-accent hover:opacity-80 text-xs font-medium mr-2 transition-opacity">
                          Télécharger
                        </a>
                      ) : gs === "failed" ? (
                        <button onClick={() => handleGeneratePdf(inv.id)}
                          className="text-danger hover:opacity-80 text-xs font-medium transition-opacity cursor-pointer">
                          Réessayer
                        </button>
                      ) : (
                        <button onClick={() => handleGeneratePdf(inv.id)}
                          className="text-accent hover:opacity-80 text-xs font-medium transition-opacity cursor-pointer">
                          Générer PDF
                        </button>
                      )}
                      {inv.generated_at && (
                        <span className="text-text-faint text-xs ml-1">
                          ({new Date(inv.generated_at).toLocaleDateString("fr-FR")})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
