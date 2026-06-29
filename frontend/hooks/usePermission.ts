"use client";

import { useSession } from "next-auth/react";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/constants";

/**
 * Retourne true si l'utilisateur connecté possède la permission demandée.
 * @param permission - clé de permission (ex: PERMISSIONS.STUDENT_CREATE)
 */
export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;

  if (!role) return false;

  const granted = ROLE_PERMISSIONS[role] ?? [];
  return granted.includes(permission);
}

export { PERMISSIONS };
