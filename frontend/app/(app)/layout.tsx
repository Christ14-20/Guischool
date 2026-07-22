/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { signOut, auth } from "@/auth";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserCog,
  BookMarked,
  CalendarCheck,
  FileSpreadsheet,
  ClipboardCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, always: true },
  { href: "/pedagogy/school-years", label: "Pédagogie", icon: BookOpen, always: true },
  { href: "/students", label: "Élèves", icon: Users, always: true },
  { href: "/staff", label: "Personnel", icon: UserCog, roles: ["DIRECTOR", "STUDENT_STUDIES"] },
  { href: "/pedagogy/classes", label: "Classes", icon: BookMarked, always: true },
  { href: "/attendance", label: "Présences", icon: CalendarCheck, always: true },
  { href: "/grades", label: "Notes", icon: FileSpreadsheet, roles: ["DIRECTOR", "TEACHER", "STUDENT_STUDIES"] },
  { href: "/year-end-decisions", label: "Décisions", icon: ClipboardCheck, roles: ["DIRECTOR", "STUDENT_STUDIES"] },
];

export default async function TenantAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session as any)?.user?.role;
  const userName = (session as any)?.user?.name || "Directeur";

  return (
    <div className="flex min-h-screen" style={{ background: "#0B0F19", color: "#F8FAFC" }}>
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-screen w-[260px] flex flex-col py-5 z-50"
        style={{
          background: "#111827",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pb-6 mb-2" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #10B981, #059669)",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            EG
          </div>
          <span className="text-base font-semibold text-white">Mon École</span>
        </div>

        {/* Section label */}
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#475569] px-5 pt-4 pb-2">
          Menu principal
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2">
          {NAV_ITEMS.map((item) => {
            if (item.always || (item.roles && item.roles.includes(role))) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 mx-0.5 mb-0.5 rounded-[10px] text-[14px] transition-all duration-150 relative text-[#64748B] hover:bg-white/3 hover:text-[#94A3B8]"
                >
                  <item.icon className="w-[18px] h-[18px] opacity-60 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            }
            return null;
          })}
        </nav>

        {/* User profile */}
        <div className="mt-auto px-5 pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div className="flex items-center gap-3 p-2 rounded-[10px] transition-colors duration-150 hover:bg-white/3 cursor-pointer">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
              style={{ background: "linear-gradient(135deg, #F59E0B, #d97706)" }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="leading-[1.3]">
              <div className="text-[13px] font-medium text-white">{userName}</div>
              <div className="text-[11px] text-[#475569]">
                {role === "SUPER_ADMIN" ? "Super Admin" : "Directeur"}
              </div>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-2"
          >
            <button
              type="submit"
              className="w-full text-left text-[13px] text-[#64748B] hover:text-white px-2 py-1.5 cursor-pointer transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="p-7 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
