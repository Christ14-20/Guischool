import React from "react";
import Link from "next/link";
import { signOut } from "@/auth";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
} from "lucide-react";

const SUPERADMIN_NAV = [
  { href: "/superadmin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/superadmin/schools", label: "Établissements", icon: Building2 },
  { href: "/superadmin/plans", label: "Plans & Quotas", icon: CreditCard },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            SA
          </div>
          <span className="text-base font-semibold text-white">Super Admin</span>
        </div>

        {/* Section label */}
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#475569] px-5 pt-4 pb-2">
          Gestion
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2">
          {SUPERADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 mx-0.5 mb-0.5 rounded-[10px] text-[14px] transition-all duration-150 relative text-[#64748B] hover:bg-white/3 hover:text-[#94A3B8]"
            >
              <item.icon className="w-[18px] h-[18px] opacity-60 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User profile */}
        <div className="mt-auto px-5 pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div className="flex items-center gap-3 p-2 rounded-[10px] transition-colors duration-150 hover:bg-white/3 cursor-pointer">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              N
            </div>
            <div className="leading-[1.3]">
              <div className="text-[13px] font-medium text-white">Nabou</div>
              <div className="text-[11px] text-[#475569]">Super Admin</div>
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
