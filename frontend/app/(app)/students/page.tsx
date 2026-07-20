/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Plus, Search, Users } from "lucide-react";
import ExportCsvButton from "./ExportCsvButton";
import StatutBadge from "./StatutBadge";

export const dynamic = "force-dynamic";

interface StudentsPageProps {
  searchParams: Promise<{
    search?: string;
    classe_id?: string;
    statut?: string;
    school_year_id?: string;
    page?: string;
  }>;
}

const STATUTS = [
  { value: "ACTIF", label: "Actif" },
  { value: "SUSPENDU", label: "Suspendu" },
  { value: "TRANSFERE", label: "Transféré" },
  { value: "SORTI", label: "Sorti" },
  { value: "ARCHIVE", label: "Archivé" },
];

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const classeId = params.classe_id || "";
  const statut = params.statut || "";
  const schoolYearId = params.school_year_id || "";
  const currentPage = parseInt(params.page || "1", 10);

  let studentsData: { results: any[]; count: number } = { results: [], count: 0 };
  let classes: any[] = [];
  let schoolYears: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const queryParts: string[] = [];
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (classeId) queryParts.push(`classe_id=${classeId}`);
    if (statut) queryParts.push(`statut=${statut}`);
    if (schoolYearId) queryParts.push(`school_year_id=${schoolYearId}`);
    if (currentPage > 1) queryParts.push(`page=${currentPage}`);
    const queryStr = queryParts.length ? `?${queryParts.join("&")}` : "";

    const [studentsResp, classesResp, syResp] = await Promise.all([
      client.get(`/students/${queryStr}`),
      client.get("/pedagogy/classes/"),
      client.get("/pedagogy/schoolyears/"),
    ]);

    if (studentsResp.data?.status === "success") {
      studentsData = studentsResp.data.data;
    }
    if (classesResp.data?.status === "success") {
      classes = classesResp.data.data.results ?? [];
    }
    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger la liste des élèves.";
  }

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(studentsData.count / pageSize));

  const buildLink = (overrides: Record<string, string | number>) => {
    const q: Record<string, string> = {};
    if (search) q.search = search;
    if (classeId) q.classe_id = classeId;
    if (statut) q.statut = statut;
    if (schoolYearId) q.school_year_id = schoolYearId;
    for (const [k, v] of Object.entries(overrides)) q[k] = String(v);
    const qs = new URLSearchParams(q).toString();
    return `/students${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Élèves
          </h1>
          <p className="text-slate-400 mt-1">
            {studentsData.count} élève{studentsData.count > 1 ? "s" : ""} inscrit
            {studentsData.count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            query={{ search, classe_id: classeId, statut, school_year_id: schoolYearId }}
          />
          <Link
            href="/students/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
          >
            <Plus className="size-4" />
            Nouvel élève
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Nom, prénom, matricule..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Classe
            </label>
            <select
              name="classe_id"
              defaultValue={classeId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Toutes</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statut
            </label>
            <select
              name="statut"
              defaultValue={statut}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Tous</option>
              {STATUTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Année scolaire
            </label>
            <div className="flex gap-2">
              <select
                name="school_year_id"
                defaultValue={schoolYearId}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Toutes</option>
                {schoolYears.map((sy: any) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
              >
                Filtrer
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* DataTable */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        {studentsData.results.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Users className="size-8 text-slate-600" />
            Aucun élève trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Matricule</th>
                  <th className="px-6 py-4">Nom & Prénom</th>
                  <th className="px-6 py-4">Classe</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Tuteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                {studentsData.results.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                        {s.matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      <Link
                        href={`/students/${s.id}`}
                        className="hover:text-indigo-300 transition-colors"
                      >
                        {s.nom} {s.prenom}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{s.classe_actuelle?.name || "—"}</td>
                    <td className="px-6 py-4">
                      <StatutBadge statut={s.statut} />
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {s.guardian_phone || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {studentsData.count > pageSize && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/50 text-sm text-slate-400">
            <span>
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={buildLink({ page: currentPage - 1 })}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
                >
                  Précédent
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={buildLink({ page: currentPage + 1 })}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
                >
                  Suivant
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
