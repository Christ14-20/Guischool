/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import YearEndDecisionsClient from "./YearEndDecisionsClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function YearEndDecisionsPage() {
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.NOTES_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les décisions de fin d'année." />;
  }
  const canManageDecisions = hasPermission(permissions, PERMISSIONS.NOTES_VALIDATE);
  const canOverrideSchoolYear = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_OVERRIDE);

  const client = await getBackendClient();

  let decisionsData: { results: any[]; count: number } = { results: [], count: 0 };
  let schoolYears: any[] = [];
  let classes: any[] = [];
  let errorMsg: string | null = null;

  try {
    const [decisionsResp, syResp, clsResp] = await Promise.all([
      client.get("/pedagogy/year-end-decisions/"),
      client.get("/pedagogy/schoolyears/"),
      client.get("/pedagogy/classes/"),
    ]);

    if (decisionsResp.data?.status === "success") {
      decisionsData = decisionsResp.data.data;
    }
    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data?.results ?? syResp.data.data ?? [];
    }
    if (clsResp.data?.status === "success") {
      classes = clsResp.data.data?.results ?? clsResp.data.data ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger les données.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">
          Décisions de fin d&apos;année
        </h1>
        <p className="m-0 text-text-soft text-[13.5px]">
          Gérer les décisions individuelles et les promotions groupées.
        </p>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <YearEndDecisionsClient
          decisions={decisionsData.results}
          schoolYears={schoolYears}
          classes={classes}
          canManageDecisions={canManageDecisions}
          canOverrideSchoolYear={canOverrideSchoolYear}
        />
      </div>
    </div>
  );
}