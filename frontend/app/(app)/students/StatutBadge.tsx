import React from "react";

const STYLES: Record<string, string> = {
  ACTIF: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SUSPENDU: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  TRANSFERE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  SORTI: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  ARCHIVE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const LABELS: Record<string, string> = {
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  TRANSFERE: "Transféré",
  SORTI: "Sorti",
  ARCHIVE: "Archivé",
};

export default function StatutBadge({ statut }: { statut: string }) {
  const style = STYLES[statut] || STYLES.SORTI;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${style}`}
    >
      {LABELS[statut] || statut}
    </span>
  );
}
