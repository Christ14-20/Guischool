import React from "react";
import { signOut } from "@/auth";
import { LogOut } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Fond sombre en dur (pas de token) : seul /superadmin/dashboard a été
    // repris par la refonte éditoriale pour l'instant — les autres pages
    // (schools, plans) codent encore en dur des classes text-white/slate-*
    // qui supposent ce fond sombre. Chaque page reprise pose son propre
    // bg-paper/text-text par-dessus (cf. dashboard/page.tsx).
    <div className="flex min-h-screen" style={{ background: "#0B0F19", color: "#F8FAFC" }}>
      {/* Sidebar — toujours sombre, quel que soit le thème */}
      <aside className="fixed top-0 left-0 h-screen w-[248px] flex flex-col z-50 bg-sidebar-bg border-r border-sidebar-line">
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-sidebar-line">
          <div className="size-[34px] rounded-[9px] bg-accent flex items-center justify-center text-white font-serif font-semibold text-sm">
            SA
          </div>
          <div>
            <div className="text-[#F4F2F8] text-sm font-semibold leading-tight">Super Admin</div>
            <div className="text-sidebar-text-dim text-[11px] mt-px">Eduguinée 3.0</div>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-sidebar-line px-[18px] py-4 flex items-center gap-2.5">
          <div className="size-[30px] rounded-full bg-[#2A2836] text-[#D8D5E6] flex items-center justify-center text-xs font-semibold shrink-0">
            N
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] text-[#EDEBF2] leading-tight truncate">Nabou</div>
            <div className="text-[11px] text-sidebar-text-dim">Super Admin</div>
          </div>
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              title="Déconnexion"
              className="size-7 rounded-full border border-sidebar-line bg-transparent text-sidebar-text-dim flex items-center justify-center cursor-pointer hover:text-sidebar-text hover:border-accent-line transition-colors shrink-0"
            >
              <LogOut className="size-3.5" />
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-[248px] min-h-screen">{children}</main>
    </div>
  );
}
