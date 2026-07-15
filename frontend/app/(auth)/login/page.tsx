import React from "react";

export default function LoginPage() {
  return (
    <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <div className="flex flex-col items-center space-y-2 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-extrabold text-xl">EG</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Eduguinée 3.0</h1>
        <p className="text-slate-400 text-sm">Gestion scolaire multi-tenant</p>
      </div>

      <div className="text-center py-4">
        <p className="text-slate-300 text-sm">Formulaire de connexion (Bientôt disponible)</p>
      </div>
    </div>
  );
}
