/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import EnrollStudentForm from "./EnrollStudentForm";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ELEVES_CREATE)) {
    return <AccessDenied message="Vous n'avez pas la permission d'inscrire un élève." />;
  }
  const canOverrideSchoolYear = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_OVERRIDE);

  let classes: any[] = [];
  let schoolYears: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const [classesResp, syResp] = await Promise.all([
      client.get("/pedagogy/classes/"),
      client.get("/pedagogy/schoolyears/"),
    ]);
    if (classesResp.data?.status === "success") {
      classes = classesResp.data.data.results ?? [];
    }
    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger les classes et années scolaires.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux élèves
        </Link>

        {errorMsg && (
          <div className="max-w-3xl mx-auto mb-5 p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <EnrollStudentForm classes={classes} schoolYears={schoolYears} canOverrideSchoolYear={canOverrideSchoolYear} />
      </div>
    </div>
  );
}
