/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Users,
  BookOpen,
  UserPlus,
  CalendarCheck,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";

const KPIS = [
  { key: "eleves", label: "Total Élèves", icon: Users, tone: "ok", value: "0", hint: "— à configurer" },
  { key: "classes", label: "Classes", icon: BookOpen, tone: "info", value: "0", hint: "— à configurer" },
  { key: "presence", label: "Taux de présence", icon: CalendarCheck, tone: "neutral", value: "—", hint: "Aucune donnée" },
];

const TONE_CLASSES: Record<string, string> = {
  ok: "border-ok text-ok",
  info: "border-info text-info",
  neutral: "border-line text-text-soft",
};

const ACTIONS = [
  {
    href: "/students/new",
    title: "Inscrire un élève",
    desc: "Nouvelle inscription ou réinscription dans l'établissement",
    icon: UserPlus,
  },
  {
    href: "/attendance",
    title: "Faire l'appel",
    desc: "Saisie des présences du jour par classe",
    icon: CalendarCheck,
  },
  {
    href: "/grades",
    title: "Saisir des notes",
    desc: "Évaluations, bulletins et moyennes",
    icon: FileSpreadsheet,
  },
];

export default async function TenantAppDashboard() {
  const session = await auth();

  if (session?.user && (session.user as any).role === "SUPER_ADMIN") {
    redirect("/superadmin/dashboard");
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Espace Scolaire</h1>
          <p className="m-0 text-text-soft text-[13.5px]">Vue d&apos;ensemble de l&apos;établissement</p>
        </div>
        <span className="text-[13px] text-text-soft px-4 py-2 rounded-lg border border-line bg-card">
          Année scolaire : 2025-2026
        </span>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {KPIS.map((kpi) => (
            <div key={kpi.key} className="border border-line bg-card rounded-xl p-[18px] shadow-[var(--shadow)]">
              <div
                className={`size-[26px] rounded-full border-[1.4px] flex items-center justify-center mb-3.5 ${TONE_CLASSES[kpi.tone]}`}
              >
                <kpi.icon className="size-[13px]" />
              </div>
              <div className="text-[11.5px] text-text-faint mb-1 leading-tight">{kpi.label}</div>
              <div className="font-serif text-2xl font-medium">{kpi.value}</div>
              <div className="text-xs text-text-faint mt-2">{kpi.hint}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="font-serif text-[16.5px] font-medium m-0">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {ACTIONS.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="block p-6 rounded-xl border border-line bg-card shadow-[var(--shadow)] hover:border-accent-line transition-colors relative group no-underline"
            >
              <ArrowRight className="absolute top-6 right-6 size-4 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="size-11 rounded-[10px] bg-accent-soft text-accent flex items-center justify-center mb-3.5">
                <action.icon className="size-[22px]" />
              </div>
              <div className="text-[15px] font-semibold mb-1.5">{action.title}</div>
              <div className="text-[13px] text-text-soft leading-[1.4]">{action.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
