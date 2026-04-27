'use client';

import { Download, Plus, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClasses, getSchoolYears, type ClassItem, type SchoolYearItem } from '@/lib/api/pedagogy';
import { getStudents, type StudentItem } from '@/lib/api/students';
import { PERMISSIONS } from '@/lib/constants';

const DEFAULT_PAGE_SIZE = 10;

const STUDENT_STATUS_OPTIONS = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'TRANSFERE', label: 'Transféré' },
  { value: 'ARCHIVE', label: 'Archivé' },
] as const;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);

  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('page_size'), DEFAULT_PAGE_SIZE);
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sort_by') ?? '';
  const sortOrder = searchParams.get('sort_order') ?? 'asc';
  const classFilter = searchParams.get('classe') ?? 'all';
  const statusFilter = searchParams.get('statut') ?? 'all';
  const yearFilter = searchParams.get('annee') ?? 'all';

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    Promise.all([getClasses(token), getSchoolYears(token)])
      .then(([classRes, yearRes]) => {
        if (!mounted) return;
        setClasses(classRes.results);
        setYears(yearRes.results);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Impossible de charger les filtres.');
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    getStudents(token, {
      page,
      page_size: pageSize,
      classe: classFilter === 'all' ? undefined : classFilter,
      statut: statusFilter === 'all' ? undefined : statusFilter,
      annee: yearFilter === 'all' ? undefined : yearFilter,
      search: search || undefined,
      sort_by: sortBy || undefined,
      sort_order: sortBy ? sortOrder : undefined,
    })
      .then((response) => {
        if (!mounted) return;
        setStudents(response.results);
        setTotal(response.count);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des élèves.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, page, pageSize, classFilter, statusFilter, yearFilter, search, sortBy, sortOrder]);

  const setFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const columns = useMemo<DataTableColumn<StudentItem>[]>(
    () => [
      {
        key: 'matricule',
        header: 'Matricule',
        sortable: true,
        className: 'font-medium',
        accessor: (row) => row.matricule || '—',
      },
      {
        key: 'nom_complet',
        header: 'Nom complet',
        sortable: true,
        accessor: (row) => row.full_name || '—',
      },
      {
        key: 'classe',
        header: 'Classe',
        sortable: true,
        accessor: (row) => row.classe_name || '—',
      },
      {
        key: 'statut',
        header: 'Statut',
        sortable: true,
        accessor: (row) => <StatusBadge status={row.status} className="uppercase" />,
      },
      {
        key: 'tuteur',
        header: 'Tuteur',
        accessor: (row) =>
          row.guardian_phone ? (
            <div className="space-y-0.5">
              <p>{row.guardian_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{row.guardian_phone}</p>
            </div>
          ) : (
            row.guardian_name || '—'
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        accessor: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`${pathname}/${row.id}`);
            }}
          >
            Voir
          </Button>
        ),
      },
    ],
    [pathname, router]
  );

  const handleExportCsv = () => {
    if (students.length === 0) {
      toast.info('Aucune donnée à exporter.');
      return;
    }

    const headers = ['Matricule', 'Nom complet', 'Classe', 'Statut', 'Tuteur', 'Téléphone tuteur'];
    const lines = students.map((student) => [
      student.matricule,
      student.full_name,
      student.classe_name,
      student.status,
      student.guardian_name,
      student.guardian_phone,
    ]);

    const csv = [headers, ...lines]
      .map((line) =>
        line
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `eleves-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Élèves"
        description="Liste, recherche et suivi des élèves de l'établissement."
        actions={
          <>
            <Button type="button" variant="outline" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <PermissionGate permission={PERMISSIONS.STUDENT_CREATE}>
              <Button type="button" onClick={() => router.push(`${pathname}/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Inscrire un élève
              </Button>
            </PermissionGate>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <Select value={classFilter} onValueChange={(value) => setFilterParam('classe', value ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classes.map((classe) => (
              <SelectItem key={classe.id} value={String(classe.id)}>
                {classe.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setFilterParam('statut', value ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STUDENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={(value) => setFilterParam('annee', value ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Année scolaire" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les années</SelectItem>
            {years.map((year) => (
              <SelectItem key={year.id} value={String(year.id)}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={students}
        rowKey={(row) => row.id}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        searchPlaceholder="Rechercher un élève (nom, matricule)..."
        queryParamKey="search"
        sortByParamKey="sort_by"
        sortOrderParamKey="sort_order"
        emptyIcon={Users}
        emptyTitle="Aucun élève trouvé"
        emptyDescription="Aucun élève ne correspond aux filtres appliqués."
        onRowClick={(row) => router.push(`${pathname}/${row.id}`)}
      />
    </section>
  );
}
