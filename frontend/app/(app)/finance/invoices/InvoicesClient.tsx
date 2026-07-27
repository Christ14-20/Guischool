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
  "w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors";
const TABLE_CLASS = "w-full text-left border-collapse";
const TH_CLASS =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/50";
const TD_CLASS = "px-4 py-3 text-sm text-slate-300 border-b border-slate-800/30";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-slate-700/50 text-slate-300",
  PARTIAL: "bg-amber-900/30 text-amber-400",
  PAID: "bg-emerald-900/30 text-emerald-400",
  OVERDUE: "bg-red-900/40 text-red-400 ring-1 ring-red-500/30",
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
    <div>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm">{success}</div>
      )}

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-800/50">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Statut</label>
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
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
              Filtrer
            </button>
          </div>
        </div>

        <table className={TABLE_CLASS}>
          <thead>
            <tr className="border-b border-slate-800/50">
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
              <tr><td colSpan={8} className={`${TD_CLASS} text-center text-slate-500 py-8`}>Aucune facture.</td></tr>
            ) : (
              invoices.map((inv) => {
                const gs = genStatus[inv.id] || "idle";
                return (
                  <tr key={inv.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className={TD_CLASS}>{inv.student_name}</td>
                    <td className={TD_CLASS}>{inv.school_year_label}</td>
                    <td className={TD_CLASS}>{Number(inv.total_due).toLocaleString()} GNF</td>
                    <td className={TD_CLASS}>{Number(inv.total_paid).toLocaleString()} GNF</td>
                    <td className={`${TD_CLASS} font-medium ${Number(inv.balance) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {Number(inv.balance).toLocaleString()} GNF
                    </td>
                    <td className={TD_CLASS}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR") : "-"}</td>
                    <td className={TD_CLASS}>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[inv.status] || "bg-slate-700/50 text-slate-300"}`}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className={`${TD_CLASS} text-right`}>
                      {gs === "loading" || gs === "polling" ? (
                        <span className="text-slate-400 text-xs">Génération...</span>
                      ) : gs === "done" || inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-medium mr-2 transition-colors">
                          Télécharger
                        </a>
                      ) : gs === "failed" ? (
                        <button onClick={() => handleGeneratePdf(inv.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">
                          Réessayer
                        </button>
                      ) : (
                        <button onClick={() => handleGeneratePdf(inv.id)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
                          Générer PDF
                        </button>
                      )}
                      {inv.generated_at && (
                        <span className="text-slate-600 text-xs ml-1">
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
