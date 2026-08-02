/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBackendClient } from "@/lib/api/client";
import StaffDetailClient from "./StaffDetailClient";

export const dynamic = "force-dynamic";

export default async function StaffDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let staff: any = null;
  let subjects: { id: string; code: string; name: string }[] = [];
  let permissionsCatalog: { codename: string; name: string; module: string }[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const [staffResp, subjResp, catalogResp] = await Promise.all([
      client.get(`/auth/staff/${id}/`).catch(() => ({ data: { status: "error" } })),
      client.get("/pedagogy/subjects/"),
      // STAFF-V2-03 : réservé à staff:update, absent chez un compte qui n'aurait
      // pas ce droit — dégradé silencieusement (la section reste masquée côté UI).
      client.get("/auth/permissions/catalog/").catch(() => ({ data: { status: "error" } })),
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
  } catch {
    errorMsg = "Impossible de charger la fiche du membre du personnel.";
  }

  if (!staff && !errorMsg) {
    errorMsg = "Membre du personnel non trouvé.";
  }

  return (
    <div className="space-y-6 animate-fade-in p-7 px-8">
      <Link
        href="/staff"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour au personnel
      </Link>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {staff && (
        <StaffDetailClient staff={staff} subjects={subjects} permissionsCatalog={permissionsCatalog} />
      )}
    </div>
  );
}
