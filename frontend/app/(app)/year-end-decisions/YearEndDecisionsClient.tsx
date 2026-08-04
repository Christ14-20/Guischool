/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  canManageDecisions?: boolean;
  canOverrideSchoolYear?: boolean;
}

const DECISION_LABELS: Record<string, string> = {
  ADMIS: "Admis",
  REDOUBLE: "Redouble",
  EXCLU: "Exclu",
};

const DECISION_STYLES: Record<string, string> = {
  ADMIS: "var(--ok)",
  REDOUBLE: "var(--warn)",
  EXCLU: "var(--danger)",
};

const INPUT_CLASS =
  "w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors";

export default function YearEndDecisionsClient({
  decisions: initialDecisions,
  schoolYears,
  classes,
  canManageDecisions,
  canOverrideSchoolYear,
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
    if (!form.student_id || (canOverrideSchoolYear && !form.school_year_id)) {
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
      // school_year_id omis si non renseigné : le backend défaut sur
      // l'année courante (SCHOOLYEAR-V2-02).
      const { school_year_id, ...rest } = form;
      const payload = school_year_id ? form : rest;
      const res = await createYearEndDecisionAction(payload);
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
    if (!bulkForm.classe_origine_id || (canOverrideSchoolYear && !bulkForm.school_year_cible_id)) {
      setBulkError("Classe d'origine et année cible sont obligatoires.");
      return;
    }
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    startTransition(async () => {
      // school_year_cible_id omis si non renseigné : le backend défaut sur
      // l'année courante (SCHOOLYEAR-V2-02).
      const { school_year_cible_id, ...rest } = bulkForm;
      const payload = school_year_cible_id ? bulkForm : rest;
      const res = await promotionsBulkAction(payload);
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
      <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Année scolaire</label>
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
            <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Élève</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, prénom, matricule..."
              className={INPUT_CLASS}
            />
          </div>
          {canManageDecisions && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-white font-medium transition-opacity cursor-pointer"
              >
                <Plus className="size-4" />
                Nouvelle décision
              </button>
              <button
                type="button"
                onClick={openBulkModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-opacity cursor-pointer hover:opacity-90"
                style={{ background: "var(--ok)" }}
              >
                <Users className="size-4" />
                Promotion groupée
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Decisions table */}
      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        {filteredDecisions.length === 0 ? (
          <div className="p-12 text-center text-text-faint flex flex-col items-center gap-3">
            <ClipboardCheck className="size-8 text-text-faint" />
            Aucune décision trouvée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Élève</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Année scolaire</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Décision</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Classe d&apos;origine</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Classe destination</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Moyenne annuelle</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Prise par</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredDecisions.map((d: any) => (
                  <tr key={d.id} className="hover:bg-paper-alt transition-colors">
                    <td className="px-6 py-4 border-b border-line last:border-b-0 font-medium">
                      {d.student_nom} {d.student_prenom}
                      <br />
                      <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                        {d.student_matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-line">{d.school_year_label}</td>
                    <td className="px-6 py-4 border-b border-line">
                      <span
                        className="inline-flex items-center gap-[7px] text-[12.5px]"
                        style={{ color: DECISION_STYLES[d.decision] ?? "var(--mute)" }}
                      >
                        <span
                          className="size-[9px] rounded-full border-2"
                          style={{ borderColor: DECISION_STYLES[d.decision] ?? "var(--mute)" }}
                        />
                        {DECISION_LABELS[d.decision] ?? d.decision}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-line">{d.classe_origine_name}</td>
                    <td className="px-6 py-4 border-b border-line">{d.classe_destination_name ?? "—"}</td>
                    <td className="px-6 py-4 border-b border-line font-mono">{d.moyenne_annuelle ?? "—"}</td>
                    <td className="px-6 py-4 border-b border-line text-text-soft">{d.prise_par_name}</td>
                    <td className="px-6 py-4 border-b border-line text-text-soft">{d.date_decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create decision modal */}
      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-line rounded-2xl shadow-[var(--shadow)] w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-medium">Nouvelle décision de fin d&apos;année</h2>
                  <button onClick={() => setModalOpen(false)} className="text-text-faint hover:text-text cursor-pointer">
                    <X className="size-5" />
                  </button>
                </div>

                {modalError && (
                  <div className="p-3 rounded-lg text-sm bg-danger/10 border border-danger/20 text-danger">
                    {modalError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Élève</label>
                    <select
                      value={form.student_id}
                      onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                      className={INPUT_CLASS}
                    >
                      <option value="">Sélectionner...</option>
                    </select>
                  </div>

                  {canOverrideSchoolYear && (
                    <div className="space-y-1.5">
                      <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                        Année scolaire <span className="normal-case text-text-faint">(par défaut : année courante)</span>
                      </label>
                      <select
                        value={form.school_year_id}
                        onChange={(e) => setForm((p) => ({ ...p, school_year_id: e.target.value }))}
                        className={INPUT_CLASS}
                      >
                        <option value="">Année courante (par défaut)</option>
                        {schoolYears.map((sy: any) => (
                          <option key={sy.id} value={sy.id}>{sy.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Décision</label>
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
                      <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
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

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-line text-text-soft text-sm font-medium hover:border-accent-line hover:text-text transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateDecision}
                      disabled={modalLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-white font-medium transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {modalLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Créer la décision
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Bulk promotion modal */}
      {bulkModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-line rounded-2xl shadow-[var(--shadow)] w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-medium">Promotion groupée</h2>
                  <button onClick={() => setBulkModalOpen(false)} className="text-text-faint hover:text-text cursor-pointer">
                    <X className="size-5" />
                  </button>
                </div>

                {bulkError && (
                  <div className="p-3 rounded-lg text-sm bg-danger/10 border border-danger/20 text-danger">
                    {bulkError}
                  </div>
                )}

                {bulkSuccess && (
                  <div className="p-3 rounded-lg text-sm bg-ok/10 border border-ok/20 text-ok">
                    {bulkSuccess}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Classe d&apos;origine</label>
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

                  {canOverrideSchoolYear && (
                    <div className="space-y-1.5">
                      <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                        Année scolaire cible
                      </label>
                      <p className="text-xs text-text-faint">
                        L&apos;année dont les décisions doivent être appliquées (par défaut : année courante) — pas l&apos;année d&apos;inscription des élèves promus.
                      </p>
                      <select
                        value={bulkForm.school_year_cible_id}
                        onChange={(e) => setBulkForm((p) => ({ ...p, school_year_cible_id: e.target.value }))}
                        className={INPUT_CLASS}
                      >
                        <option value="">Année courante (par défaut)</option>
                        {schoolYears.map((sy: any) => (
                          <option key={sy.id} value={sy.id}>{sy.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">Filtrer par décision</label>
                    <select
                      value={bulkForm.decisions_filter}
                      onChange={(e) => setBulkForm((p) => ({ ...p, decisions_filter: e.target.value }))}
                      className={INPUT_CLASS}
                    >
                      <option value="ADMIS">ADMIS uniquement</option>
                      <option value="ADMIS_REDOUBLE">ADMIS + REDOUBLE</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      onClick={() => setBulkModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-line text-text-soft text-sm font-medium hover:border-accent-line hover:text-text transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleBulkPromotion}
                      disabled={bulkLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-opacity disabled:opacity-50 cursor-pointer hover:opacity-90"
                      style={{ background: "var(--ok)" }}
                    >
                      {bulkLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Lancer la promotion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
