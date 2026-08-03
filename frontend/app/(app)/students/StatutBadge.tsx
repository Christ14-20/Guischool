import React from "react";

const STYLES: Record<string, { color: string; label: string }> = {
  ACTIF: { color: "var(--ok)", label: "Actif" },
  SUSPENDU: { color: "var(--warn)", label: "Suspendu" },
  TRANSFERE: { color: "var(--info)", label: "Transféré" },
  SORTI: { color: "var(--mute)", label: "Sorti" },
  ARCHIVE: { color: "var(--danger)", label: "Archivé" },
};

export default function StatutBadge({ statut }: { statut: string }) {
  const style = STYLES[statut] || STYLES.SORTI;
  return (
    <span
      className="inline-flex items-center gap-[7px] text-[12.5px]"
      style={{ color: style.color }}
    >
      <span className="size-[9px] rounded-full border-2" style={{ borderColor: style.color }} />
      {style.label}
    </span>
  );
}
