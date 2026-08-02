/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import {
  Building2, CheckCircle2, AlertTriangle, PlayCircle, Plus, Eye,
  Ban, XCircle,
} from "lucide-react";
import MonthlyCreationsChart from "./MonthlyCreationsChart";
import { STATUS_STYLES } from "../statusStyles";

export const dynamic = "force-dynamic";

// SUPERADMIN-V2-02 : 6 tuiles (Total + les 5 valeurs réelles de Tenant.Status).
// Repris de la refonte éditoriale : 3 teintes sémantiques (ok/info/warn) +
// neutre pour les états qui n'appellent pas d'attention particulière — pas
// un dégradé distinct par tuile comme l'ancienne version.
const KPI_DEFS: Record<
  string,
  { title: string; icon: any; tone: "ok" | "info" | "warn" | "neutral" }
> = {
  total: { title: "Total établissements", icon: Building2, tone: "ok" },
  ACTIVE: { title: "Actives", icon: CheckCircle2, tone: "ok" },
  TRIAL: { title: "Périodes d'essai", icon: PlayCircle, tone: "info" },
  SUSPENDED_SOFT: { title: "Suspendues (lecture seule)", icon: AlertTriangle, tone: "warn" },
  SUSPENDED_HARD: { title: "Suspendues (bloquées)", icon: Ban, tone: "neutral" },
  CANCELLED: { title: "Résiliées", icon: XCircle, tone: "neutral" },
};

const TONE_CLASSES: Record<string, string> = {
  ok: "border-ok text-ok",
  info: "border-info text-info",
  warn: "border-warn text-warn",
  neutral: "border-line text-text-soft",
};

function formatGNF(value: string) {
  return `${Number(value).toLocaleString("fr-FR")}`;
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
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Vue d&apos;ensemble</h1>
          <p className="m-0 text-text-soft text-[13.5px]">
            Supervision globale des établissements scolaires Eduguinée 3.0
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/superadmin/schools/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Nouvel établissement
          </Link>
        </div>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MRR banner */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-[22px] shadow-[var(--shadow)]">
          <div className="text-[11.5px] tracking-[.08em] uppercase text-text-faint">
            MRR estimé — établissements actifs uniquement
          </div>
          <div className="mt-1.5 font-mono text-[30px] text-text leading-none">
            {formatGNF(mrrEstimated)}{" "}
            <span className="text-[11px] text-text-faint">GNF</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {kpiOrder.map((key) => {
            const def = KPI_DEFS[key];
            const Icon = def.icon;
            return (
              <div key={key} className="border border-line bg-card rounded-xl p-[18px] shadow-[var(--shadow)]">
                <div
                  className={`size-[26px] rounded-full border-[1.4px] flex items-center justify-center mb-3.5 ${TONE_CLASSES[def.tone]}`}
                >
                  <Icon className="size-[13px]" />
                </div>
                <div className="text-[11.5px] text-text-faint mb-1 leading-tight">{def.title}</div>
                <div className="font-serif text-2xl font-medium">{totals[key] ?? 0}</div>
              </div>
            );
          })}
        </div>

        {/* Monthly creations chart */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <div className="flex justify-between items-baseline mb-0.5">
            <h2 className="font-serif text-[16.5px] font-medium m-0">Créations d&apos;écoles par mois</h2>
            <span className="text-xs text-text-faint">12 derniers mois</span>
          </div>
          <p className="text-[12.5px] text-text-soft mt-0.5 mb-2">Toutes créations confondues</p>
          <MonthlyCreationsChart data={monthlyCreations} />
        </div>

        {/* Table */}
        <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="font-serif text-[16.5px] font-medium m-0">Dernières écoles créées</h2>
            <Link href="/superadmin/schools" className="text-[12.5px] text-accent no-underline">
              Voir toutes les écoles →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Établissement</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Plan</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Élèves</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Statut</th>
                  <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium pb-2.5 px-2 border-b border-line">Date d&apos;ajout</th>
                  <th className="border-b border-line w-16"></th>
                </tr>
              </thead>
              <tbody>
                {recentSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-text-faint text-sm">
                      Aucun établissement enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  recentSchools.map((school: any) => {
                    const seal = STATUS_STYLES[school.status] || STATUS_STYLES.TRIAL;
                    return (
                      <tr key={school.id} className="group">
                        <td className="py-[15px] px-2 border-b border-line last:border-b-0">
                          <div className="font-semibold text-[13.5px]">{school.name}</div>
                          <div className="font-mono text-text-faint text-xs mt-0.5">{school.slug}.eduguinee.gn</div>
                        </td>
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
                        <td className="py-[15px] px-2 border-b border-line text-text-faint text-[12.5px]">
                          {new Date(school.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-[15px] px-2 border-b border-line">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/superadmin/schools/${school.id}`}
                              className="inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-accent font-medium no-underline transition-colors"
                            >
                              <Eye className="size-3.5" />
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
    </div>
  );
}
