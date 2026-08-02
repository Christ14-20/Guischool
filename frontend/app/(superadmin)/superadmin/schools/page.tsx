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
    
    // 1. Fetch schools with filters
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

    // 2. Fetch plans for the dropdown filter
    const plansResp = await client.get("/superadmin/plans/");
    if (plansResp.data?.status === "success") {
      plans = Array.isArray(plansResp.data.data) ? plansResp.data.data : [];
    }
  } catch (err: any) {
    console.error("Schools data fetch error:", err.message);
    errorMsg = "Impossible de récupérer la liste des établissements. Veuillez réessayer.";
  }

  // Construct links for pagination
  const getPageLink = (pageNumber: number) => {
    const queryParts = [];
    if (statusFilter) queryParts.push(`status=${statusFilter}`);
    if (planFilter) queryParts.push(`plan_id=${planFilter}`);
    if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
    if (ordering) queryParts.push(`ordering=${ordering}`);
    queryParts.push(`page=${pageNumber}`);
    return `/superadmin/schools?${queryParts.join("&")}`;
  };

  const totalPages = Math.ceil(schoolsData.count / 10); // assuming default page size is 10

  return (
    <div className="space-y-8 animate-fade-in p-7 px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Établissements
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez tous les tenants du réseau Eduguinée 3.0
          </p>
        </div>
        <Link
          href="/superadmin/schools/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Nouvel établissement
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Text Search */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="Nom, contact..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Statut
            </label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="TRIAL">Essai (Trial)</option>
              <option value="SUSPENDED_SOFT">Suspendu (lecture seule)</option>
              <option value="SUSPENDED_HARD">Suspendu (bloqué)</option>
              <option value="CANCELLED">Résilié</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Abonnement / Plan
            </label>
            <select
              name="plan_id"
              defaultValue={planFilter}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Tous les plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="size-4" />
              Filtrer
            </button>
            <Link
              href="/superadmin/schools"
              className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
            >
              Réinitialiser
            </Link>
          </div>
        </form>
      </div>

      {/* Schools Table */}
      <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Établissement</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Plan actuel</th>
                <th className="px-6 py-4 text-center">Élèves</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {schoolsData.results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Aucun établissement ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                schoolsData.results.map((school: any) => (
                  <tr key={school.id} className="hover:bg-slate-900/35 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {school.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {school.slug}.eduguinee.gn
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs">
                        <div className="text-slate-300 font-medium">{school.contact_name}</div>
                        <div className="text-slate-500">{school.contact_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400">{school.school_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                        {school.plan?.name || "Sans plan"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">{school.student_count}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const st = STATUS_STYLES[school.status] || STATUS_STYLES.TRIAL;
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: st.bg, color: st.color }}
                          >
                            <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                            {st.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <SchoolActions
                        schoolId={school.id}
                        schoolName={school.name}
                        status={school.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-800/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={currentPage > 1 ? getPageLink(currentPage - 1) : "#"}
                className={`px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-300 transition-colors ${
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Précédent
              </Link>
              <Link
                href={currentPage < totalPages ? getPageLink(currentPage + 1) : "#"}
                className={`px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-300 transition-colors ${
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
  );
}
