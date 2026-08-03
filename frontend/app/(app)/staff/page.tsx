/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Plus, Search, SlidersHorizontal, UserCog, Users, GraduationCap, BookOpen, Landmark, Clock, Percent } from "lucide-react";

export const dynamic = "force-dynamic";

interface StaffPageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    is_active?: string;
    page?: string;
  }>;
}

// STAFF-V2-05 : ACCOUNTANT ajouté ici aussi — même résidu pré-existant que
// StaffDetailClient.tsx (corrigé en STAFF-V2-02), le tableau de bord rend ce
// rôle visible dans ses stat cards.
const ROLE_OPTIONS = [
  { value: "TEACHER", label: "Enseignant" },
  { value: "STUDENT_STUDIES", label: "Études" },
  { value: "ACCOUNTANT", label: "Comptable" },
];

const ROLE_STYLES: Record<string, { color: string; label: string }> = {
  TEACHER: { color: "var(--accent)", label: "Enseignant" },
  STUDENT_STUDIES: { color: "var(--ok)", label: "Études" },
  ACCOUNTANT: { color: "var(--warn)", label: "Comptable" },
};

interface DashboardData {
  total_staff: number;
  by_role: Record<string, number>;
  average_tenure_years: number;
  vacataire_rate: number;
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = params.role || "";
  const isActive = params.is_active || "";
  const currentPage = parseInt(params.page || "1", 10);

  let staffData: { results: any[]; count: number } = { results: [], count: 0 };
  let dashboard: DashboardData | null = null;
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const queryParts: string[] = [];
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (roleFilter) queryParts.push(`role=${roleFilter}`);
    if (isActive) queryParts.push(`is_active=${isActive}`);
    if (currentPage > 1) queryParts.push(`page=${currentPage}`);
    const queryStr = queryParts.length ? `?${queryParts.join("&")}` : "";

    const [staffResp, dashboardResp] = await Promise.all([
      client.get(`/auth/staff/${queryStr}`),
      client.get("/auth/staff/dashboard/").catch(() => ({ data: { status: "error" } })),
    ]);

    if (staffResp.data?.status === "success") {
      staffData = staffResp.data.data;
    }
    if (dashboardResp.data?.status === "success") {
      dashboard = dashboardResp.data.data;
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
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Personnel</h1>
          <p className="m-0 text-text-soft text-[13.5px]">
            {staffData.count} membre{staffData.count > 1 ? "s" : ""} du personnel
          </p>
        </div>
        <Link
          href="/staff/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Nouveau membre du personnel
        </Link>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {/* Tableau de bord (STAFF-V2-05) — comptes actifs uniquement */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Effectif actif", value: dashboard.total_staff, icon: Users },
              { label: "Enseignants", value: dashboard.by_role.TEACHER ?? 0, icon: GraduationCap },
              { label: "Études", value: dashboard.by_role.STUDENT_STUDIES ?? 0, icon: BookOpen },
              { label: "Comptables", value: dashboard.by_role.ACCOUNTANT ?? 0, icon: Landmark },
              {
                label: "Ancienneté moyenne",
                value: `${dashboard.average_tenure_years} an${dashboard.average_tenure_years >= 2 ? "s" : ""}`,
                icon: Clock,
              },
              { label: "Taux de vacataires", value: `${Math.round(dashboard.vacataire_rate * 100)}%`, icon: Percent },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="border border-line bg-card rounded-xl p-4 shadow-[var(--shadow)]"
              >
                <div className="flex items-center gap-2 text-text-faint mb-2">
                  <Icon className="size-3.5" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[.08em]">{label}</span>
                </div>
                <div className="text-2xl font-serif font-medium tabular-nums">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Nom ou email..."
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Rôle</label>
              <select
                name="role"
                defaultValue={roleFilter}
                className="bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
              >
                <option value="">Tous</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[7px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Statut</label>
              <div className="flex gap-2">
                <select
                  name="is_active"
                  defaultValue={isActive}
                  className="w-full bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
                >
                  <option value="">Tous</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
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
          {staffData.results.length === 0 ? (
            <div className="p-12 text-center text-text-faint flex flex-col items-center gap-3">
              <UserCog className="size-8 text-text-faint" />
              Aucun membre du personnel trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom & Prénom</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Email</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Rôle</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {staffData.results.map((s: any) => {
                    const roleStyle = ROLE_STYLES[s.role?.name];
                    return (
                      <tr key={s.id} className="hover:bg-paper-alt transition-colors">
                        <td className="px-6 py-4 border-b border-line last:border-b-0 font-medium">
                          <Link
                            href={`/staff/${s.id}`}
                            className="hover:text-accent transition-colors"
                          >
                            {s.last_name} {s.first_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 border-b border-line text-text-soft">{s.email}</td>
                        <td className="px-6 py-4 border-b border-line">
                          <span
                            className="inline-flex items-center gap-[7px] text-[12.5px]"
                            style={{ color: roleStyle?.color ?? "var(--mute)" }}
                          >
                            <span
                              className="size-[9px] rounded-full border-2"
                              style={{ borderColor: roleStyle?.color ?? "var(--mute)" }}
                            />
                            {roleStyle?.label ?? s.role?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-b border-line">
                          <span
                            className="inline-flex items-center gap-[7px] text-[12.5px]"
                            style={{ color: s.is_active ? "var(--ok)" : "var(--danger)" }}
                          >
                            <span
                              className="size-[9px] rounded-full border-2"
                              style={{ borderColor: s.is_active ? "var(--ok)" : "var(--danger)" }}
                            />
                            {s.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {staffData.count > 25 && (
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
