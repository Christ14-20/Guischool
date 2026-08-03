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
          <StaffDetailClient staff={staff} subjects={subjects} permissionsCatalog={permissionsCatalog} />
        )}
      </div>
    </div>
  );
}
