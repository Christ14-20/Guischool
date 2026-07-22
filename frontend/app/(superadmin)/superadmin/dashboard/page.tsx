/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { Building2, CheckCircle2, AlertTriangle, PlayCircle, Plus, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

const RAISED_CARD_STYLE = {
  background: "#151B2B",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px",
};

const KPI_TOP_BORDER: Record<string, string> = {
  total: "linear-gradient(90deg, #6366f1, #818cf8)",
  active: "linear-gradient(90deg, #10B981, #34d399)",
  suspended: "linear-gradient(90deg, #F59E0B, #fbbf24)",
  trial: "linear-gradient(90deg, #0EA5E9, #38bdf8)",
};

const KPI_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  total: { bg: "rgba(99, 102, 241, 0.1)", color: "#818cf8" },
  active: { bg: "rgba(16, 185, 129, 0.1)", color: "#10B981" },
  suspended: { bg: "rgba(245, 158, 11, 0.1)", color: "#F59E0B" },
  trial: { bg: "rgba(14, 165, 233, 0.1)", color: "#0EA5E9" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  ACTIVE: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981", dot: "#10B981" },
  SUSPENDED: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", dot: "#EF4444" },
  TRIAL: { bg: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", dot: "#F59E0B" },
};

export default async function SuperAdminDashboard() {
  let schoolsData = { results: [], count: 0 };
  let activeCount = 0;
  let suspendedCount = 0;
  let trialCount = 0;
  let errorMsg = null;

  try {
    const client = await getBackendClient();

    const schoolsResp = await client.get("/superadmin/schools/?page_size=5");
    if (schoolsResp.data?.status === "success") {
      schoolsData = schoolsResp.data.data;
    }

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
      key: "total",
      title: "Total Établissements",
      value: schoolsData.count,
      icon: Building2,
      trend: "+1 ce mois",
      trendDir: "up",
    },
    {
      key: "active",
      title: "Écoles Actives",
      value: activeCount,
      icon: CheckCircle2,
      trend: "— stable",
      trendDir: "flat",
    },
    {
      key: "suspended",
      title: "Écoles Suspendues",
      value: suspendedCount,
      icon: AlertTriangle,
      trend: "— stable",
      trendDir: "flat",
    },
    {
      key: "trial",
      title: "Périodes d'Essai",
      value: trialCount,
      icon: PlayCircle,
      trend: "8 jours restants",
      trendDir: "down",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1
            className="text-[26px] font-bold text-white mb-1.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm text-[#64748B]">
            Supervision globale des établissements scolaires Eduguinée 3.0
          </p>
        </div>
        <Link
          href="/superadmin/schools/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.25)",
          }}
        >
          <Plus className="w-4 h-4" />
          Nouvel établissement
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#EF4444" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const iconStyle = KPI_ICON_STYLE[kpi.key];
          return (
            <div
              key={idx}
              className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5"
              style={RAISED_CARD_STYLE}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[12px]"
                style={{ background: KPI_TOP_BORDER[kpi.key] }}
              />
              <div
                className="absolute top-4 right-4 w-9 h-9 rounded-[6px] flex items-center justify-center"
                style={{ background: iconStyle.bg, color: iconStyle.color }}
              >
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="text-xs text-[#64748B] mb-2">{kpi.title}</div>
              <div className="text-[32px] font-semibold text-white leading-none tabular-nums">{kpi.value}</div>
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                kpi.trendDir === "up" ? "text-[#10B981]" : kpi.trendDir === "down" ? "text-[#EF4444]" : "text-[#475569]"
              }`}>
                {kpi.trendDir === "up" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                )}
                {kpi.trendDir === "down" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                )}
                {kpi.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div
        className="p-5 overflow-hidden"
        style={RAISED_CARD_STYLE}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-white">Dernières écoles créées</h2>
          <Link
            href="/superadmin/schools"
            className="text-[13px] text-[#818cf8] hover:text-[#a5b4fc] font-medium no-underline transition-colors"
          >
            Voir toutes les écoles &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">Nom de l&apos;établissement</th>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">Sous-domaine</th>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">Plan actuel</th>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-center">Élèves</th>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">Statut</th>
                <th className="px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">Date d&apos;ajout</th>
                <th className="px-3.5 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {schoolsData.results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-10 text-center text-[#475569]">
                    Aucun établissement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                schoolsData.results.map((school: any) => {
                  const status = STATUS_STYLES[school.status] || STATUS_STYLES.TRIAL;
                  return (
                    <tr
                      key={school.id}
                      className="group transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
                    >
                      <td className="px-3.5 py-3.5 text-sm text-white font-medium">{school.name}</td>
                      <td className="px-3.5 py-3.5 text-sm text-[#94A3B8] font-mono text-xs">{school.slug}.eduguinee.gn</td>
                      <td className="px-3.5 py-3.5">
                        <span className="px-2.5 py-1 rounded-md text-xs text-[#64748B] font-medium" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                          {school.plan?.name || "Sans plan"}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-sm text-[#94A3B8] text-center tabular-nums">{school.student_count}</td>
                      <td className="px-3.5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: status.bg, color: status.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                          {school.status === "ACTIVE" ? "Actif" : school.status === "SUSPENDED" ? "Suspendu" : "Essai"}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-xs text-[#475569]">
                        {new Date(school.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Link
                            href={`/superadmin/schools/${school.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white font-medium transition-colors no-underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Gérer
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
