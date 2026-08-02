/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import StudentTabs from "./StudentTabs";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  const role = (session as any)?.user?.role;

  let student: any = null;
  let classes: any[] = [];
  let schoolYears: any[] = [];
  let attendances: any[] = [];
  let invoices: any[] = [];
  let payments: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const [studentResp, classesResp, syResp, attResp, invResp, payResp] = await Promise.all([
      client
        .get(`/students/${id}/`)
        .catch(() => ({ data: { status: "error" } })),
      client.get("/pedagogy/classes/"),
      client.get("/pedagogy/schoolyears/"),
      client
        .get(`/pedagogy/attendances/?student_id=${id}`)
        .catch(() => ({ data: { status: "error" } })),
      client
        .get(`/finance/invoices/?student=${id}`)
        .catch(() => ({ data: { status: "error" } })),
      client
        .get(`/finance/payments/?student=${id}`)
        .catch(() => ({ data: { status: "error" } })),
    ]);

    if (studentResp.data?.status === "success") {
      student = studentResp.data.data;
    }
    if (classesResp.data?.status === "success") {
      classes = classesResp.data.data.results ?? [];
    }
    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data.results ?? [];
    }
    if (attResp.data?.status === "success") {
      attendances = attResp.data.data ?? [];
    }
    if (invResp.data?.data?.results) {
      invoices = invResp.data.data.results;
    } else if (Array.isArray(invResp.data?.data)) {
      invoices = invResp.data.data;
    }
    if (payResp.data?.data?.results) {
      payments = payResp.data.data.results;
    } else if (Array.isArray(payResp.data?.data)) {
      payments = payResp.data.data;
    }
  } catch {
    errorMsg = "Impossible de charger la fiche élève.";
  }

  if (!student && !errorMsg) {
    errorMsg = "Élève non trouvé.";
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

      {student && (
        <StudentTabs
          student={student}
          classes={classes}
          schoolYears={schoolYears}
          attendances={attendances}
          invoices={invoices}
          payments={payments}
          role={role}
        />
      )}
    </div>
  );
}
