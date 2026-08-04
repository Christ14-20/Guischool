/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import CreateSchoolYearModal from "./CreateSchoolYearModal";
import SetCurrentButton from "./SetCurrentButton";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "var(--ok)", label: "Active" },
  PREPARATION: { color: "var(--warn)", label: "Préparation" },
  CLOSED: { color: "var(--mute)", label: "Clôturée" },
};

export default async function SchoolYearsPage() {
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  const canCreate = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_CREATE);
  const canSetCurrent = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_UPDATE);

  let schoolYears: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/schoolyears/");
    if (resp.data?.status === "success") {
      schoolYears = resp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger les années scolaires.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Années scolaires</h1>
          <p className="m-0 text-text-soft text-[13.5px]">Gérez les années scolaires et leurs périodes</p>
        </div>
        {canCreate && <CreateSchoolYearModal />}
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schoolYears.length === 0 && !errorMsg && (
            <div className="col-span-full p-10 text-center text-text-faint border border-line bg-card rounded-xl">
              Aucune année scolaire pour le moment.
            </div>
          )}

          {schoolYears.map((sy: any) => {
            const seal = STATUS_STYLES[sy.status] || STATUS_STYLES.PREPARATION;
            return (
              <Link
                key={sy.id}
                href={`/pedagogy/school-years/${sy.id}`}
                className="block border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] space-y-4 hover:border-accent-line transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                      <CalendarDays className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[14.5px] group-hover:text-accent transition-colors">
                        {sy.label}
                      </h3>
                      <p className="text-xs text-text-faint mt-0.5">
                        {sy.start_date} → {sy.end_date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sy.is_current && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: "var(--ok)", boxShadow: "inset 0 0 0 1px var(--ok)" }}
                      >
                        <CheckCircle2 className="size-3" />
                        Courante
                      </span>
                    )}
                    <ChevronRight className="size-4 text-text-faint group-hover:text-accent transition-colors" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-line pt-3">
                  <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: seal.color }}>
                    <span className="size-[9px] rounded-full border-2" style={{ borderColor: seal.color }} />
                    {seal.label}
                  </span>

                  {canSetCurrent && !sy.is_current && sy.status !== "CLOSED" && (
                    <SetCurrentButton schoolYearId={sy.id} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
