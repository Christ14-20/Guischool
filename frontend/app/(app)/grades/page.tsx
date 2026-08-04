/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getBackendClient } from "@/lib/api/client";
import { auth } from "@/auth";
import GradeEntryClient from "./GradeEntryClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const session = await auth();
  const user = (session as any)?.user;
  const role = user?.role;
  const permissions: string[] = user?.permissions ?? [];

  if (
    !hasAnyPermission(permissions, [
      PERMISSIONS.NOTES_READ,
      PERMISSIONS.NOTES_CREATE_EVALUATION,
      PERMISSIONS.NOTES_LOCK,
      PERMISSIONS.NOTES_VALIDATE,
    ])
  ) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les notes." />;
  }

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
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Saisie des notes</h1>
        <p className="m-0 text-text-soft text-[13.5px]">
          Sélectionnez une classe, une matière et une période pour saisir ou consulter les notes.
        </p>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
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
          permissions={permissions}
        />
      </div>
    </div>
  );
}
