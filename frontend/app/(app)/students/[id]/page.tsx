/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import StudentTabs from "./StudentTabs";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ELEVES_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter cette fiche élève." />;
  }

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
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
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
            permissions={permissions}
          />
        )}
      </div>
    </div>
  );
}
