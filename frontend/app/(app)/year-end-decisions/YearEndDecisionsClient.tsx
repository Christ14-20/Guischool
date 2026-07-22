/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Users,
  ClipboardCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  createYearEndDecisionAction,
  promotionsBulkAction,
} from "./actions";

interface Props {
  decisions: any[];
  schoolYears: any[];
  classes: any[];
}

const DECISION_LABELS: Record<string, string> = {
  ADMIS: "Admis",
  REDOUBLE: "Redouble",
  EXCLU: "Exclu",
};

const DECISION_STYLES: Record<string, string> = {
  ADMIS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REDOUBLE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  EXCLU: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const INPUT_CLASS =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors";

export default function YearEndDecisionsClient({
  decisions: initialDecisions,
  schoolYears,
  classes,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [filteredDecisions, setFilteredDecisions] = useState<any[]>(initialDecisions);

  const [syId, setSyId] = useState("");
  const [search, setSearch] = useState("");

  // Individual decision modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    school_year_id: "",
    decision: "ADMIS",
    classe_destination_id: "",
  });

  // Bulk promotion modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkForm, setBulkForm] = useState({
    classe_origine_id: "",
    school_year_cible_id: "",
    decisions_filter: "ADMIS",
  });

  React.useEffect(() => {
    let filtered = initialDecisions;
    if (syId) filtered = filtered.filter((d: any) => d.school_year === syId);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (d: any) =>
          d.student_nom?.toLowerCase().includes(s) ||
          d.student_prenom?.toLowerCase().includes(s) ||
          d.student_matricule?.toLowerCase().includes(s)
      );
    }
    setFilteredDecisions(filtered);
  }, [syId, search, initialDecisions]);

  const openCreateModal = () => {
    setModalError(null);
    setForm({ student_id: "", school_year_id: "", decision: "ADMIS", classe_destination_id: "" });
    setModalOpen(true);
  };

  const handleCreateDecision = async () => {
    if (!form.student_id || !form.school_year_id) {
      setModalError("Élève et année scolaire sont obligatoires.");
      return;
    }
    if (form.decision === "ADMIS" && !form.classe_destination_id) {
      setModalError("Classe de destination requise pour ADMIS.");
      return;
    }
    setModalLoading(true);
    setModalError(null);
    startTransition(async () => {
      const res = await createYearEndDecisionAction(form);
      if (res.success) {
        setModalOpen(false);
        router.refresh();
      } else {
        setModalError(res.error);
      }
      setModalLoading(false);
    });
  };

  const openBulkModal = () => {
    setBulkError(null);
    setBulkSuccess(null);
    setBulkForm({ classe_origine_id: "", school_year_cible_id: "", decisions_filter: "ADMIS" });
    setBulkModalOpen(true);
  };

  const handleBulkPromotion = async () => {
    if (!bulkForm.classe_origine_id || !bulkForm.school_year_cible_id) {
      setBulkError("Classe d'origine et année cible sont obligatoires.");
      return;
    }
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    startTransition(async () => {
      const res = await promotionsBulkAction(bulkForm);
      if (res.success) {
        setBulkSuccess(
          `${res.data?.processed_count ?? 0} élèves traités, ${res.data?.skipped_count ?? 0} ignorés.`
        );
        router.refresh();
      } else {
        setBulkError(res.error);
      }
      setBulkLoading(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Année scolaire</label>
            <select
              value={syId}
              onChange={(e) => setSyId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Toutes</option>
              {schoolYears.map((sy: any) => (
                <option key={sy.id} value={sy.id}>{sy.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Élève</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, prénom, matricule..."
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="size-4" />
              Nouvelle d&apos;écision
            </button>
            <button
              type="button"
              onClick={openBulkModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Users className="size-4" />
              Promotion groupée
            </button>
          </div>
        </form>
      </div>

      {/* Decisions table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        {filteredDecisions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
            <ClipboardCheck className="size-8 text-slate-600" />
            Aucune décision trouvée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Élève</th>
                  <th className="px-6 py-4">Année scolaire</th>
                  <th className="px-6 py-4">Décision</th>
                  <th className="px-6 py-4">Classe d&apos;origine</th>
                  <th className="px-6 py-4">Classe destination</th>
                  <th className="px-6 py-4">Moyenne annuelle</th>
                  <th className="px-6 py-4">Prise par</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                {filteredDecisions.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {d.student_nom} {d.student_prenom}
                      <br />
                      <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                        {d.student_matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4">{d.school_year_label}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${DECISION_STYLES[d.decision]}`}
                      >
                        {DECISION_LABELS[d.decision] ?? d.decision}
                      </span>
                    </td>
                    <td className="px-6 py-4">{d.classe_origine_name}</td>
                    <td className="px-6 py-4">{d.classe_destination_name ?? "—"}</td>
                    <td className="px-6 py-4 font-mono">{d.moyenne_annuelle ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-400">{d.prise_par_name}</td>
                    <td className="px-6 py-4 text-slate-400">{d.date_decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create decision modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Nouvelle d&apos;écision de fin d&apos;année</h2>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                  {modalError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Élève</label>
                  <select
                    value={form.student_id}
                    onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Sélectionner...</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Année scolaire</label>
                  <select
                    value={form.school_year_id}
                    onChange={(e) => setForm((p) => ({ ...p, school_year_id: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Sélectionner...</option>
                    {schoolYears.map((sy: any) => (
                      <option key={sy.id} value={sy.id}>{sy.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Décision</label>
                  <select
                    value={form.decision}
                    onChange={(e) => setForm((p) => ({ ...p, decision: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="ADMIS">Admis</option>
                    <option value="REDOUBLE">Redouble</option>
                    <option value="EXCLU">Exclu</option>
                  </select>
                </div>

                {(form.decision === "ADMIS" || form.decision === "REDOUBLE") && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Classe de destination
                    </label>
                    <select
                      value={form.classe_destination_id}
                      onChange={(e) => setForm((p) => ({ ...p, classe_destination_id: e.target.value }))}
                      className={INPUT_CLASS}
                    >
                      <option value="">Sélectionner...</option>
                      {classes.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateDecision}
                    disabled={modalLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Créer la décision
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk promotion modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Promotion groupée</h2>
                <button onClick={() => setBulkModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              {bulkError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                  {bulkError}
                </div>
              )}

              {bulkSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                  {bulkSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Classe d&apos;origine</label>
                  <select
                    value={bulkForm.classe_origine_id}
                    onChange={(e) => setBulkForm((p) => ({ ...p, classe_origine_id: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Sélectionner...</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Année scolaire cible</label>
                  <select
                    value={bulkForm.school_year_cible_id}
                    onChange={(e) => setBulkForm((p) => ({ ...p, school_year_cible_id: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Sélectionner...</option>
                    {schoolYears.map((sy: any) => (
                      <option key={sy.id} value={sy.id}>{sy.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtrer par décision</label>
                  <select
                    value={bulkForm.decisions_filter}
                    onChange={(e) => setBulkForm((p) => ({ ...p, decisions_filter: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="ADMIS">ADMIS uniquement</option>
                    <option value="ADMIS_REDOUBLE">ADMIS + REDOUBLE</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkPromotion}
                    disabled={bulkLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {bulkLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Lancer la promotion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}