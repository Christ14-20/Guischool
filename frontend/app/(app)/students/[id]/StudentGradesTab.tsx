/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Loader2,
  Download,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getBackendClient } from "@/lib/api/client";

interface Props {
  studentId: string;
}

export default function StudentGradesTab({ studentId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [periods, setPeriods] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [moyenneData, setMoyenneData] = useState<any>(null);
  const [loadingMoyenne, setLoadingMoyenne] = useState(false);

  // Bulletin async state
  const [bulletinStatus, setBulletinStatus] = useState<
    "idle" | "loading" | "polling" | "done" | "failed"
  >("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Load periods on mount
  useEffect(() => {
    async function load() {
      try {
        const client = await getBackendClient();
        const syResp = await client.get("/pedagogy/schoolyears/");
        const schoolYears =
          syResp.data?.data?.results ?? syResp.data?.data ?? [];
        const currentSy = schoolYears.find((sy: any) => sy.is_current) || schoolYears[0];
        if (!currentSy) return;
        const perResp = await client.get(
          `/pedagogy/school-years/${currentSy.id}/periods/`
        );
        const loaded = perResp.data?.data?.results ?? perResp.data?.data ?? [];
        setPeriods(loaded);
        if (loaded.length > 0) setPeriodId(loaded[0].id);
      } catch {
        setError("Impossible de charger les périodes.");
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
      {/* Period selector */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Période
            </label>
            <select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value);
                setBulletinStatus("idle");
                setPdfUrl(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
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
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {bulletinStatus === "done" && pdfUrl && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          Bulletin généré avec succès.
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto underline hover:text-emerald-300"
          >
            Ouvrir le PDF
          </a>
        </div>
      )}

      {/* Moyenne data */}
      {loadingMoyenne ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex items-center justify-center gap-3">
          <Loader2 className="size-5 animate-spin text-indigo-400" />
          Calcul des moyennes...
        </div>
      ) : moyenneData ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Moyenne Générale
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {moyenneData.moyenne_generale ?? "—"}
              </p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Mention
              </p>
              <p className="text-2xl font-bold mt-1">
                {moyenneData.mention ? (
                  <span
                    className={
                      moyenneData.mention === "Excellent"
                        ? "text-emerald-400"
                        : moyenneData.mention === "Insuffisant"
                        ? "text-rose-400"
                        : "text-indigo-400"
                    }
                  >
                    {moyenneData.mention}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Période
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {selectedPeriod?.name ?? "—"}
              </p>
            </div>
          </div>

          {/* Per-subject table */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Matière</th>
                    <th className="px-6 py-4">Moyenne</th>
                    <th className="px-6 py-4">Coefficient</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                  {(moyenneData.par_matiere ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <BookOpen className="size-5 text-slate-600" />
                          Aucune note disponible pour cette période.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    moyenneData.par_matiere.map((item: any, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-900/35 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">
                          {item.subject ?? item.subject_name ?? "—"}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          {item.moyenne ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
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
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
          <Clock className="size-8 text-slate-600" />
          {periodId
            ? "Aucune moyenne calculée pour cette période."
            : "Sélectionnez une période pour afficher les notes."}
        </div>
      )}
    </div>
  );
}
