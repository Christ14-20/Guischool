"use client";

import { usePermission } from "@/hooks/usePermission";
import { type Permission } from "@/lib/constants";

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  /** Contenu à afficher si la permission est refusée (null par défaut) */
  fallback?: React.ReactNode;
}

/**
 * Affiche `children` uniquement si l'utilisateur possède la `permission` requise.
 * Sinon, affiche `fallback` (rien par défaut).
 *
 * @example
 * <PermissionGate permission={PERMISSIONS.STUDENT_CREATE}>
 *   <Button>Ajouter un élève</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasPermission = usePermission(permission);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
