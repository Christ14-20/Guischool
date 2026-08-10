/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import RoleDetailClient from "./RoleDetailClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ROLES_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter ce rôle." />;
  }
  const canUpdate = hasPermission(permissions, PERMISSIONS.ROLES_UPDATE);
  const canDelete = hasPermission(permissions, PERMISSIONS.ROLES_DELETE);

  let role: any = null;
  let permissionsCatalog: { codename: string; name: string; module: string }[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const [roleResp, catalogResp] = await Promise.all([
      client.get(`/auth/roles/${id}/`).catch(() => ({ data: { status: "error" } })),
      client.get("/auth/permissions/catalog/").catch(() => ({ data: { status: "error" } })),
    ]);

    if (roleResp.data?.status === "success") {
      role = roleResp.data.data;
    }
    if (catalogResp.data?.status === "success") {
      permissionsCatalog = catalogResp.data.data ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger ce rôle.";
  }

  if (!role && !errorMsg) {
    errorMsg = "Rôle introuvable.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/roles"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux rôles
        </Link>

        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {role && (
          <RoleDetailClient
            role={role}
            permissionsCatalog={permissionsCatalog}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        )}
      </div>
    </div>
  );
}
