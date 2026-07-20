/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import CreateSchoolYearModal from "./CreateSchoolYearModal";
import SetCurrentButton from "./SetCurrentButton";

export const dynamic = "force-dynamic";

export default async function SchoolYearsPage() {
  let schoolYears: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/schoolyears/");
    if (resp.data?.status === "success") {
      schoolYears = resp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger les années scolaires.";
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Années scolaires
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les années scolaires et leurs périodes
          </p>
        </div>
        <CreateSchoolYearModal />
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schoolYears.length === 0 && !errorMsg && (
          <div className="col-span-full p-10 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl">
            Aucune année scolaire pour le moment.
          </div>
        )}

        {schoolYears.map((sy: any) => (
          <div
            key={sy.id}
            className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4 hover:border-slate-700/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{sy.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sy.start_date} → {sy.end_date}
                  </p>
                </div>
              </div>
              {sy.is_current && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-3" />
                  Courante
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
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

              {!sy.is_current && sy.status !== "CLOSED" && (
                <SetCurrentButton schoolYearId={sy.id} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
