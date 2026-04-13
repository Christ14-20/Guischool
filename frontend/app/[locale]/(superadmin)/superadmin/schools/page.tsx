'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPlans, getSchools, reactivateSchool, suspendSchool } from '@/lib/api/superadmin';

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  planName: string;
  planId: number | null;
  status: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

function normalizeStatus(status: string) {
  return status.toUpperCase();
}

function toOrdering(sortBy: string, sortOrder: string) {
  if (!sortBy) return '-created_at';

  const map: Record<string, string> = {
    name: 'name',
    createdAt: 'created_at',
    created_at: 'created_at',
  };

  const backendField = map[sortBy] ?? sortBy;
  return sortOrder === 'desc' ? `-${backendField}` : backendField;
}

export default function SuperadminSchoolsPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const locale = (params?.locale as string) ?? 'fr';

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [total, setTotal] = useState(0);
  const [planOptions, setPlanOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const statusFilter = searchParams.get('status') ?? 'all';
  const planFilter = searchParams.get('plan') ?? 'all';
  const query = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('page_size') ?? '5');
  const sortBy = searchParams.get('sort_by') ?? '';
  const sortOrder = searchParams.get('sort_order') ?? 'asc';

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSchools() {
      setLoading(true);
      try {
        const [plans, schoolsPage] = await Promise.all([
          getPlans(accessToken),
          getSchools(accessToken, {
            page,
            page_size: pageSize,
            status: statusFilter === 'all' ? undefined : normalizeStatus(statusFilter),
            plan: planFilter === 'all' ? undefined : planFilter,
            search: query || undefined,
            ordering: toOrdering(sortBy, sortOrder),
          }),
        ]);

        if (isMounted) {
          setPlanOptions(
            plans.map((plan) => ({
              id: plan.id,
              label: plan.name.charAt(0) + plan.name.slice(1).toLowerCase(),
            }))
          );

          setTotal(schoolsPage.count);
          setSchools(
            schoolsPage.results.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              planName: item.plan_name ?? 'N/A',
              planId: item.plan,
              status: item.status,
              createdAt: item.created_at,
            }))
          );
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Impossible de charger les ecoles.';
          toast.error(message);
          setSchools([]);
          setTotal(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchools();
    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, page, pageSize, statusFilter, planFilter, query, sortBy, sortOrder, refreshKey]);

  const setFilterParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSuspend = async (row: SchoolRow) => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    await suspendSchool(accessToken, row.id, 'Suspension depuis console superadmin');
    toast.success(`Ecole ${row.name} suspendue.`);
    setRefreshKey((value) => value + 1);
  };

  const handleReactivate = async (row: SchoolRow) => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    await reactivateSchool(accessToken, row.id);
    toast.success(`Ecole ${row.name} reactivee.`);
    setRefreshKey((value) => value + 1);
  };

  const columns: DataTableColumn<SchoolRow>[] = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (row) => row.name },
    { key: 'slug', header: 'Slug', sortable: true, accessor: (row) => row.slug },
    { key: 'plan', header: 'Plan', sortable: false, accessor: (row) => row.planName },
    { key: 'status', header: 'Statut', sortable: false, accessor: (row) => <StatusBadge status={row.status.toLowerCase()} /> },
    { key: 'createdAt', header: 'Creee le', sortable: true, accessor: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/superadmin/schools/${row.id}`)}>
            Voir
          </Button>
          {normalizeStatus(row.status) === 'SUSPENDED' ? (
            <ConfirmDialog
              title="Reactiver l'ecole"
              description={`Reactiver ${row.name} ?`}
              confirmLabel="Reactiver"
              loadingLabel="Reactivation..."
              trigger={<Button size="sm">Reactiver</Button>}
              onConfirm={() => handleReactivate(row)}
            />
          ) : (
            <ConfirmDialog
              title="Suspendre l'ecole"
              description={`Suspendre ${row.name} ?`}
              variant="destructive"
              confirmLabel="Suspendre"
              loadingLabel="Suspension..."
              trigger={<Button variant="outline" size="sm">Suspendre</Button>}
              onConfirm={() => handleSuspend(row)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Ecoles"
        description="Liste et gestion des etablissements Eduguinee."
        actions={<Button onClick={() => router.push(`/${locale}/superadmin/schools/new`)}>Nouvelle ecole</Button>}
      />

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={(value) => setFilterParam('status', value)}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={(value) => setFilterParam('plan', value)}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            {planOptions.map((plan) => (
              <SelectItem key={plan.id} value={String(plan.id)}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <DataTable
          columns={columns}
          data={schools}
          rowKey={(row) => row.id}
          total={total}
          page={Math.max(page, 1)}
          pageSize={pageSize}
          loading={loading}
          searchPlaceholder="Rechercher par nom ou slug..."
          emptyTitle="Aucune ecole trouvee"
          emptyDescription="Aucun resultat ne correspond aux filtres appliques."
        />
      </div>
    </section>
  );
}
