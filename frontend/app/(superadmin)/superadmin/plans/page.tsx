/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import PlansManager from "./PlansManager";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlansPage() {
  let plans: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/superadmin/plans/");
    if (resp.data?.status === "success") {
      const payload = resp.data.data;
      plans = Array.isArray(payload) ? payload : payload?.results || [];
    }
  } catch (err: any) {
    console.error("Plans fetch error:", err.message);
    errorMsg = "Impossible de récupérer la liste des plans d'abonnement. Veuillez réessayer.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Plans &amp; Quotas</h1>
        <p className="m-0 text-text-soft text-[13.5px]">
          Gérez les offres d&apos;abonnement proposées aux établissements
        </p>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <PlansManager plans={plans} />
      </div>
    </div>
  );
}
