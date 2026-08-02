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
    const plansResp = await client.get("/superadmin/plans/?is_active=true");
    if (plansResp.data?.status === "success") {
      const payload = plansResp.data.data;
      if (Array.isArray(payload)) {
        plans = payload;
      } else if (Array.isArray(payload?.results)) {
        plans = payload.results;
      }
    }
  } catch (err: any) {
    console.error("NewSchoolPage plans fetch error:", err.message);
    errorMsg = "Impossible de récupérer les plans d'abonnement.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        {errorMsg && (
          <div className="max-w-[820px] mx-auto mb-5 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
            {errorMsg}
          </div>
        )}
        <CreateSchoolForm plans={plans} />
      </div>
    </div>
  );
}
