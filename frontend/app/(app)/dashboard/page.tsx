import React from "react";

export default function TenantAppDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Espace Directeur</h1>
        <p className="text-slate-400">Bienvenue sur votre espace de pilotage Eduguinée 3.0</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Total Élèves</h3>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Classes Actives</h3>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Taux de Présence Moyen</h3>
          <p className="text-3xl font-bold text-emerald-500 mt-2">-- %</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Frais Recouvrés</h3>
          <p className="text-3xl font-bold text-white mt-2">0 GNF</p>
        </div>
      </div>
    </div>
  );
}
