import React from "react";
import Link from "next/link";


export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar minimaliste SuperAdmin */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
            SA
          </div>
          <span className="font-semibold text-white tracking-tight">Super Admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gestion
          </div>
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all font-medium"
          >
            Tableau de Bord
          </Link>
          <Link
            href="/superadmin/schools"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all font-medium"
          >
            Établissements
          </Link>
          <Link
            href="/superadmin/plans"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all font-medium"
          >
            Plans & Quotas
          </Link>
        </nav>
        <div className="border-t border-slate-800 pt-4 mt-auto">
          <button className="w-full text-left text-sm text-slate-400 hover:text-white">
            Déconnexion
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between">
          <h2 className="font-semibold text-white">Console Administration Globale</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
