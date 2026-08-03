/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Download,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Plus,
  GraduationCap,
} from "lucide-react";
import { getBackendClient } from "@/lib/api/client";

interface Props {
  studentId: string;
}

export default function StudentGradesTab({ studentId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [periods, setPeriods] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [moyenneData, setMoyenneData] = useState<any>(null);
  const [loadingMoyenne, setLoadingMoyenne] = useState(false);

  // Role-based permission
  const [canDecide, setCanDecide] = useState(false);

  // Bulletin async state
  const [bulletinStatus, setBulletinStatus] = useState<
    "idle" | "loading" | "polling" | "done" | "failed"
  >("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Year-end decision state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    school_year_id: "",
    decision: "ADMIS",
    classe_destination_id: "",
  });
  const [schoolYears, setSchoolYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Load periods, school years, classes, and role on mount
  useEffect(() => {
    async function load() {
      try {
        const client = await getBackendClient();
        const [syResp, clsResp] = await Promise.all([
          client.get("/pedagogy/schoolyears/"),
          client.get("/pedagogy/classes/"),
        ]);
        const schoolYearsData =
          syResp.data?.data?.results ?? syResp.data?.data ?? [];
        const classesData = clsResp.data?.data?.results ?? clsResp.data?.data ?? [];
        setSchoolYears(schoolYearsData);
        setClasses(classesData);

        // Check if user is DIRECTOR or STUDENT_STUDIES for decision permission
        const authResp = await client.get("/auth/permissions/me/");
        const perms = authResp.data?.data?.permissions ?? [];
        setCanDecide(
          perms.includes("notes:validate") || perms.includes("eleves:update")
        );

        const currentSy = schoolYearsData.find((sy: any) => sy.is_current) || schoolYearsData[0];
        if (!currentSy) return;
        const perResp = await client.get(
          `/pedagogy/school-years/${currentSy.id}/periods/`
        );
        const loaded = perResp.data?.data?.results ?? perResp.data?.data ?? [];
        setPeriods(loaded);
        if (loaded.length > 0) setPeriodId(loaded[0].id);
      } catch {
        setError("Impossible de charger les données.");
      }
    }
    load();
  }, []);

  // Fetch moyenne when period changes
  useEffect(() => {
    if (!periodId) return;
    async function loadMoyenne() {
      setLoadingMoyenne(true);
      setError(null);
      try {
        const client = await getBackendClient();
        const resp = await client.get(
          `/students/${studentId}/moyenne/?period_id=${periodId}`
        );
        if (resp.data?.status === "success") {
          setMoyenneData(resp.data.data);
        } else {
          setMoyenneData(null);
        }
      } catch {
        setMoyenneData(null);
      } finally {
        setLoadingMoyenne(false);
      }
    }
    loadMoyenne();
  }, [periodId, studentId]);

  const openDecisionModal = useCallback(async () => {
    setDecisionError(null);
    try {
      const client = await getBackendClient();
      const [syResp, clsResp] = await Promise.all([
        client.get("/pedagogy/schoolyears/"),
        client.get("/pedagogy/classes/"),
      ]);
      const syData = syResp.data?.data?.results ?? syResp.data?.data ?? [];
      const clsData = clsResp.data?.data?.results ?? clsResp.data?.data ?? [];
      setSchoolYears(syData);
      setClasses(clsData);
      setDecisionForm({ school_year_id: "", decision: "ADMIS", classe_destination_id: "" });
      setDecisionModalOpen(true);
    } catch {
      setDecisionError("Impossible de charger les données pour la décision.");
    }
  }, []);

const handleDecisionSubmit = useCallback(async () => {
    if (!decisionForm.school_year_id || (decisionForm.decision === "ADMIS" && !decisionForm.classe_destination_id)) {
      setDecisionError("Année scolaire et classe de destination (si ADMIS) sont obligatoires.");
      return;
    }
    setDecisionLoading(true);
    setDecisionError(null);
    startTransition(async () => {
      try {
        const client = await getBackendClient();
        const resp = await client.post("/pedagogy/year-end-decisions/", {
          student: studentId,
          school_year: decisionForm.school_year_id,
          decision: decisionForm.decision,
          classe_destination: decisionForm.classe_destination_id || undefined,
        });
        if (resp.data?.status === "success") {
          setDecisionModalOpen(false);
          router.refresh();
        } else {
          setDecisionError(resp.data?.message || "Erreur lors de la création de la décision.");
        }
      } catch (err: any) {
        setDecisionError(err.response?.data?.message || "Erreur lors de la création de la décision.");
      } finally {
        setDecisionLoading(false);
      }
    });
  }, [decisionForm, studentId, router]);

  const generateBulletin = useCallback(() => {
    if (!periodId) return;
    setBulletinStatus("loading");
    setError(null);

    startTransition(async () => {
      try {
        const client = await getBackendClient();
        const resp = await client.post(`/students/${studentId}/bulletin/`, {
          period_id: periodId,
        });
        const taskId = resp.data?.data?.task_id;
        if (!taskId) {
          setError("Impossible de lancer la génération du bulletin.");
          setBulletinStatus("idle");
          return;
        }
        setBulletinStatus("polling");
        // Poll every 2s for up to 30s
        const maxPolls = 15;
        let pollCount = 0;
        const poll = async () => {
          pollCount++;
          try {
            const statusResp = await client.get(
              `/pedagogy/tasks/${taskId}/status/`
            );
            const status = statusResp.data?.data?.status;
            if (status === "done") {
              const result = statusResp.data?.data?.result;
              setPdfUrl(result?.pdf_url ?? null);
              setBulletinStatus("done");
              return;
            }
            if (status === "failed") {
              setError(
                statusResp.data?.data?.error ??
                  "Erreur lors de la génération du bulletin."
              );
              setBulletinStatus("failed");
              return;
            }
          } catch {
            // continue polling
          }
          if (pollCount < maxPolls) {
            setTimeout(poll, 2000);
          } else {
            setError("La génération du bulletin a pris trop de temps.");
            setBulletinStatus("failed");
          }
        };
        setTimeout(poll, 2000);
      } catch {
        setError("Erreur lors de la demande de bulletin.");
        setBulletinStatus("idle");
      }
    });
  }, [periodId, studentId]);

  const selectedPeriod = periods.find((p) => p.id === periodId);

  return (
    <div className="space-y-6">
      {/* Period selector + Bulletin + Decision buttons */}
      <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
              Période
            </label>
            <select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value);
                setBulletinStatus("idle");
                setPdfUrl(null);
              }}
              className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
            >
              {periods.length === 0 && (
                <option value="">Aucune période disponible</option>
              )}
              {periods.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bulletin button */}
          <div className="flex items-end">
            <button
              onClick={generateBulletin}
              disabled={
                !periodId ||
                bulletinStatus === "loading" ||
                bulletinStatus === "polling"
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-white font-medium transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {bulletinStatus === "loading" || bulletinStatus === "polling" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Télécharger le bulletin
                </>
              )}
            </button>
          </div>

          {/* Year-end decision button */}
          {canDecide && (
            <div className="flex items-end">
              <button
                onClick={openDecisionModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: "var(--ok)" }}
              >
                <GraduationCap className="size-4" />
                D&apos;écision de fin d&apos;année
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {bulletinStatus === "done" && pdfUrl && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2 bg-ok/10 border border-ok/20 text-ok">
          <CheckCircle2 className="size-4 shrink-0" />
          Bulletin généré avec succès.
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto underline hover:opacity-80"
          >
            Ouvrir le PDF
          </a>
        </div>
      )}

      {/* Moyenne data */}
      {loadingMoyenne ? (
        <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl flex items-center justify-center gap-3">
          <Loader2 className="size-5 animate-spin text-accent" />
          Calcul des moyennes...
        </div>
      ) : moyenneData ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] text-center">
              <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">
                Moyenne Générale
              </p>
              <p className="text-3xl font-semibold mt-1">
                {moyenneData.moyenne_generale ?? "—"}
              </p>
            </div>
            <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] text-center">
              <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">
                Mention
              </p>
              <p className="text-2xl font-semibold mt-1">
                {moyenneData.mention ? (
                  <span
                    style={{
                      color:
                        moyenneData.mention === "Excellent"
                          ? "var(--ok)"
                          : moyenneData.mention === "Insuffisant"
                          ? "var(--danger)"
                          : "var(--accent)",
                    }}
                  >
                    {moyenneData.mention}
                  </span>
                ) : (
                  <span className="text-text-faint">—</span>
                )}
              </p>
            </div>
            <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] text-center">
              <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">
                Période
              </p>
              <p className="text-lg font-semibold mt-1">
                {selectedPeriod?.name ?? "—"}
              </p>
            </div>
          </div>

          {/* Per-subject table */}
          <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Matière</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Moyenne</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Coefficient</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(moyenneData.par_matiere ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-text-faint">
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="size-5 text-text-faint" />
                          Aucune note disponible pour cette période.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    moyenneData.par_matiere.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-paper-alt transition-colors">
                        <td className="px-6 py-4 border-b border-line last:border-b-0 font-medium">
                          {item.subject ?? item.subject_name ?? "—"}
                        </td>
                        <td className="px-6 py-4 border-b border-line font-mono">
                          {item.moyenne ?? "—"}
                        </td>
                        <td className="px-6 py-4 border-b border-line text-text-soft">
                          {item.coefficient ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl flex flex-col items-center gap-3">
          <Clock className="size-8 text-text-faint" />
          {periodId
            ? "Aucune moyenne calculée pour cette période."
            : "Sélectionnez une période pour afficher les notes."}
        </div>
      )}

      {/* Year-end decision modal */}
      {decisionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-line rounded-2xl shadow-[var(--shadow)] w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-medium text-text">
                    D&apos;écision de fin d&apos;année
                  </h2>
                  <button
                    onClick={() => setDecisionModalOpen(false)}
                    className="text-text-faint hover:text-text cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {decisionError && (
                  <div className="p-3 rounded-lg text-sm bg-danger/10 border border-danger/20 text-danger">
                    {decisionError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Année scolaire
                    </label>
                    <select
                      value={decisionForm.school_year_id}
                      onChange={(e) =>
                        setDecisionForm((p) => ({ ...p, school_year_id: e.target.value }))
                      }
                      className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    >
                      {schoolYears.map((sy: any) => (
                        <option key={sy.id} value={sy.id}>
                          {sy.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Décision
                    </label>
                    <select
                      value={decisionForm.decision}
                      onChange={(e) =>
                        setDecisionForm((p) => ({ ...p, decision: e.target.value }))
                      }
                      className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    >
                      <option value="ADMIS">Admis</option>
                      <option value="REDOUBLE">Redouble</option>
                      <option value="EXCLU">Exclu</option>
                    </select>
                  </div>

                  {(decisionForm.decision === "ADMIS" || decisionForm.decision === "REDOUBLE") && (
                    <div className="space-y-1.5">
                      <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                        Classe de destination
                      </label>
                      <select
                        value={decisionForm.classe_destination_id}
                        onChange={(e) =>
                          setDecisionForm((p) => ({
                            ...p,
                            classe_destination_id: e.target.value,
                          }))
                        }
                        className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
                      >
                        <option value="">Sélectionner...</option>
                        {classes.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <button
                      onClick={() => setDecisionModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-line text-text-soft text-sm font-medium hover:border-accent-line hover:text-text transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDecisionSubmit}
                      disabled={decisionLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-white font-medium transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {decisionLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      Créer la décision
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
