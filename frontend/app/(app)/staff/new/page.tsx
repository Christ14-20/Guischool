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

  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/subjects/");
    if (resp.data?.status === "success") {
      subjects = resp.data.data.results ?? [];
    }
  } catch {
    // Silently fallback to empty subjects list
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <CreateStaffForm subjects={subjects} />
      </div>
    </div>
  );
}
