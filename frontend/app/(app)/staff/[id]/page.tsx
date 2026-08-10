/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import StaffDetailClient from "./StaffDetailClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.STAFF_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter cette fiche personnel." />;
  }

  let staff: any = null;
  let subjects: { id: string; code: string; name: string }[] = [];
  let permissionsCatalog: { codename: string; name: string; module: string }[] = [];
  let assignableRoles: { id: string; name: string; label: string }[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const [staffResp, subjResp, catalogResp, rolesResp] = await Promise.all([
      client.get(`/auth/staff/${id}/`).catch(() => ({ data: { status: "error" } })),
      client.get("/pedagogy/subjects/"),
      // STAFF-V2-03 : réservé à staff:update, absent chez un compte qui n'aurait
      // pas ce droit — dégradé silencieusement (la section reste masquée côté UI).
      client.get("/auth/permissions/catalog/").catch(() => ({ data: { status: "error" } })),
      // ROLES-V2-01 : réservé à roles:read — dégradé silencieusement (le
      // sélecteur "Changer de rôle" reste masqué si la liste est vide).
      client.get("/auth/roles/").catch(() => ({ data: { status: "error" } })),
    ]);

    if (staffResp.data?.status === "success") {
      staff = staffResp.data.data;
    }
    if (subjResp.data?.status === "success") {
      subjects = subjResp.data.data.results ?? [];
    }
    if (catalogResp.data?.status === "success") {
      permissionsCatalog = catalogResp.data.data ?? [];
    }
    if (rolesResp.data?.status === "success") {
      const allRoles = rolesResp.data.data.results ?? [];
      assignableRoles = allRoles.filter(
        (r: any) => !["DIRECTOR", "SUPER_ADMIN", "PARENT"].includes(r.name)
      );
    }
  } catch {
    errorMsg = "Impossible de charger la fiche du membre du personnel.";
  }

  if (!staff && !errorMsg) {
    errorMsg = "Membre du personnel non trouvé.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour au personnel
        </Link>

        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {staff && (
          <StaffDetailClient
            staff={staff}
            subjects={subjects}
            permissionsCatalog={permissionsCatalog}
            viewerPermissions={permissions}
            assignableRoles={assignableRoles}
          />
        )}
      </div>
    </div>
  );
}
