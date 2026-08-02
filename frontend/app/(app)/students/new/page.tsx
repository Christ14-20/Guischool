/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import EnrollStudentForm from "./EnrollStudentForm";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const session = await auth();
  const role = (session as any)?.user?.role;

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
    <div className="space-y-6 animate-fade-in p-7 px-8">
      <Link
        href="/students"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux élèves
      </Link>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <EnrollStudentForm classes={classes} schoolYears={schoolYears} role={role} />
    </div>
  );
}
