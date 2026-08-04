/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Lock,
  Unlock,
  Hash,
} from "lucide-react";
import CreatePeriodModal from "./CreatePeriodModal";
import ClosePeriodButton from "./ClosePeriodButton";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "var(--ok)", label: "Active" },
  PREPARATION: { color: "var(--warn)", label: "Préparation" },
  CLOSED: { color: "var(--mute)", label: "Clôturée" },
};

export default async function SchoolYearDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  const canManagePeriods = hasPermission(permissions, PERMISSIONS.PERIOD_CREATE);

  let sy: any = null;
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get(`/pedagogy/schoolyears/${id}/`);
    if (resp.data?.status === "success") {
      sy = resp.data.data;
    }
  } catch {
    errorMsg = "Impossible de charger l'année scolaire.";
  }

  if (!sy && !errorMsg) {
    errorMsg = "Année scolaire non trouvée.";
  }

  const seal = sy ? STATUS_STYLES[sy.status] || STATUS_STYLES.PREPARATION : null;

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/pedagogy/school-years"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux années scolaires
        </Link>

        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {sy && (
          <>
            {/* School year header */}
            <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] mb-[22px]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
                    <CalendarDays className="size-7" />
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl font-medium">{sy.label}</h1>
                    <p className="text-sm text-text-soft mt-1">
                      {sy.start_date} → {sy.end_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sy.is_current && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ color: "var(--ok)", boxShadow: "inset 0 0 0 1px var(--ok)" }}
                    >
                      <CheckCircle2 className="size-3" />
                      Courante
                    </span>
                  )}
                  {seal && (
                    <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: seal.color }}>
                      <span className="size-[9px] rounded-full border-2" style={{ borderColor: seal.color }} />
                      {seal.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-line">
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Périodes</span>
                  <p className="text-sm font-semibold">{sy.periods?.length ?? 0}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Clôturées</span>
                  <p className="text-sm font-semibold">
                    {sy.periods?.filter((p: any) => p.is_closed).length ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Ouvertes</span>
                  <p className="text-sm font-semibold">
                    {sy.periods?.filter((p: any) => !p.is_closed).length ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Periods section */}
            <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <h2 className="font-serif text-lg font-medium flex items-center gap-2">
                  <CalendarDays className="size-5 text-accent" />
                  Périodes
                </h2>
                {canManagePeriods && <CreatePeriodModal schoolYearId={id} />}
              </div>

              {(sy.periods?.length ?? 0) === 0 && (
                <div className="p-10 text-center text-text-faint">
                  Aucune période configurée pour cette année scolaire.
                </div>
              )}

              {(sy.periods?.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Ordre</th>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom</th>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Type</th>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Dates</th>
                        <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut</th>
                        <th className="text-right text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {sy.periods
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((p: any) => (
                          <tr key={p.id} className="hover:bg-paper-alt transition-colors">
                            <td className="px-6 py-4 border-b border-line last:border-b-0">
                              <span className="inline-flex items-center gap-1">
                                <Hash className="size-3 text-text-faint" />
                                <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                                  {p.order}
                                </span>
                              </span>
                            </td>
                            <td className="px-6 py-4 border-b border-line font-medium">{p.name}</td>
                            <td className="px-6 py-4 border-b border-line">
                              <span className="text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                                {p.type === "SEMESTRE"
                                  ? "Semestre"
                                  : p.type === "TRIMESTRE"
                                  ? "Trimestre"
                                  : p.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 border-b border-line text-text-soft">
                              {p.start_date} → {p.end_date}
                            </td>
                            <td className="px-6 py-4 border-b border-line text-center">
                              {p.is_closed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-text-faint">
                                  <Lock className="size-3" />
                                  Clôturée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--ok)" }}>
                                  <Unlock className="size-3" />
                                  Ouverte
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 border-b border-line text-right">
                              {canManagePeriods && !p.is_closed && (
                                <ClosePeriodButton periodId={p.id} schoolYearId={id} />
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
