"use client";

import { useSession } from "next-auth/react";
import { type Role } from "@/lib/constants";

/**
 * Retourne true si le rôle de l'utilisateur connecté fait partie des rôles autorisés.
 * @param roles - tableau de rôles autorisés
 */
export function useRole(roles: Role[]): boolean {
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  if (!userRole) return false;
  return roles.includes(userRole);
}
