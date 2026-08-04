"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  listPaymentsAction,
  searchStudentsAction,
  createCashPaymentAction,
  initiateOMPaymentAction,
  pollPaymentStatusAction,
} from "./actions";

type Student = { id: string; matricule: string; nom: string; prenom: string };

type Payment = {
  id: string;
  receipt_number: string;
  receipt_pdf_url: string;
  amount: string;
  method: string;
  status: string;
  payment_date: string;
  student_name: string;
  fee_category_name: string;
};

const INPUT_CLASS =
  "w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";
const TABLE_CLASS = "w-full text-left border-collapse";
const TH_CLASS =
  "px-4 py-3 text-[10.5px] font-medium uppercase tracking-[.08em] text-text-faint border-b border-line";
const TD_CLASS = "px-4 py-3 text-sm text-text-soft border-b border-line";

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-ok/10 text-ok",
  PENDING: "bg-warn/10 text-warn",
  FAILED: "bg-danger/10 text-danger",
  CANCELLED: "bg-mute/10 text-mute",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  ORANGE_MONEY: "Orange Money",
};

export default function PaymentsClient({ initialPayments, canCreate }: { initialPayments: Payment[]; canCreate?: boolean }) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [activeTab, setActiveTab] = useState<"history" | "cash" | "orangemoney">("history");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const feedback = useCallback((e: string | null, s: string | null) => {
    if (e) setError(e);
    if (s) setSuccess(s);
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  }, []);

  // ─── History ──────────────────────────────────────────────────────────
  const [filterStudent, setFilterStudent] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const handleFilter = useCallback(async () => {
    const params: Record<string, string> = {};
    if (filterStudent) params.student = filterStudent;
    if (filterMethod) params.method = filterMethod;
    if (filterStatus) params.status = filterStatus;
    const res = await listPaymentsAction(Object.keys(params).length ? params : undefined);
    if (res.success) setPayments(res.data as Payment[]);
  }, [filterStudent, filterMethod, filterStatus]);

  // ─── Cash form ────────────────────────────────────────────────────────
  const [cashStudent, setCashStudent] = useState<Student | null>(null);
  const [cashQuery, setCashQuery] = useState("");
  const [cashResults, setCashResults] = useState<Student[]>([]);
  const [cashSearchOpen, setCashSearchOpen] = useState(false);
  const cashSearchRef = useRef<HTMLDivElement>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashFeeId, setCashFeeId] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const refs = [cashSearchRef];
      for (const r of refs) {
        if (r.current && !r.current.contains(e.target as Node)) setCashSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCashSearch = useCallback(async (q: string) => {
    setCashQuery(q);
    if (q.length < 2) { setCashResults([]); setCashSearchOpen(false); return; }
    const res = await searchStudentsAction(q);
    if (res.success) { setCashResults(res.data as Student[]); setCashSearchOpen(true); }
  }, []);

  const handleCashSubmit = async () => {
    if (!cashStudent || !cashAmount) {
      feedback("Sélectionnez un élève et saisissez un montant.", null);
      return;
    }
    setCashSubmitting(true);
    const key = `cash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await createCashPaymentAction({
      student_id: cashStudent.id,
      student_fee_id: cashFeeId || null,
      amount: Number(cashAmount),
      method: "CASH",
      idempotency_key: key,
    });
    setCashSubmitting(false);
    if (!res.success) {
      const msg = (res as { error?: string }).error || "Erreur lors du paiement";
      feedback(msg, null);
      return;
    }
    feedback(null, `Paiement enregistré. ${(res.data as Record<string, string>)?.receipt_number || ""}`);
    setCashStudent(null); setCashQuery(""); setCashAmount(""); setCashFeeId("");
    refreshPayments();
  };

  // ─── Orange Money form ────────────────────────────────────────────────
  const [omStudent, setOmStudent] = useState<Student | null>(null);
  const [omQuery, setOmQuery] = useState("");
  const [omResults, setOmResults] = useState<Student[]>([]);
  const [omSearchOpen, setOmSearchOpen] = useState(false);
  const omSearchRef = useRef<HTMLDivElement>(null);
  const [omAmount, setOmAmount] = useState("");
  const [omPhone, setOmPhone] = useState("");
  const [omStatus, setOmStatus] = useState<"idle" | "loading" | "polling" | "done" | "failed">("idle");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [omPaymentId, setOmPaymentId] = useState<string | null>(null);
  const [omPollUrl, setOmPollUrl] = useState<string | null>(null);
  const [omError, setOmError] = useState("");
  const omPollRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (omSearchRef.current && !omSearchRef.current.contains(e.target as Node)) setOmSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOmSearch = useCallback(async (q: string) => {
    setOmQuery(q);
    if (q.length < 2) { setOmResults([]); setOmSearchOpen(false); return; }
    const res = await searchStudentsAction(q);
    if (res.success) { setOmResults(res.data as Student[]); setOmSearchOpen(true); }
  }, []);

  const handleOmInitiate = async () => {
    if (!omStudent || !omAmount || !omPhone) {
      feedback("Remplissez tous les champs.", null);
      return;
    }
    setOmStatus("loading");
    setOmError("");
    const res = await initiateOMPaymentAction({
      student_id: omStudent.id,
      amount: Number(omAmount),
      payer_phone: omPhone,
    });
    if (!res.success) {
      setOmStatus("failed");
      setOmError(res.error || "Erreur d'initiation");
      return;
    }
    const data = res.data as Record<string, unknown>;
    const pid = data?.payment_id as string;
    const pollUrl = data?.poll_url as string;
    setOmPaymentId(pid);
    setOmPollUrl(pollUrl);

    if (!pid) {
      setOmStatus("failed");
      setOmError("Réponse invalide du serveur");
      return;
    }

    setOmStatus("polling");
    let pollCount = 0;
    const maxPolls = 30;

    const doPoll = async () => {
      pollCount++;
      const statusRes = await pollPaymentStatusAction(pid);
      const st = (statusRes.data as Record<string, string>)?.status;
      if (st === "COMPLETED") {
        setOmStatus("done");
        feedback(null, "Paiement Orange Money confirmé !");
        refreshPayments();
        return;
      }
      if (st === "FAILED") {
        setOmStatus("failed");
        setOmError("Paiement rejeté par Orange Money.");
        return;
      }
      if (pollCount < maxPolls) {
        omPollRef.current = window.setTimeout(doPoll, 3000);
      } else {
        setOmStatus("failed");
        setOmError("Délai d'attente dépassé. Vérifiez le statut manuellement.");
      }
    };
    omPollRef.current = window.setTimeout(doPoll, 3000);
  };

  useEffect(() => {
    return () => {
      if (omPollRef.current) clearTimeout(omPollRef.current);
    };
  }, []);

  const refreshPayments = async () => {
    const res = await listPaymentsAction();
    if (res.success) setPayments(res.data as Payment[]);
  };

  return (
    <div className="space-y-[22px]">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-ok/10 border border-ok/20 text-ok text-sm">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-line bg-card w-fit">
        <button onClick={() => setActiveTab("history")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === "history" ? "bg-accent-soft text-accent" : "text-text-faint hover:text-text"}`}>
          Historique
        </button>
        {canCreate && (
          <>
            <button onClick={() => setActiveTab("cash")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === "cash" ? "bg-accent-soft text-accent" : "text-text-faint hover:text-text"}`}>
              Encaissement espèces
            </button>
            <button onClick={() => setActiveTab("orangemoney")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === "orangemoney" ? "bg-accent-soft text-accent" : "text-text-faint hover:text-text"}`}>
              Paiement Orange Money
            </button>
          </>
        )}
      </div>

      {activeTab === "history" && (
        <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
          <div className="px-6 py-4 border-b border-line">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Élève</label>
                <input value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}
                  className={`${INPUT_CLASS} w-48`} placeholder="ID élève" />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Méthode</label>
                <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
                  className={`${INPUT_CLASS} w-36`}>
                  <option value="">Toutes</option>
                  <option value="CASH">Espèces</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Statut</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className={`${INPUT_CLASS} w-36`}>
                  <option value="">Tous</option>
                  <option value="COMPLETED">Complété</option>
                  <option value="PENDING">En attente</option>
                  <option value="FAILED">Échoué</option>
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
                <th className={TH_CLASS}>Reçu</th>
                <th className={TH_CLASS}>Élève</th>
                <th className={TH_CLASS}>Montant</th>
                <th className={TH_CLASS}>Méthode</th>
                <th className={TH_CLASS}>Statut</th>
                <th className={TH_CLASS}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className={`${TD_CLASS} text-center text-text-faint py-8`}>Aucun paiement.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-paper-alt transition-colors">
                    <td className={TD_CLASS}>{p.receipt_number || "-"}</td>
                    <td className={TD_CLASS}>{p.student_name}</td>
                    <td className={TD_CLASS}>{Number(p.amount).toLocaleString()} GNF</td>
                    <td className={TD_CLASS}>{METHOD_LABEL[p.method] || p.method}</td>
                    <td className={TD_CLASS}>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[p.status] || "bg-mute/10 text-mute"}`}>
                        {p.status === "COMPLETED" ? "Complété" : p.status === "PENDING" ? "En attente" : p.status === "FAILED" ? "Échoué" : p.status}
                      </span>
                    </td>
                    <td className={TD_CLASS}>{new Date(p.payment_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "cash" && (
        <div className="max-w-lg mx-auto border border-line bg-card rounded-xl shadow-[var(--shadow)] p-6">
          <h2 className="font-serif text-lg font-medium mb-4">Encaissement espèces</h2>
          <div className="space-y-4">
            <div ref={cashSearchRef} className="relative">
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Élève *</label>
              {cashStudent ? (
                <div className="flex items-center justify-between bg-paper-alt border border-line rounded-lg px-3 py-2">
                  <span className="text-sm">{cashStudent.nom} {cashStudent.prenom} ({cashStudent.matricule})</span>
                  <button onClick={() => { setCashStudent(null); setCashQuery(""); }} className="text-text-faint hover:text-text text-xs cursor-pointer">✕</button>
                </div>
              ) : (
                <div>
                  <input value={cashQuery} onChange={(e) => handleCashSearch(e.target.value)}
                    className={INPUT_CLASS} placeholder="Rechercher par nom ou matricule..." />
                  {cashSearchOpen && cashResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-card border border-line rounded-lg shadow-[var(--shadow)] max-h-48 overflow-y-auto">
                      {cashResults.map((s) => (
                        <button key={s.id} onClick={() => { setCashStudent(s); setCashSearchOpen(false); setCashQuery(`${s.nom} ${s.prenom}`); }}
                          className="block w-full text-left px-3 py-2 text-sm text-text-soft hover:bg-paper-alt transition-colors cursor-pointer">
                          {s.nom} {s.prenom} — {s.matricule}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">ID Frais (optionnel)</label>
              <input value={cashFeeId} onChange={(e) => setCashFeeId(e.target.value)}
                className={INPUT_CLASS} placeholder="UUID du frais à solder..." />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Montant (GNF) *</label>
              <input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                className={INPUT_CLASS} placeholder="50000" />
            </div>
            <button onClick={handleCashSubmit} disabled={cashSubmitting}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent hover:opacity-90 text-white transition-opacity disabled:opacity-50 cursor-pointer">
              {cashSubmitting ? "Enregistrement..." : "Enregistrer le paiement"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "orangemoney" && (
        <div className="max-w-lg mx-auto border border-line bg-card rounded-xl shadow-[var(--shadow)] p-6">
          <h2 className="font-serif text-lg font-medium mb-4">Paiement Orange Money</h2>

          {omStatus === "polling" || omStatus === "loading" ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              {omStatus === "loading" ? (
                <p className="text-text-soft text-sm">Demande de paiement en cours...</p>
              ) : (
                <div>
                  <p className="text-text-soft text-sm mb-2">En attente de validation sur le téléphone</p>
                  <p className="text-xs" style={{ color: "var(--warn)" }}>Le parent doit valider le paiement dans son application Orange Money</p>
                  {omPollUrl && (
                    <p className="text-text-faint text-xs mt-2">Polling : <span className="text-accent">{omPollUrl}</span></p>
                  )}
                </div>
              )}
            </div>
          ) : omStatus === "done" ? (
            <div className="text-center py-8">
              <div className="text-ok text-4xl mb-2">✓</div>
              <p className="text-ok text-sm font-medium">Paiement confirmé !</p>
              <button onClick={() => { setOmStatus("idle"); setOmStudent(null); setOmQuery(""); setOmAmount(""); setOmPhone(""); }}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:opacity-90 text-white transition-opacity cursor-pointer">
                Nouveau paiement
              </button>
            </div>
          ) : omStatus === "failed" ? (
            <div className="text-center py-8">
              <div className="text-danger text-4xl mb-2">✕</div>
              <p className="text-danger text-sm font-medium mb-2">{omError || "Paiement échoué"}</p>
              <button onClick={() => setOmStatus("idle")}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-line text-text-soft hover:border-accent-line hover:text-text transition-colors cursor-pointer">
                Réessayer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div ref={omSearchRef} className="relative">
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Élève *</label>
                {omStudent ? (
                  <div className="flex items-center justify-between bg-paper-alt border border-line rounded-lg px-3 py-2">
                    <span className="text-sm">{omStudent.nom} {omStudent.prenom} ({omStudent.matricule})</span>
                    <button onClick={() => { setOmStudent(null); setOmQuery(""); }} className="text-text-faint hover:text-text text-xs cursor-pointer">✕</button>
                  </div>
                ) : (
                  <div>
                    <input value={omQuery} onChange={(e) => handleOmSearch(e.target.value)}
                      className={INPUT_CLASS} placeholder="Rechercher par nom ou matricule..." />
                    {omSearchOpen && omResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-line rounded-lg shadow-[var(--shadow)] max-h-48 overflow-y-auto">
                        {omResults.map((s) => (
                          <button key={s.id} onClick={() => { setOmStudent(s); setOmSearchOpen(false); setOmQuery(`${s.nom} ${s.prenom}`); }}
                            className="block w-full text-left px-3 py-2 text-sm text-text-soft hover:bg-paper-alt transition-colors cursor-pointer">
                            {s.nom} {s.prenom} — {s.matricule}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Montant (GNF) *</label>
                <input type="number" value={omAmount} onChange={(e) => setOmAmount(e.target.value)}
                  className={INPUT_CLASS} placeholder="50000" />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] mb-1">Téléphone parent *</label>
                <input value={omPhone} onChange={(e) => setOmPhone(e.target.value)}
                  className={INPUT_CLASS} placeholder="+224655112233" />
              </div>
              <button onClick={handleOmInitiate}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent hover:opacity-90 text-white transition-opacity cursor-pointer">
                Envoyer la demande
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
