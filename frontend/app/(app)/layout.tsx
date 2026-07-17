import React from "react";
import { signOut } from "@/auth";

export default function TenantAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar principale de l'école */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-600/20">
            EG
          </div>
          <span className="font-semibold text-white tracking-tight">Mon École</span>
        </div>
        <nav className="flex-1 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menu Principal
          </div>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-600/10 text-emerald-400 font-medium"
          >
            Tableau de bord
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transitions-all"
          >
            Pédagogie
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transitions-all"
          >
            Élèves & Classes
          </a>
        </nav>
        <div className="border-t border-slate-800 pt-4 mt-auto">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="w-full text-left text-sm text-slate-400 hover:text-white cursor-pointer">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/20 backdrop-blur-md">
          <h2 className="font-semibold text-white">Espace Scolaire</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Année scolaire : 2025-2026</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
