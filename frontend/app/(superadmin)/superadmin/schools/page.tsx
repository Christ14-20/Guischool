/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import SchoolActions from "./SchoolActions";
import { STATUS_STYLES } from "../statusStyles";


export const dynamic = "force-dynamic";

interface SchoolsPageProps {
  searchParams: Promise<{
    status?: string;
    plan_id?: string;
    search?: string;
    ordering?: string;
    page?: string;
  }>;
}

export default async function SuperAdminSchoolsPage({ searchParams }: SchoolsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status || "";
  const planFilter = params.plan_id || "";
  const searchQuery = params.search || "";
  const ordering = params.ordering || "-created_at";
  const currentPage = parseInt(params.page || "1", 10);

  let schoolsData = { results: [], count: 0 };
  let plans: any[] = [];
  let errorMsg = null;

  try {
    const client = await getBackendClient();

    const queryParts = [];
    if (statusFilter) queryParts.push(`status=${statusFilter}`);
    if (planFilter) queryParts.push(`plan_id=${planFilter}`);
    if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
    if (ordering) queryParts.push(`ordering=${ordering}`);
    if (currentPage > 1) queryParts.push(`page=${currentPage}`);

    const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    const schoolsResp = await client.get(`/superadmin/schools/${queryStr}`);
    if (schoolsResp.data?.status === "success") {
      schoolsData = schoolsResp.data.data;
    }

    const plansResp = await client.get("/superadmin/plans/");
    if (plansResp.data?.status === "success") {
      plans = Array.isArray(plansResp.data.data) ? plansResp.data.data : [];
    }
  } catch (err: any) {
    console.error("Schools data fetch error:", err.message);
    errorMsg = "Impossible de récupérer la liste des établissements. Veuillez réessayer.";
  }

  const getPageLink = (pageNumber: number) => {
    const queryParts = [];
    if (statusFilter) queryParts.push(`status=${statusFilter}`);
    if (planFilter) queryParts.push(`plan_id=${planFilter}`);
    if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
    if (ordering) queryParts.push(`ordering=${ordering}`);
    queryParts.push(`page=${pageNumber}`);
    return `/superadmin/schools?${queryParts.join("&")}`;
  };

  const totalPages = Math.ceil(schoolsData.count / 10); // page size par défaut

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Établissements</h1>
          <p className="m-0 text-text-soft text-[13.5px]">Gérez tous les tenants du réseau Eduguinée 3.0</p>
        </div>
        <Link
          href="/superadmin/schools/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Nouvel établissement
        </Link>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {/* Filters */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <form method="get" className="flex items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-[7px] flex-1 min-w-[220px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
                <input
                  type="text"
                  name="search"
                  defaultValue={searchQuery}
                  placeholder="Nom, contact..."
                  className="w-full bg-paper-alt border border-line rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px] min-w-[190px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Statut</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIVE">Actif</option>
                <option value="TRIAL">Essai (Trial)</option>
                <option value="SUSPENDED_SOFT">Suspendu (lecture seule)</option>
                <option value="SUSPENDED_HARD">Suspendu (bloqué)</option>
                <option value="CANCELLED">Résilié</option>
              </select>
            </div>

            <div className="flex flex-col gap-[7px] min-w-[190px]">
              <label className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Abonnement / Plan</label>
              <select
                name="plan_id"
                defaultValue={planFilter}
                className="bg-paper-alt border border-line rounded-lg px-3 py-2.5 text-[13px] text-text outline-none focus:border-accent-line transition-colors"
              >
                <option value="">Tous les plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              <SlidersHorizontal className="size-3.5" />
              Filtrer
            </button>
            <Link
              href="/superadmin/schools"
              className="rounded-lg border border-line text-text-soft text-[13px] font-semibold px-4 py-2.5 hover:border-accent-line hover:text-text transition-colors"
            >
              Réinitialiser
            </Link>
          </form>
        </div>

        {/* Table */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Établissement</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Contact</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Type</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Plan actuel</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Élèves</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Statut</th>
                  <th className="text-right text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schoolsData.results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-text-faint text-sm">
                      Aucun établissement ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  schoolsData.results.map((school: any) => {
                    const seal = STATUS_STYLES[school.status] || STATUS_STYLES.TRIAL;
                    return (
                      <tr key={school.id}>
                        <td className="py-[15px] px-2 border-b border-line last:border-b-0">
                          <div className="font-semibold text-[13.5px]">{school.name}</div>
                          <div className="font-mono text-text-faint text-xs mt-0.5">{school.slug}.eduguinee.gn</div>
                        </td>
                        <td className="py-[15px] px-2 border-b border-line text-xs">
                          <div className="text-text-soft font-medium">{school.contact_name}</div>
                          <div className="text-text-faint mt-0.5">{school.contact_email}</div>
                        </td>
                        <td className="py-[15px] px-2 border-b border-line text-text-faint text-xs">{school.school_type}</td>
                        <td className="py-[15px] px-2 border-b border-line">
                          <span className="inline-block px-2.5 py-[3px] rounded-full border border-line text-[11.5px] text-text-soft">
                            {school.plan?.name || "Sans plan"}
                          </span>
                        </td>
                        <td className="py-[15px] px-2 border-b border-line font-mono text-text-soft text-[13.5px]">
                          {school.student_count}
                        </td>
                        <td className="py-[15px] px-2 border-b border-line">
                          <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: seal.color }}>
                            <span className="size-[11px] rounded-full border-2" style={{ borderColor: seal.color }} />
                            {seal.label}
                          </span>
                        </td>
                        <td className="py-[15px] px-2 border-b border-line">
                          <SchoolActions schoolId={school.id} schoolName={school.name} status={school.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pt-5 mt-1 border-t border-line flex items-center justify-between">
              <span className="text-xs text-text-faint">
                Page {currentPage} sur {totalPages}
              </span>
              <div className="flex gap-2">
                <Link
                  href={currentPage > 1 ? getPageLink(currentPage - 1) : "#"}
                  className={`px-3 py-1.5 border border-line rounded-lg text-xs font-medium text-text-soft hover:border-accent-line hover:text-text transition-colors ${
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Précédent
                </Link>
                <Link
                  href={currentPage < totalPages ? getPageLink(currentPage + 1) : "#"}
                  className={`px-3 py-1.5 border border-line rounded-lg text-xs font-medium text-text-soft hover:border-accent-line hover:text-text transition-colors ${
                    currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Suivant
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
