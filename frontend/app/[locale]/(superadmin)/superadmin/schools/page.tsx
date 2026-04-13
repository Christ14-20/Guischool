'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Suspended' | 'Trial' | 'Cancelled';
  createdAt: string;
};

const FALLBACK_SCHOOLS: SchoolRow[] = [
  { id: '1', name: 'Groupe Scolaire Horizon', slug: 'horizon', plan: 'Pro', status: 'Active', createdAt: '2026-04-01' },
  { id: '2', name: 'Complexe La Reussite', slug: 'la-reussite', plan: 'Starter', status: 'Trial', createdAt: '2026-03-21' },
  { id: '3', name: 'College Nongo', slug: 'college-nongo', plan: 'Enterprise', status: 'Suspended', createdAt: '2026-03-10' },
  { id: '4', name: 'Lycee Saran', slug: 'lycee-saran', plan: 'Pro', status: 'Active', createdAt: '2026-02-18' },
  { id: '5', name: 'Ecole Sainte Claire', slug: 'sainte-claire', plan: 'Starter', status: 'Cancelled', createdAt: '2026-02-04' },
  { id: '6', name: 'Complexe Kouroula', slug: 'kouroula', plan: 'Pro', status: 'Active', createdAt: '2026-01-24' },
  { id: '7', name: 'Institut Siguiri', slug: 'institut-siguiri', plan: 'Enterprise', status: 'Active', createdAt: '2026-01-11' },
  { id: '8', name: 'Ecole Mory Kante', slug: 'mory-kante', plan: 'Starter', status: 'Trial', createdAt: '2025-12-30' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function SuperadminSchoolsPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'fr';

  const [schools, setSchools] = useState<SchoolRow[]>(FALLBACK_SCHOOLS);
  const [loading, setLoading] = useState(true);

  const statusFilter = searchParams.get('status') ?? 'all';
  const planFilter = searchParams.get('plan') ?? 'all';
  const query = (searchParams.get('q') ?? '').toLowerCase();
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('page_size') ?? '5');

  useEffect(() => {
    let isMounted = true;

    async function loadSchools() {
      setLoading(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${base}/superadmin/schools/`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Fallback');

        const json = await response.json();
        const payload = json?.data ?? json;
        const list = payload?.results ?? payload?.items ?? payload ?? [];

        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped: SchoolRow[] = list.map((item: any, index: number) => ({
            id: String(item.id ?? index),
            name: item.name ?? `Ecole ${index + 1}`,
            slug: item.slug ?? `ecole-${index + 1}`,
            plan: (item.plan?.name ?? item.plan_name ?? 'Starter') as SchoolRow['plan'],
            status: (item.status ?? 'Active') as SchoolRow['status'],
            createdAt: item.created_at ?? new Date().toISOString(),
          }));

          setSchools(mapped);
        }
      } catch {
        if (isMounted) {
          setSchools(FALLBACK_SCHOOLS);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchools();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return schools.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesPlan = planFilter === 'all' || item.plan.toLowerCase() === planFilter.toLowerCase();
      const matchesSearch =
        !query || item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query);
      return matchesStatus && matchesPlan && matchesSearch;
    });
  }, [schools, statusFilter, planFilter, query]);

  const pagedRows = useMemo(() => {
    const start = (Math.max(page, 1) - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

  const columns: DataTableColumn<SchoolRow>[] = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (row) => row.name },
    { key: 'slug', header: 'Slug', sortable: true, accessor: (row) => row.slug },
    { key: 'plan', header: 'Plan', sortable: true, accessor: (row) => row.plan },
    { key: 'status', header: 'Statut', sortable: true, accessor: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Creee le', sortable: true, accessor: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/superadmin/schools/${row.id}`)}>
            Voir
          </Button>
          {row.status === 'Suspended' ? (
            <ConfirmDialog
              title="Reactiver l'ecole"
              description={`Reactiver ${row.name} ?`}
              confirmLabel="Reactiver"
              loadingLabel="Reactivation..."
              trigger={<Button size="sm">Reactiver</Button>}
              onConfirm={async () => {
                await new Promise((resolve) => setTimeout(resolve, 350));
              }}
            />
          ) : (
            <ConfirmDialog
              title="Suspendre l'ecole"
              description={`Suspendre ${row.name} ?`}
              variant="destructive"
              confirmLabel="Suspendre"
              loadingLabel="Suspension..."
              trigger={<Button variant="outline" size="sm">Suspendre</Button>}
              onConfirm={async () => {
                await new Promise((resolve) => setTimeout(resolve, 350));
              }}
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={(value) => setFilterParam('plan', value)}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <DataTable
          columns={columns}
          data={pagedRows}
          rowKey={(row) => row.id}
          total={filtered.length}
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
