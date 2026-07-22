/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import YearEndDecisionsClient from "./YearEndDecisionsClient";

export const dynamic = "force-dynamic";

export default async function YearEndDecisionsPage() {
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          D&apos;écisions de fin d&apos;année
        </h1>
        <p className="text-slate-400 mt-1">
          Gérer les d&apos;écisions individuelles et les promotions groupées.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <YearEndDecisionsClient
        decisions={decisionsData.results}
        schoolYears={schoolYears}
        classes={classes}
      />
    </div>
  );
}