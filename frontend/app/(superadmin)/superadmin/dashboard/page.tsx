/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import {
  Building2, CheckCircle2, AlertTriangle, PlayCircle, Plus, Eye,
  Ban, XCircle, Banknote,
} from "lucide-react";
import MonthlyCreationsChart from "./MonthlyCreationsChart";

export const dynamic = "force-dynamic";

const RAISED_CARD_STYLE = {
  background: "#151B2B",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px",
};

// SUPERADMIN-V2-02 : 6 tuiles (Total + les 5 valeurs réelles de Tenant.Status),
// remplace les 4 tuiles précédentes (total/active/suspended/trial) qui ne
// connaissaient pas la distinction SUSPENDED_SOFT/SUSPENDED_HARD introduite
// par SUPERADMIN-V2-01 — résidu resté non corrigé côté UI jusqu'ici.
const KPI_DEFS: Record<
  string,
  { title: string; icon: any; border: string; iconBg: string; iconColor: string }
> = {
  total: {
    title: "Total établissements",
    icon: Building2,
    border: "linear-gradient(90deg, #6366f1, #818cf8)",
    iconBg: "rgba(99, 102, 241, 0.1)",
    iconColor: "#818cf8",
  },
  ACTIVE: {
    title: "Actives",
    icon: CheckCircle2,
    border: "linear-gradient(90deg, #10B981, #34d399)",
    iconBg: "rgba(16, 185, 129, 0.1)",
    iconColor: "#10B981",
  },
  TRIAL: {
    title: "Périodes d'essai",
    icon: PlayCircle,
    border: "linear-gradient(90deg, #0EA5E9, #38bdf8)",
    iconBg: "rgba(14, 165, 233, 0.1)",
    iconColor: "#0EA5E9",
  },
  SUSPENDED_SOFT: {
    title: "Suspendues (lecture seule)",
    icon: AlertTriangle,
    border: "linear-gradient(90deg, #F59E0B, #fbbf24)",
    iconBg: "rgba(245, 158, 11, 0.1)",
    iconColor: "#F59E0B",
  },
  SUSPENDED_HARD: {
    title: "Suspendues (bloquées)",
    icon: Ban,
    border: "linear-gradient(90deg, #EF4444, #f87171)",
    iconBg: "rgba(239, 68, 68, 0.1)",
    iconColor: "#EF4444",
  },
  CANCELLED: {
    title: "Résiliées",
    icon: XCircle,
    border: "linear-gradient(90deg, #64748B, #94A3B8)",
    iconBg: "rgba(100, 116, 139, 0.1)",
    iconColor: "#94A3B8",
  },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  ACTIVE: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981", dot: "#10B981", label: "Actif" },
  TRIAL: { bg: "rgba(14, 165, 233, 0.12)", color: "#0EA5E9", dot: "#0EA5E9", label: "Essai" },
  SUSPENDED_SOFT: { bg: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", dot: "#F59E0B", label: "Suspendu (lecture seule)" },
  SUSPENDED_HARD: { bg: "rgba(239, 68, 68, 0.12)", color: "#EF4444", dot: "#EF4444", label: "Suspendu (bloqué)" },
  CANCELLED: { bg: "rgba(100, 116, 139, 0.12)", color: "#94A3B8", dot: "#94A3B8", label: "Résilié" },
};

function formatGNF(value: string) {
  return `${Number(value).toLocaleString("fr-FR")} GNF`;
}

export default async function SuperAdminDashboard() {
  let totals: Record<string, number> = {
    total: 0, TRIAL: 0, ACTIVE: 0, SUSPENDED_SOFT: 0, SUSPENDED_HARD: 0, CANCELLED: 0,
  };
  let mrrEstimated = "0.00";
  let monthlyCreations: { month: string; count: number }[] = [];
  let recentSchools: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/superadmin/dashboard/");
    if (resp.data?.status === "success") {
      const data = resp.data.data;
      totals = data.totals;
      mrrEstimated = data.mrr_estimated;
      monthlyCreations = data.monthly_creations;
      recentSchools = data.recent_schools;
    }
  } catch (err: any) {
    console.error("Dashboard data fetch error:", err.message);
    errorMsg = "Impossible de récupérer les données du tableau de bord. Veuillez vérifier la connexion au serveur.";
  }

  const kpiOrder = ["total", "ACTIVE", "TRIAL", "SUSPENDED_SOFT", "SUSPENDED_HARD", "CANCELLED"];

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

      {/* MRR hero card */}
      <div className="relative overflow-hidden p-6" style={RAISED_CARD_STYLE}>
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #10B981, #34d399)" }}
        />
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981" }}
          >
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#64748B] mb-1">
              MRR estimé <span className="text-[#475569]">(établissements actifs uniquement)</span>
            </div>
            <div className="text-[32px] font-semibold text-white leading-none">
              {formatGNF(mrrEstimated)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards — 6 tuiles (total + 5 statuts) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiOrder.map((key) => {
          const def = KPI_DEFS[key];
          const Icon = def.icon;
          return (
            <div
              key={key}
              className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-4"
              style={RAISED_CARD_STYLE}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[12px]"
                style={{ background: def.border }}
              />
              <div
                className="w-8 h-8 rounded-[6px] flex items-center justify-center mb-3"
                style={{ background: def.iconBg, color: def.iconColor }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[11px] text-[#64748B] mb-1.5 leading-tight">{def.title}</div>
              <div className="text-2xl font-semibold text-white leading-none tabular-nums">
                {totals[key] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly creations chart */}
      <div className="p-5" style={RAISED_CARD_STYLE}>
        <h2 className="text-base font-semibold text-white mb-1">Créations d&apos;écoles par mois</h2>
        <p className="text-xs text-[#64748B] mb-4">12 derniers mois, toutes créations confondues</p>
        <MonthlyCreationsChart data={monthlyCreations} />
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
              {recentSchools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-10 text-center text-[#475569]">
                    Aucun établissement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                recentSchools.map((school: any) => {
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
                          {status.label}
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
