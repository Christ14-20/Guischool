/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import CreateSchoolForm from "./CreateSchoolForm";
import { getBackendClient } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default async function NewSchoolPage() {
  let plans: any[] = [];
  let errorMsg = null;

  try {
    const client = await getBackendClient();
    const plansResp = await client.get("/superadmin/plans/");
    if (plansResp.data?.status === "success") {
      plans = plansResp.data.data;
    }
  } catch (err: any) {
    console.error("NewSchoolPage plans fetch error:", err.message);
    errorMsg = "Impossible de récupérer les plans d'abonnement.";
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="max-w-4xl mx-auto p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}
      <CreateSchoolForm plans={plans} />
    </div>
  );
}
