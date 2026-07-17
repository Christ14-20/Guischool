/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Building2, CheckCircle2, AlertTriangle, PlayCircle, Plus, Eye } from "lucide-react";


export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
  let schoolsData = { results: [], count: 0 };
  let activeCount = 0;
  let suspendedCount = 0;
  let trialCount = 0;
  let errorMsg = null;

  try {
    const client = await getBackendClient();
    
    // 1. Fetch latest schools
    const schoolsResp = await client.get("/superadmin/schools/?page_size=5");
    if (schoolsResp.data?.status === "success") {
      schoolsData = schoolsResp.data.data;
    }

    // 2. Fetch counts by filtering status
    const [activeResp, suspendedResp, trialResp] = await Promise.all([
      client.get("/superadmin/schools/?status=ACTIVE&page_size=1"),
      client.get("/superadmin/schools/?status=SUSPENDED&page_size=1"),
      client.get("/superadmin/schools/?status=TRIAL&page_size=1"),
    ]);

    activeCount = activeResp.data?.data?.count || 0;
    suspendedCount = suspendedResp.data?.data?.count || 0;
    trialCount = trialResp.data?.data?.count || 0;

  } catch (err: any) {
    console.error("Dashboard data fetch error:", err.message);
    errorMsg = "Impossible de récupérer les données du tableau de bord. Veuillez vérifier la connexion au serveur.";
  }

  const kpis = [
    {
      title: "Total Établissements",
      value: schoolsData.count,
      icon: Building2,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Écoles Actives",
      value: activeCount,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Écoles Suspendues",
      value: suspendedCount,
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Périodes d'Essai",
      value: trialCount,
      icon: PlayCircle,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Vue d’ensemble
          </h1>
          <p className="text-slate-400 mt-1">
            Supervision globale des établissements scolaires Eduguinée 3.0
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
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`bg-slate-900/40 border rounded-xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between ${kpi.bg}`}
            >
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium">{kpi.title}</p>
                <p className="text-3xl font-bold text-white tracking-tight">{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-slate-950/40 ${kpi.color}`}>
                <Icon className="size-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Schools */}
      <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="font-semibold text-white text-lg">Dernières écoles créées</h2>
          <Link
            href="/superadmin/schools"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Voir toutes les écoles &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Nom de l’établissement</th>
                <th className="px-6 py-4">Sous-domaine</th>
                <th className="px-6 py-4">Plan actuel</th>
                <th className="px-6 py-4 text-center">Élèves</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Date d’ajout</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {schoolsData.results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Aucun établissement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                schoolsData.results.map((school: any) => (
                  <tr key={school.id} className="hover:bg-slate-900/35 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">{school.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{school.slug}.eduguinee.gn</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                        {school.plan?.name || "Sans plan"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">{school.student_count}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          school.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : school.status === "SUSPENDED"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-sky-500/10 text-sky-400"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            school.status === "ACTIVE"
                              ? "bg-emerald-400"
                              : school.status === "SUSPENDED"
                              ? "bg-amber-400"
                              : "bg-sky-400"
                          }`}
                        />
                        {school.status === "ACTIVE"
                          ? "Actif"
                          : school.status === "SUSPENDED"
                          ? "Suspendu"
                          : "Essai"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 text-xs">
                      {new Date(school.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/superadmin/schools/${school.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors"
                      >
                        <Eye className="size-3.5" />
                        Gérer
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
