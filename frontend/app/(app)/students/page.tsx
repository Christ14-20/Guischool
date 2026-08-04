/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import { Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import ExportCsvButton from "./ExportCsvButton";
import StatutBadge from "./StatutBadge";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

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
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ELEVES_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les élèves." />;
  }
  const canCreate = hasPermission(permissions, PERMISSIONS.ELEVES_CREATE);

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
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Élèves</h1>
          <p className="m-0 text-text-soft text-[13.5px]">
            {studentsData.count} élève{studentsData.count > 1 ? "s" : ""} inscrit
            {studentsData.count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportCsvButton
            query={{ search, classe_id: classeId, statut, school_year_id: schoolYearId }}
          />
          {canCreate && (
            <Link
              href="/students/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              Nouvel élève
            </Link>
          )}
        </div>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {/* Filters */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Nom, prénom, matricule..."
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Classe</label>
              <select
                name="classe_id"
                defaultValue={classeId}
                className="bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
              >
                <option value="">Toutes</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Statut</label>
              <select
                name="statut"
                defaultValue={statut}
                className="bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
              >
                <option value="">Tous</option>
                {STATUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Année scolaire</label>
              <div className="flex gap-2">
                <select
                  name="school_year_id"
                  defaultValue={schoolYearId}
                  className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity shrink-0"
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filtrer
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* DataTable */}
        <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
          {studentsData.results.length === 0 ? (
            <div className="p-12 text-center text-text-faint flex flex-col items-center gap-3">
              <Users className="size-8 text-text-faint" />
              Aucun élève trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Matricule</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom & Prénom</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Classe</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Tuteur</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {studentsData.results.map((s: any) => (
                    <tr key={s.id} className="hover:bg-paper-alt transition-colors">
                      <td className="px-6 py-4 border-b border-line last:border-b-0">
                        <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                          {s.matricule}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b border-line font-medium">
                        <Link
                          href={`/students/${s.id}`}
                          className="hover:text-accent transition-colors"
                        >
                          {s.nom} {s.prenom}
                        </Link>
                      </td>
                      <td className="px-6 py-4 border-b border-line text-text-soft">{s.classe_actuelle?.name || "—"}</td>
                      <td className="px-6 py-4 border-b border-line">
                        <StatutBadge statut={s.statut} />
                      </td>
                      <td className="px-6 py-4 border-b border-line text-text-soft">
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-line text-sm text-text-faint">
              <span>
                Page {currentPage} sur {totalPages}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={buildLink({ page: currentPage - 1 })}
                    className="px-3 py-1.5 border border-line rounded-lg hover:border-accent-line hover:text-text transition-colors"
                  >
                    Précédent
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={buildLink({ page: currentPage + 1 })}
                    className="px-3 py-1.5 border border-line rounded-lg hover:border-accent-line hover:text-text transition-colors"
                  >
                    Suivant
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
