/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBackendClient } from "@/lib/api/client";
import { Mail, Phone, MapPin, Award, User, ShieldAlert, ArrowLeft, Users } from "lucide-react";
import SchoolActions from "../SchoolActions";
import ChangePlanButton from "../ChangePlanButton";
import InvoicesCard from "../InvoicesCard";
import { STATUS_STYLES, isSuspendedStatus } from "../../statusStyles";


export const dynamic = "force-dynamic";

interface SchoolDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SchoolDetailPage({ params }: SchoolDetailPageProps) {
  const { id } = await params;
  let school: any = null;
  let activePlans: any[] = [];
  let invoices: any[] = [];
  let invoiceCount = 0;

  try {
    const client = await getBackendClient();
    const resp = await client.get(`/superadmin/schools/${id}/`);
    if (resp.data?.status === "success") {
      school = resp.data.data;
    }

    const plansResp = await client.get("/superadmin/plans/?is_active=true");
    if (plansResp.data?.status === "success") {
      const payload = plansResp.data.data;
      activePlans = Array.isArray(payload) ? payload : payload?.results || [];
    }

    const invoicesResp = await client.get(`/superadmin/schools/${id}/invoices/`);
    if (invoicesResp.data?.status === "success") {
      invoices = invoicesResp.data.data?.results || [];
      invoiceCount = invoicesResp.data.data?.count || 0;
    }
  } catch (err: any) {
    console.error("School detail fetch error:", err.message);
    if (err.response?.status === 404) {
      notFound();
    }
  }

  if (!school) {
    notFound();
  }

  const isSuspended = isSuspendedStatus(school.status);
  const suspendReason = school.settings?.suspend_reason || "";

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/superadmin/schools"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux établissements
        </Link>

        <div className="flex justify-between items-start pb-6 border-b border-line mb-6">
          <div>
            <h1 className="font-serif text-2xl font-medium m-0 mb-1">{school.name}</h1>
            <div className="font-mono text-accent text-[13px]">{school.slug}.eduguinee.gn</div>
            <div className="flex items-center gap-2 mt-2.5 text-text-faint text-[12.5px]">
              <span>Créé le {new Date(school.created_at).toLocaleDateString("fr-FR")}</span>
              {school.code_minedu && (
                <>
                  <span className="size-[3px] rounded-full bg-text-faint" />
                  <span>Code MINEDU · {school.code_minedu}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] tracking-[.08em] uppercase text-text-faint mb-[9px]">
              Actions de statut
            </div>
            <SchoolActions schoolId={school.id} schoolName={school.name} status={school.status} />
          </div>
        </div>

        {isSuspended && (
          <div className="p-5 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-4 mb-6">
            <div className="p-2 bg-danger/10 text-danger rounded-lg mt-0.5 shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-text text-sm">Établissement suspendu</h3>
              <p className="text-text-soft text-xs mt-1">
                Cet établissement a été suspendu par la super administration. L&apos;accès à la plateforme et aux
                fonctionnalités est bloqué pour tous les utilisateurs de cette école.
              </p>
              {suspendReason && (
                <div className="mt-3 p-3 bg-paper-alt border border-line rounded-xl text-text-soft text-xs font-mono">
                  <span className="text-text-faint block text-[10px] uppercase font-bold tracking-wider mb-1">
                    Raison de la suspension
                  </span>
                  {suspendReason}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="size-[26px] rounded-full border-[1.4px] border-line text-text-soft flex items-center justify-center shrink-0">
                  <User className="size-3.5" />
                </div>
                <h2 className="font-serif text-[15.5px] font-medium m-0">Contacts &amp; informations générales</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px_26px]">
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Directeur principal</div>
                  <div className="text-sm">{school.contact_name}</div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Téléphone</div>
                  <div className="text-sm flex items-center gap-1.5">
                    <Phone className="size-3.5 text-text-faint" />
                    {school.contact_phone}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Adresse email</div>
                  <div className="text-sm flex items-center gap-1.5">
                    <Mail className="size-3.5 text-text-faint" />
                    {school.contact_email}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Type d&apos;établissement</div>
                  <div className="text-sm">{school.school_type}</div>
                </div>
              </div>
            </div>

            <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="size-[26px] rounded-full border-[1.4px] border-line text-text-soft flex items-center justify-center shrink-0">
                  <MapPin className="size-3.5" />
                </div>
                <h2 className="font-serif text-[15.5px] font-medium m-0">Localisation géographique</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[22px_26px]">
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Région</div>
                  <div className="text-sm">{school.region || "Non renseignée"}</div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Préfecture</div>
                  <div className="text-sm">{school.prefecture || "Non renseignée"}</div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Commune</div>
                  <div className="text-sm">{school.commune || "Non renseignée"}</div>
                </div>
                <div>
                  <div className="text-[10.5px] tracking-[.07em] uppercase text-text-faint mb-1.5">Quartier</div>
                  <div className="text-sm">{school.quartier || "Non renseigné"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="size-[26px] rounded-full border-[1.4px] border-line text-text-soft flex items-center justify-center shrink-0">
                  <Award className="size-3.5" />
                </div>
                <h2 className="font-serif text-[15.5px] font-medium m-0 flex-1">Plan d&apos;abonnement</h2>
                {activePlans.length > 0 && (
                  <ChangePlanButton schoolId={school.id} currentPlanId={school.plan?.id} plans={activePlans} />
                )}
              </div>

              {school.plan ? (
                <>
                  <div className="flex justify-between items-baseline mb-5">
                    <div className="font-serif text-[22px]">{school.plan.name}</div>
                    <span className="bg-accent-soft text-accent rounded-full px-[11px] py-[3px] text-[11.5px] font-semibold">
                      Plan actif
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between py-3 border-b border-line text-[13.5px]">
                      <span className="text-text-soft">Tarif mensuel</span>
                      <span className="font-mono font-medium">
                        {parseFloat(school.plan.price_monthly).toLocaleString("fr-FR")} GNF
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-line text-[13.5px]">
                      <span className="text-text-soft">Limite élèves</span>
                      <span className="font-mono font-medium">{school.plan.max_students}</span>
                    </div>
                    <div className="flex justify-between py-3 text-[13.5px]">
                      <span className="text-text-soft">Limite personnel (staff)</span>
                      <span className="font-mono font-medium">{school.plan.max_staff}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-text-faint text-sm">Aucun plan d&apos;abonnement n&apos;est actuellement rattaché.</p>
              )}
            </div>

            <div className="border border-line bg-card rounded-xl px-[26px] py-6 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="size-[26px] rounded-full border-[1.4px] border-line text-text-soft flex items-center justify-center shrink-0">
                  <Users className="size-3.5" />
                </div>
                <h2 className="font-serif text-[15.5px] font-medium m-0">Utilisation actuelle</h2>
              </div>

              <div className="flex justify-between text-[13px] mb-[9px]">
                <span>Nombre d&apos;élèves</span>
                <span className="font-mono text-text-soft">{school.student_count} / {school.plan?.max_students || 0}</span>
              </div>
              <div className="h-[5px] rounded-full bg-paper-alt border border-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(((school.student_count || 0) / (school.plan?.max_students || 1)) * 100, 100)}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-[13px] mb-[9px] mt-5">
                <span>Membres du personnel</span>
                <span className="font-mono text-text-soft">{school.staff_count} / {school.plan?.max_staff || 0}</span>
              </div>
              <div className="h-[5px] rounded-full bg-paper-alt border border-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(((school.staff_count || 0) / (school.plan?.max_staff || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <InvoicesCard schoolId={school.id} invoices={invoices} count={invoiceCount} />
        </div>
      </div>
    </div>
  );
}
