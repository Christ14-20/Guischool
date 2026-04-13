'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { FileUploader } from '@/components/shared/FileUploader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PERMISSIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

type SchoolRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
};

const rows: SchoolRow[] = [
  { id: '1', name: 'Groupe Scolaire Horizon', plan: 'Pro', status: 'Active' },
  { id: '2', name: 'Complexe La Reussite', plan: 'Starter', status: 'Trial' },
  { id: '3', name: 'College Nongo', plan: 'Enterprise', status: 'Suspended' },
];

const emptyRows: SchoolRow[] = [];

const columns: DataTableColumn<SchoolRow>[] = [
  { key: 'name', header: 'Ecole', sortable: true, accessor: (row) => row.name },
  { key: 'plan', header: 'Plan', sortable: true, accessor: (row) => row.plan },
  { key: 'status', header: 'Statut', sortable: true, accessor: (row) => <StatusBadge status={row.status} /> },
  {
    key: 'actions',
    header: 'Actions',
    accessor: (row) => (
      <ConfirmDialog
        title="Suspendre l'ecole"
        description={`Voulez-vous vraiment suspendre ${row.name} ? Cette action peut etre annulee plus tard.`}
        variant="destructive"
        confirmLabel="Suspendre"
        loadingLabel="Suspension..."
        trigger={<Button variant="outline" size="sm">Suspendre</Button>}
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 450));
        }}
      />
    ),
  },
];

export default function SuperadminDashboardPage() {
  return (
    <section>
      <PageHeader
        title="Dashboard Super Admin"
        description="Pilotage global de la plateforme, des ecoles et des operations critiques."
        actions={<Button>Nouvelle alerte</Button>}
      />
      <div className="rounded-lg border bg-card p-6">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          total={rows.length}
          page={1}
          pageSize={10}
          searchPlaceholder="Rechercher une ecole..."
        />
      </div>

      <div className="mt-4 rounded-lg border bg-card p-6">
        <DataTable
          columns={columns}
          data={emptyRows}
          rowKey={(row) => row.id}
          total={0}
          page={1}
          pageSize={10}
          searchPlaceholder="Rechercher une alerte..."
          emptyTitle="Aucune alerte systeme"
          emptyDescription="Tout est stable actuellement."
          emptyAction={<Button>Creer une alerte</Button>}
          emptyActionPermission={PERMISSIONS.SUPERADMIN_ACCESS}
        />
      </div>

      <div className="mt-4 rounded-lg border bg-card p-6">
        <p className="mb-3 text-sm font-medium">Upload document (demo)</p>
        <FileUploader
          accept="image/png,image/jpeg,application/pdf"
          maxSize={10 * 1024 * 1024}
          onUploadComplete={() => {
            // Intentionnellement vide: exemple de callback sur upload termine.
          }}
        />
      </div>
    </section>
  );
}
