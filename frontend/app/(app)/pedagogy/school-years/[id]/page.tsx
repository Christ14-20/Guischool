/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Lock,
  Unlock,
  Hash,
} from "lucide-react";
import CreatePeriodModal from "./CreatePeriodModal";
import ClosePeriodButton from "./ClosePeriodButton";

export const dynamic = "force-dynamic";

export default async function SchoolYearDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let sy: any = null;
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get(`/pedagogy/schoolyears/${id}/`);
    if (resp.data?.status === "success") {
      sy = resp.data.data;
    }
  } catch {
    errorMsg = "Impossible de charger l'année scolaire.";
  }

  if (!sy && !errorMsg) {
    errorMsg = "Année scolaire non trouvée.";
  }

  return (
    <div className="space-y-8 animate-fade-in p-7 px-8">
      <Link
        href="/pedagogy/school-years"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux années scolaires
      </Link>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {sy && (
        <>
          {/* School year header */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <CalendarDays className="size-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{sy.label}</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    {sy.start_date} → {sy.end_date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {sy.is_current && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                    Courante
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    sy.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : sy.status === "PREPARATION"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      sy.status === "ACTIVE"
                        ? "bg-emerald-400"
                        : sy.status === "PREPARATION"
                        ? "bg-amber-400"
                        : "bg-slate-500"
                    }`}
                  />
                  {sy.status === "ACTIVE"
                    ? "Active"
                    : sy.status === "PREPARATION"
                    ? "Préparation"
                    : "Clôturée"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/50">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Périodes</span>
                <p className="text-sm font-semibold text-white">
                  {sy.periods?.length ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Clôturées</span>
                <p className="text-sm font-semibold text-white">
                  {sy.periods?.filter((p: any) => p.is_closed).length ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Ouvertes</span>
                <p className="text-sm font-semibold text-white">
                  {sy.periods?.filter((p: any) => !p.is_closed).length ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Periods section */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md">
            <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="size-5 text-indigo-400" />
                Périodes
              </h2>
              <CreatePeriodModal schoolYearId={id} />
            </div>

            {(sy.periods?.length ?? 0) === 0 && (
              <div className="p-10 text-center text-slate-500">
                Aucune période configurée pour cette année scolaire.
              </div>
            )}

            {(sy.periods?.length ?? 0) > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Ordre</th>
                      <th className="px-6 py-4">Nom</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Dates</th>
                      <th className="px-6 py-4 text-center">Statut</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                    {sy.periods
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-900/35 transition-colors">
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1">
                              <Hash className="size-3 text-slate-500" />
                              <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                                {p.order}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">{p.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                              {p.type === "SEMESTRE"
                                ? "Semestre"
                                : p.type === "TRIMESTRE"
                                ? "Trimestre"
                                : p.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {p.start_date} → {p.end_date}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {p.is_closed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                <Lock className="size-3" />
                                Clôturée
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                                <Unlock className="size-3" />
                                Ouverte
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!p.is_closed && (
                              <ClosePeriodButton periodId={p.id} schoolYearId={id} />
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
