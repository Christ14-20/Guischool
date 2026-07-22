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
} from "lucide-react";

const RAISED_CARD_STYLE = {
  background: "#151B2B",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px",
};

const KPI_TOP_BORDER: Record<string, string> = {
  eleves: "linear-gradient(90deg, #6366f1, #818cf8)",
  classes: "linear-gradient(90deg, #10B981, #34d399)",
  presence: "linear-gradient(90deg, #0EA5E9, #38bdf8)",
};

const KPI_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  eleves: { bg: "rgba(99, 102, 241, 0.1)", color: "#818cf8" },
  classes: { bg: "rgba(16, 185, 129, 0.1)", color: "#10B981" },
  presence: { bg: "rgba(14, 165, 233, 0.1)", color: "#0EA5E9" },
};

const ACTIONS = [
  {
    href: "/students/new",
    title: "Inscrire un élève",
    desc: "Nouvelle inscription ou réinscription dans l'établissement",
    icon: UserPlus,
    color: "eleves",
  },
  {
    href: "/attendance",
    title: "Faire l'appel",
    desc: "Saisie des présences du jour par classe",
    icon: CalendarCheck,
    color: "presence",
  },
  {
    href: "/grades",
    title: "Saisir des notes",
    desc: "Évaluations, bulletins et moyennes",
    icon: FileSpreadsheet,
    color: "notes",
  },
];

export default async function TenantAppDashboard() {
  const session = await auth();

  if (session?.user && (session.user as any).role === "SUPER_ADMIN") {
    redirect("/superadmin/dashboard");
  }

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1
            className="text-[26px] font-bold text-white mb-1.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Espace Scolaire
          </h1>
          <p className="text-sm text-[#64748B]">Vue d&apos;ensemble de l&apos;établissement</p>
        </div>
        <span
          className="text-sm text-[#64748B] px-4 py-2 rounded-[10px]"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          Année scolaire : 2025-2026
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI: Élèves */}
        <div
          className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5"
          style={RAISED_CARD_STYLE}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[12px]"
            style={{ background: KPI_TOP_BORDER.eleves }}
          />
          <div
            className="absolute top-4 right-4 w-9 h-9 rounded-[6px] flex items-center justify-center"
            style={{ background: KPI_ICON_STYLE.eleves.bg, color: KPI_ICON_STYLE.eleves.color }}
          >
            <Users className="w-[18px] h-[18px]" />
          </div>
          <div className="text-xs text-[#64748B] mb-2">Total Élèves</div>
          <div className="text-[32px] font-semibold text-white leading-none tabular-nums">0</div>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[#64748B]">
            — à configurer
          </div>
        </div>

        {/* KPI: Classes */}
        <div
          className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5"
          style={RAISED_CARD_STYLE}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[12px]"
            style={{ background: KPI_TOP_BORDER.classes }}
          />
          <div
            className="absolute top-4 right-4 w-9 h-9 rounded-[6px] flex items-center justify-center"
            style={{ background: KPI_ICON_STYLE.classes.bg, color: KPI_ICON_STYLE.classes.color }}
          >
            <BookOpen className="w-[18px] h-[18px]" />
          </div>
          <div className="text-xs text-[#64748B] mb-2">Classes</div>
          <div className="text-[32px] font-semibold text-white leading-none tabular-nums">0</div>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[#64748B]">
            — à configurer
          </div>
        </div>

        {/* KPI: Présence */}
        <div
          className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5"
          style={RAISED_CARD_STYLE}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[12px]"
            style={{ background: KPI_TOP_BORDER.presence }}
          />
          <div
            className="absolute top-4 right-4 w-9 h-9 rounded-[6px] flex items-center justify-center"
            style={{ background: KPI_ICON_STYLE.presence.bg, color: KPI_ICON_STYLE.presence.color }}
          >
            <CalendarCheck className="w-[18px] h-[18px]" />
          </div>
          <div className="text-xs text-[#64748B] mb-2">Taux de présence</div>
          <div className="text-[32px] font-semibold text-white leading-none">—</div>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[#64748B]">
            Aucune donnée
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-base font-semibold text-white">Actions rapides</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACTIONS.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="block p-6 rounded-[12px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative overflow-hidden group"
            style={{
              ...RAISED_CARD_STYLE,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              const colors: Record<string, string> = {
                eleves: "rgba(99, 102, 241, 0.3)",
                presence: "rgba(16, 185, 129, 0.3)",
                notes: "rgba(245, 158, 11, 0.3)",
              };
              e.currentTarget.style.borderColor = colors[action.color];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
            }}
          >
            {/* Left accent bar on hover */}
            <div
              className="absolute top-0 left-0 w-[3px] h-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: action.color === "eleves" ? "#6366f1" : action.color === "presence" ? "#10B981" : "#F59E0B",
              }}
            />
            {/* Arrow */}
            <div className="absolute top-6 right-6 text-[#475569] opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-3.5"
              style={{
                background: action.color === "eleves" ? "rgba(99, 102, 241, 0.1)" : action.color === "presence" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                color: action.color === "eleves" ? "#818cf8" : action.color === "presence" ? "#10B981" : "#F59E0B",
              }}
            >
              <action.icon className="w-[22px] h-[22px]" />
            </div>
            <div className="text-[15px] font-semibold text-white mb-1.5">{action.title}</div>
            <div className="text-[13px] text-[#64748B] leading-[1.4]">{action.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
