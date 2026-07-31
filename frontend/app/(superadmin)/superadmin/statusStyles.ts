/**
 * Source unique pour l'affichage des 5 valeurs réelles de Tenant.Status
 * (SUPERADMIN-V2-01 a remplacé l'ancien SUSPENDED unique par
 * SUSPENDED_SOFT/SUSPENDED_HARD). Importé par le dashboard, la liste, le
 * détail école et SchoolActions plutôt que dupliqué — évite qu'un résidu
 * à 3 valeurs ne réapparaisse ailleurs (SUPERADMIN-V2-03B).
 */
export const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; dot: string; label: string }
> = {
  ACTIVE: { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981", dot: "#10B981", label: "Actif" },
  TRIAL: { bg: "rgba(14, 165, 233, 0.12)", color: "#0EA5E9", dot: "#0EA5E9", label: "Essai" },
  SUSPENDED_SOFT: {
    bg: "rgba(245, 158, 11, 0.12)",
    color: "#F59E0B",
    dot: "#F59E0B",
    label: "Suspendu (lecture seule)",
  },
  SUSPENDED_HARD: {
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#EF4444",
    dot: "#EF4444",
    label: "Suspendu (bloqué)",
  },
  CANCELLED: { bg: "rgba(100, 116, 139, 0.12)", color: "#94A3B8", dot: "#94A3B8", label: "Résilié" },
};

export function isSuspendedStatus(status: string): boolean {
  return status === "SUSPENDED_SOFT" || status === "SUSPENDED_HARD";
}
