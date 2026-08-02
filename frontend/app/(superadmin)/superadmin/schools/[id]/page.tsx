/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBackendClient } from "@/lib/api/client";
import { Building2, Calendar, Mail, Phone, MapPin, Award, User, ShieldAlert, ArrowLeft, Users } from "lucide-react";
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
  const statusStyle = STATUS_STYLES[school.status] || STATUS_STYLES.TRIAL;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in p-7 px-8">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/superadmin/schools"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour aux établissements
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.color + "33" }}
          >
            <span className="size-1.5 rounded-full" style={{ background: statusStyle.dot }} />
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Header Profile Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
            <Building2 className="size-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{school.name}</h1>
            <p className="text-indigo-400 font-mono text-sm">{school.slug}.eduguinee.gn</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-500" />
                Créé le {new Date(school.created_at).toLocaleDateString("fr-FR")}
              </span>
              {school.code_minedu && (
                <span className="flex items-center gap-1 border-l border-slate-850 pl-4">
                  Code MINEDU : {school.code_minedu}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick status change action */}
        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Actions de statut</span>
            <span className="text-xs text-slate-300 font-medium">Changer l’état</span>
          </div>
          <SchoolActions
            schoolId={school.id}
            schoolName={school.name}
            status={school.status}
          />
        </div>
      </div>

      {/* Suspension Alert if suspended */}
      {isSuspended && (
        <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-4 shadow-lg">
          <div className="p-2 bg-destructive/10 text-destructive rounded-lg mt-0.5">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Établissement suspendu</h3>
            <p className="text-slate-400 text-xs mt-1">
              Cet établissement a été suspendu par la super administration. L’accès à la plateforme et aux fonctionnalités est bloqué pour tous les utilisateurs de cette école.
            </p>
            {suspendReason && (
              <div className="mt-3 p-3 bg-slate-950/80 border border-slate-850 rounded-xl text-slate-300 text-xs font-mono">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Raison de la suspension</span>
                {suspendReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Core details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left side details card: General & Location Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
            <h2 className="font-bold text-white text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
              <User className="size-5 text-indigo-400" />
              Contacts & Informations Générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Directeur Principal</span>
                <span className="text-white font-medium flex items-center gap-2">
                  {school.contact_name}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Téléphone</span>
                <span className="text-white font-medium flex items-center gap-2 font-mono">
                  <Phone className="size-3.5 text-slate-500" />
                  {school.contact_phone}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Adresse Email</span>
                <span className="text-white font-medium flex items-center gap-2">
                  <Mail className="size-3.5 text-slate-500" />
                  {school.contact_email}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Type d’établissement</span>
                <span className="text-white font-medium">
                  {school.school_type}
                </span>
              </div>
            </div>
          </div>

          {/* Localisation */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
            <h2 className="font-bold text-white text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
              <MapPin className="size-5 text-indigo-400" />
              Localisation géographique
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Région</span>
                <span className="text-white font-medium">{school.region || "Non renseignée"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Préfecture</span>
                <span className="text-white font-medium">{school.prefecture || "Non renseignée"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Commune</span>
                <span className="text-white font-medium">{school.commune || "Non renseignée"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs">Quartier</span>
                <span className="text-white font-medium">{school.quartier || "Non renseigné"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side details card: Subscription plan & Quotas */}
        <div className="space-y-8">
          {/* Subscription plan details */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <Award className="size-5 text-indigo-400" />
                Plan d’abonnement
              </h2>
              {activePlans.length > 0 && (
                <ChangePlanButton schoolId={school.id} currentPlanId={school.plan?.id} plans={activePlans} />
              )}
            </div>

            {school.plan ? (
              <div className="space-y-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-lg">{school.plan.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">
                    Plan actif
                  </span>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between border-b border-slate-800/50 pb-2">
                    <span className="text-slate-400">Tarif mensuel</span>
                    <span className="text-white font-mono font-medium">
                      {parseFloat(school.plan.price_monthly).toLocaleString("fr-FR")} GNF
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/50 pb-2">
                    <span className="text-slate-400">Limite élèves</span>
                    <span className="text-white font-medium">{school.plan.max_students}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-400">Limite personnel (Staff)</span>
                    <span className="text-white font-medium">{school.plan.max_staff}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucun plan d’abonnement n’est actuellement rattaché.</p>
            )}
          </div>

          {/* Current quotas/usage */}
          <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
            <h2 className="font-bold text-white text-lg border-b border-slate-800 pb-3 flex items-center gap-2">
              <Users className="size-5 text-indigo-400" />
              Utilisation actuelle
            </h2>
            
            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Nombre d’élèves</span>
                  <span className="text-white font-bold">
                    {school.student_count} / {school.plan?.max_students || 0}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((school.student_count || 0) / (school.plan?.max_students || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Membres du personnel</span>
                  <span className="text-white font-bold">
                    {school.staff_count} / {school.plan?.max_staff || 0}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((school.staff_count || 0) / (school.plan?.max_staff || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Facturation SaaS (école -> Eduguinée) — SUPERADMIN-V2-05 */}
      <InvoicesCard schoolId={school.id} invoices={invoices} count={invoiceCount} />
    </div>
  );
}
