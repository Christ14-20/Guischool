/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import { CalendarCheck } from "lucide-react";
import AttendanceGrid from "./AttendanceGrid";

export const dynamic = "force-dynamic";

interface AttendancePageProps {
  searchParams: Promise<{ classe_id?: string; date?: string }>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const classeId = params.classe_id || "";
  const date = params.date || todayIso();

  let classes: any[] = [];
  let students: any[] = [];
  let existing: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const classesResp = await client.get("/pedagogy/classes/");
    if (classesResp.data?.status === "success") {
      classes = classesResp.data.data.results ?? [];
    }

    if (classeId && date) {
      const [studentsResp, attResp] = await Promise.all([
        client.get(`/students/?classe_id=${classeId}&statut=ACTIF&page_size=100`),
        client.get(`/pedagogy/attendances/?classe_id=${classeId}&date=${date}`),
      ]);
      if (studentsResp.data?.status === "success") {
        students = studentsResp.data.data.results ?? [];
      }
      if (attResp.data?.status === "success") {
        existing = attResp.data.data ?? [];
      }
    }
  } catch {
    errorMsg = "Impossible de charger les données de présence.";
  }

  const selectedClass = classes.find((c: any) => c.id === classeId);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Présences
          </h1>
          <p className="text-slate-400 mt-1">
            Saisie et suivi de l&apos;assiduité par classe et par jour.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Filtres classe + date */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <form
          method="get"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
        >
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Classe
            </label>
            <select
              name="classe_id"
              defaultValue={classeId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Sélectionner...</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Charger la classe
          </button>
        </form>
      </div>

      {classeId && date ? (
        <AttendanceGrid
          classeId={classeId}
          className={selectedClass?.name ?? ""}
          date={date}
          students={students}
          existing={existing}
        />
      ) : (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
          <CalendarCheck className="size-8 text-slate-600" />
          Sélectionnez une classe et une date pour saisir les présences.
        </div>
      )}
    </div>
  );
}
