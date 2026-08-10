import React from "react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import CreateStaffForm from "./CreateStaffForm";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.STAFF_CREATE)) {
    return <AccessDenied message="Vous n'avez pas la permission de créer un compte personnel." />;
  }

  let subjects: { id: string; code: string; name: string }[] = [];
  let assignableRoles: { id: string; name: string; label: string }[] = [];

  try {
    const client = await getBackendClient();
    const [subjResp, rolesResp] = await Promise.all([
      client.get("/pedagogy/subjects/"),
      client.get("/auth/roles/").catch(() => ({ data: { status: "error" } })),
    ]);
    if (subjResp.data?.status === "success") {
      subjects = subjResp.data.data.results ?? [];
    }
    if (rolesResp.data?.status === "success") {
      const allRoles = rolesResp.data.data.results ?? [];
      assignableRoles = allRoles.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => !["DIRECTOR", "SUPER_ADMIN", "PARENT"].includes(r.name)
      );
    }
  } catch {
    // Silently fallback to empty lists
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <CreateStaffForm subjects={subjects} assignableRoles={assignableRoles} />
      </div>
    </div>
  );
}
