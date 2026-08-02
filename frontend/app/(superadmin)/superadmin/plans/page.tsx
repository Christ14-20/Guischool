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
    <div className="space-y-8 animate-fade-in p-7 px-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Plans &amp; Quotas
        </h1>
        <p className="text-slate-400 mt-1">
          Gérez les offres d&apos;abonnement proposées aux établissements
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <PlansManager plans={plans} />
    </div>
  );
}
