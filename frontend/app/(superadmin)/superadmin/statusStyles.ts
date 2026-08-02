/**
 * Source unique pour l'affichage des 5 valeurs réelles de Tenant.Status
 * (SUPERADMIN-V2-01 a remplacé l'ancien SUSPENDED unique par
 * SUSPENDED_SOFT/SUSPENDED_HARD). Importé par le dashboard, la liste, le
 * détail école et SchoolActions plutôt que dupliqué — évite qu'un résidu
 * à 3 valeurs ne réapparaisse ailleurs (SUPERADMIN-V2-03B).
 *
 * Style "seal" (anneau + texte coloré, pas de fond plein) — refonte
 * éditoriale 2026-08-02, sur le modèle des maquettes docs/design/
 * eduguinee-superadmin-*.html. `color` référence directement les tokens
 * CSS (var(--ok)/--info/--warn/--danger/--mute), theme-aware sans logique
 * JS supplémentaire.
 */
export const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "var(--ok)", label: "Actif" },
  TRIAL: { color: "var(--info)", label: "Essai" },
  SUSPENDED_SOFT: { color: "var(--warn)", label: "Suspendu (lecture seule)" },
  SUSPENDED_HARD: { color: "var(--danger)", label: "Suspendu (bloqué)" },
  CANCELLED: { color: "var(--mute)", label: "Résilié" },
};

export function isSuspendedStatus(status: string): boolean {
  return status === "SUSPENDED_SOFT" || status === "SUSPENDED_HARD";
}
