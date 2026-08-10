/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import CreateRoleForm from "./CreateRoleForm";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewRolePage() {
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ROLES_CREATE)) {
    return <AccessDenied message="Vous n'avez pas la permission de créer un rôle." />;
  }

  let permissionsCatalog: { codename: string; name: string; module: string }[] = [];

  try {
    const client = await getBackendClient();
    const resp = await client.get("/auth/permissions/catalog/");
    if (resp.data?.status === "success") {
      permissionsCatalog = resp.data.data ?? [];
    }
  } catch {
    // Dégradé silencieusement — le formulaire affichera un état vide.
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <CreateRoleForm permissionsCatalog={permissionsCatalog} />
      </div>
    </div>
  );
}
