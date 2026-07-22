/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Plus, Search, UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

interface StaffPageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    is_active?: string;
    page?: string;
  }>;
}

const ROLE_OPTIONS = [
  { value: "TEACHER", label: "Enseignant" },
  { value: "STUDENT_STUDIES", label: "Études" },
];

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Enseignant",
  STUDENT_STUDIES: "Études",
};

const ROLE_STYLES: Record<string, string> = {
  TEACHER: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  STUDENT_STUDIES: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = params.role || "";
  const isActive = params.is_active || "";
  const currentPage = parseInt(params.page || "1", 10);

  let staffData: { results: any[]; count: number } = { results: [], count: 0 };
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const queryParts: string[] = [];
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (roleFilter) queryParts.push(`role=${roleFilter}`);
    if (isActive) queryParts.push(`is_active=${isActive}`);
    if (currentPage > 1) queryParts.push(`page=${currentPage}`);
    const queryStr = queryParts.length ? `?${queryParts.join("&")}` : "";

    const resp = await client.get(`/auth/staff/${queryStr}`);

    if (resp.data?.status === "success") {
      staffData = resp.data.data;
    }
  } catch {
    errorMsg = "Impossible de charger la liste du personnel.";
  }

  const totalPages = Math.max(1, Math.ceil(staffData.count / 25));

  const buildLink = (overrides: Record<string, string | number>) => {
    const q: Record<string, string> = {};
    if (search) q.search = search;
    if (roleFilter) q.role = roleFilter;
    if (isActive) q.is_active = isActive;
    for (const [k, v] of Object.entries(overrides)) q[k] = String(v);
    const qs = new URLSearchParams(q).toString();
    return `/staff${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Personnel
          </h1>
          <p className="text-slate-400 mt-1">
            {staffData.count} membre{staffData.count > 1 ? "s" : ""} du personnel
          </p>
        </div>
        <Link
          href="/staff/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Nouveau membre du personnel
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
                placeholder="Nom ou email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rôle
            </label>
            <select
              name="role"
              defaultValue={roleFilter}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Tous</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statut
            </label>
            <div className="flex gap-2">
              <select
                name="is_active"
                defaultValue={isActive}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Tous</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
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
        {staffData.results.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <UserCog className="size-8 text-slate-600" />
            Aucun membre du personnel trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Nom & Prénom</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                {staffData.results.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      <Link
                        href={`/staff/${s.id}`}
                        className="hover:text-indigo-300 transition-colors"
                      >
                        {s.last_name} {s.first_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{s.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                          ROLE_STYLES[s.role?.name] ?? ""
                        }`}
                      >
                        {ROLE_LABELS[s.role?.name] ?? s.role?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
                          s.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {s.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {staffData.count > 25 && (
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
