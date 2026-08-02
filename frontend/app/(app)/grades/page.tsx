/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import { auth } from "@/auth";
import GradeEntryClient from "./GradeEntryClient";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const session = await auth();
  const user = (session as any)?.user;
  const role = user?.role;

  let schoolYears: any[] = [];
  let classes: any[] = [];
  let subjects: any[] = [];
  let classSubjects: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const [syResp, clsResp, subResp] = await Promise.all([
      client.get("/pedagogy/schoolyears/"),
      client.get("/pedagogy/classes/"),
      client.get("/pedagogy/subjects/"),
    ]);

    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data.results ?? syResp.data.data ?? [];
    }
    if (clsResp.data?.status === "success") {
      classes = clsResp.data.data.results ?? clsResp.data.data ?? [];
    }
    if (subResp.data?.status === "success") {
      subjects = subResp.data.data.results ?? subResp.data.data ?? [];
    }

    // Charger les matières liées à chaque classe (pour le filtrage)
    const classSubjectsPromises = classes.map(async (cls: any) => {
      const csResp = await client.get(`/pedagogy/classes/${cls.id}/subjects/`);
      return csResp.data?.data?.results ?? csResp.data?.data ?? csResp.data ?? [];
    });
    const nested = await Promise.all(classSubjectsPromises);
    classSubjects = nested.flat();
  } catch {
    errorMsg = "Impossible de charger les données.";
  }

  return (
    <div className="space-y-6 animate-fade-in p-7 px-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Saisie des notes
        </h1>
        <p className="text-slate-400 mt-1">
          Sélectionnez une classe, une matière et une période pour saisir ou consulter les notes.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <GradeEntryClient
        schoolYears={schoolYears}
        classes={classes}
        subjects={subjects}
        classSubjects={classSubjects}
        role={role}
        userId={user?.id}
      />
    </div>
  );
}
