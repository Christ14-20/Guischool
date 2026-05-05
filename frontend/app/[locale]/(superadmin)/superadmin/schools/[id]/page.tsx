'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPlans, getSchool, reactivateSchool, suspendSchool, updateSchool } from '@/lib/api/superadmin';

type SchoolStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
type SchoolPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

type SchoolDetail = {
  id: string;
  name: string;
  slug: string;
  codeMinedu: string;
  type: string;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: SchoolPlan;
    startDate: string;
    endDate: string;
    payments: Array<{
      id: string;
      date: string;
      amount: number;
      status: 'PAID' | 'OVERDUE' | 'PENDING';
    }>;
  };
  stats: {
    students: number;
    staff: number;
    storageUsedGb: number;
    storageLimitGb: number;
  };
};

const FALLBACK_SCHOOL: SchoolDetail = {
  id: '1',
  name: 'Groupe Scolaire Horizon',
  slug: 'horizon',
  codeMinedu: 'GN-KA-001',
  type: 'MIXTE',
  status: 'ACTIVE',
  createdAt: '2025-08-05T09:00:00.000Z',
  updatedAt: '2026-04-10T13:20:00.000Z',
  subscription: {
    plan: 'PRO',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    payments: [
      { id: 'p-1', date: '2026-04-01T08:00:00.000Z', amount: 900000, status: 'PAID' },
      { id: 'p-2', date: '2026-03-01T08:00:00.000Z', amount: 900000, status: 'PAID' },
      { id: 'p-3', date: '2026-02-01T08:00:00.000Z', amount: 900000, status: 'PAID' },
    ],
  },
  stats: {
    students: 1268,
    staff: 84,
    storageUsedGb: 28,
    storageLimitGb: 50,
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatStatus(status: string) {
  return status.toLowerCase();
}

function formatPlan(plan: SchoolPlan) {
  if (plan === 'STARTER') return 'Starter';
  if (plan === 'PRO') return 'Pro';
  return 'Enterprise';
}

function parseSchoolDetail(raw: any, fallbackId: string): SchoolDetail {
  const planName = String(raw?.plan?.name ?? raw?.plan_name ?? raw?.subscription?.plan ?? 'STARTER').toUpperCase();
  const safePlan: SchoolPlan =
    planName === 'PRO' || planName === 'ENTERPRISE' || planName === 'STARTER' ? planName : 'STARTER';

  const rawStatus = String(raw?.status ?? 'ACTIVE').toUpperCase();
  const safeStatus: SchoolStatus =
    rawStatus === 'ACTIVE' || rawStatus === 'SUSPENDED' || rawStatus === 'TRIAL' || rawStatus === 'CANCELLED'
      ? rawStatus
      : 'ACTIVE';

  const paymentsRaw = raw?.subscription?.payments ?? raw?.payments ?? [];
  const payments = Array.isArray(paymentsRaw)
    ? paymentsRaw.map((item: any, index: number) => ({
        id: String(item?.id ?? `p-${index + 1}`),
        date: item?.date ?? item?.created_at ?? new Date().toISOString(),
        amount: Number(item?.amount ?? item?.amount_gnf ?? 0),
        status: String(item?.status ?? 'PAID').toUpperCase() as 'PAID' | 'OVERDUE' | 'PENDING',
      }))
    : [];

  return {
    id: String(raw?.id ?? fallbackId),
    name: raw?.name ?? "Ecole sans nom",
    slug: raw?.slug ?? `ecole-${fallbackId}`,
    codeMinedu: raw?.code_minedu ?? raw?.codeMinedu ?? 'N/A',
    type: raw?.type ?? 'N/A',
    status: safeStatus,
    createdAt: raw?.created_at ?? raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? new Date().toISOString(),
    subscription: {
      plan: safePlan,
      startDate: raw?.subscription?.start_date ?? raw?.subscription_start_date ?? new Date().toISOString(),
      endDate: raw?.subscription?.end_date ?? raw?.subscription_end_date ?? new Date().toISOString(),
      payments,
    },
    stats: {
      students: Number(raw?.stats?.students ?? raw?.student_count ?? 0),
      staff: Number(raw?.stats?.staff ?? raw?.staff_count ?? 0),
      storageUsedGb: Number(raw?.stats?.storage_used_gb ?? raw?.storage_used_gb ?? 0),
      storageLimitGb: Number(raw?.stats?.storage_limit_gb ?? raw?.storage_limit_gb ?? 50),
    },
  };
}

export default function SuperadminSchoolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const locale = (params?.locale as string) ?? 'fr';
  const schoolId = String(params?.id ?? '1');

  const [school, setSchool] = useState<SchoolDetail>({
    ...FALLBACK_SCHOOL,
    id: schoolId,
  });
  const [plans, setPlans] = useState<Array<{ id: number; name: SchoolPlan }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSchool() {
      setLoading(true);
      try {
        const [schoolPayload, plansPayload] = await Promise.all([
          getSchool(accessToken as string, schoolId),
          getPlans(accessToken as string),
        ]);

        const payload = schoolPayload;
        const detail = parseSchoolDetail(payload, schoolId);

        const mappedPlans = plansPayload
          .map((plan) => ({
            id: plan.id,
            name: plan.name,
          }))
          .filter((plan) => ['STARTER', 'PRO', 'ENTERPRISE'].includes(plan.name)) as Array<{
          id: number;
          name: SchoolPlan;
        }>;

        if (isMounted) {
          setSchool(detail);
          setPlans(mappedPlans);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Impossible de charger le detail de l\'ecole.';
          toast.error(message);
          setSchool({
            ...FALLBACK_SCHOOL,
            id: schoolId,
            slug: `ecole-${schoolId}`,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchool();
    return () => {
      isMounted = false;
    };
  }, [schoolId, session?.accessToken]);

  const storagePercent = useMemo(() => {
    if (!school.stats.storageLimitGb) return 0;
    return Math.min(100, Math.round((school.stats.storageUsedGb / school.stats.storageLimitGb) * 100));
  }, [school.stats.storageLimitGb, school.stats.storageUsedGb]);

  const refreshSchool = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    const payload = await getSchool(accessToken as string, schoolId);
    setSchool(parseSchoolDetail(payload, schoolId));
  };

  const handleSuspend = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    await suspendSchool(accessToken as string, schoolId, 'Suspension depuis fiche detail');
    await refreshSchool();
    toast.success('Ecole suspendue avec succes.');
  };

  const handleReactivate = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    await reactivateSchool(accessToken as string, schoolId);
    await refreshSchool();
    toast.success('Ecole reactivee avec succes.');
  };

  const handleChangePlan = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    const enterprisePlan = plans.find((plan) => plan.name === 'ENTERPRISE');
    const nextPlan = enterprisePlan ?? plans[0];
    if (!nextPlan) {
      toast.error('Aucun plan disponible pour la migration.');
      return;
    }

    await updateSchool(accessToken as string, schoolId, { plan: nextPlan.id });
    await refreshSchool();
    const message = nextPlan.name === 'ENTERPRISE' ? 'Migration vers Enterprise effectuee.' : 'Plan mis a jour avec succes.';
    toast.success(message);
  };

  const fakeRequest = async (message: string) => {
    toast.success(message);
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title={loading ? 'Chargement...' : school.name}
        description="Vue detaillee d'un etablissement: informations, abonnement, statistiques et actions sensibles."
        actions={
          <>
            <StatusBadge status={formatStatus(school.status)} />
            <Button variant="outline" onClick={() => router.push(`/${locale}/superadmin/schools`)}>
              Retour
            </Button>
            <Button onClick={() => router.push(`/${locale}/superadmin/schools/new`)}>Nouvelle ecole</Button>
          </>
        }
      />

      <Tabs defaultValue="infos" className="rounded-xl border bg-card p-4">
        <TabsList>
          <TabsTrigger value="infos">Informations generales</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations generales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nom</p>
                <p className="font-medium">{school.name}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug</p>
                <p className="font-medium">{school.slug}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Code MINEDU</p>
                <p className="font-medium">{school.codeMinedu}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                <p className="font-medium">{school.type}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Statut</p>
                <StatusBadge status={formatStatus(school.status)} className="mt-1" />
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Creee le</p>
                <p className="font-medium">{formatDate(school.createdAt)}</p>
              </div>
              <div className="rounded-md border p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Derniere mise a jour</p>
                <p className="font-medium">{formatDate(school.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan actuel</p>
                  <p className="font-medium">{formatPlan(school.subscription.plan)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date debut</p>
                  <p className="font-medium">{formatDate(school.subscription.startDate)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date fin</p>
                  <p className="font-medium">{formatDate(school.subscription.endDate)}</p>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="border-b px-3 py-2 text-sm font-medium">Historique des paiements</div>
                <div className="divide-y">
                  {school.subscription.payments.length === 0 ? (
                    <p className="px-3 py-6 text-sm text-muted-foreground">Aucun paiement d'abonnement enregistre.</p>
                  ) : (
                    school.subscription.payments.map((payment) => (
                      <div key={payment.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{payment.amount.toLocaleString('fr-FR')} GNF</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                        </div>
                        <StatusBadge status={payment.status.toLowerCase()} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques de l'ecole</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre d'eleves</p>
                <p className="text-2xl font-semibold">{school.stats.students.toLocaleString('fr-FR')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre de staff</p>
                <p className="text-2xl font-semibold">{school.stats.staff.toLocaleString('fr-FR')}</p>
              </div>
              <div className="rounded-md border p-3 sm:col-span-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Usage stockage</span>
                    <span className="text-muted-foreground tabular-nums">
                      {school.stats.storageUsedGb} Go / {school.stats.storageLimitGb} Go ({storagePercent}%)
                    </span>
                  </div>
                  <Progress value={storagePercent} className="h-2 w-full" aria-label="Usage stockage" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions sensibles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <ConfirmDialog
                title="Suspendre l'ecole"
                description={`Confirmer la suspension de ${school.name} ?`}
                variant="destructive"
                trigger={<Button variant="destructive">Suspendre</Button>}
                confirmLabel="Suspendre"
                loadingLabel="Suspension..."
                onConfirm={handleSuspend}
              />

              <ConfirmDialog
                title="Reactiver l'ecole"
                description={`Confirmer la reactivation de ${school.name} ?`}
                trigger={<Button variant="outline">Reactiver</Button>}
                confirmLabel="Reactiver"
                loadingLabel="Reactivation..."
                onConfirm={handleReactivate}
              />

              <ConfirmDialog
                title="Changer de plan"
                description="Confirmer la migration vers le plan Enterprise ?"
                trigger={<Button>Changer de plan</Button>}
                confirmLabel="Confirmer"
                loadingLabel="Mise a jour..."
                onConfirm={handleChangePlan}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}