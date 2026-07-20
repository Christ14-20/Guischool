/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { fetchAllStudentsForExport } from "./actions";

interface Props {
  query: Record<string, string>;
}

function toCsv(rows: any[]): string {
  const header = ["Matricule", "Nom", "Prénom", "Classe", "Statut", "Téléphone tuteur"];
  const escape = (val: string) => `"${(val ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((s) =>
    [
      s.matricule,
      s.nom,
      s.prenom,
      s.classe_actuelle?.name || "",
      s.statut,
      s.guardian_phone || "",
    ]
      .map((v) => escape(String(v ?? "")))
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export default function ExportCsvButton({ query }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetchAllStudentsForExport(query);
      if (!res.success || res.data.length === 0) {
        setError(res.success ? "Aucun élève à exporter." : "Échec de l'export.");
        return;
      }
      const csv = "\uFEFF" + toCsv(res.data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eleves-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleExport}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Export CSV
      </button>
      {error && <span className="text-xs text-destructive mt-1">{error}</span>}
    </div>
  );
}
