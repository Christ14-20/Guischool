'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  type OnboardingRequestItem,
  getOnboardingRequests,
  reviewOnboardingRequest,
} from '@/lib/api/superadmin';

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuperadminOnboardingPage() {
  const { data: session } = useSession();
  const [rows, setRows] = useState<OnboardingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    getOnboardingRequests(token)
      .then((res) => {
        if (!mounted) return;
        setRows(res.results);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erreur de chargement des demandes.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.accessToken, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleReview = async (
    request: OnboardingRequestItem,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    const token = session?.accessToken;
    if (!token) return;

    try {
      await reviewOnboardingRequest(token, request.id, { status: decision });
      toast.success(
        decision === 'APPROVED'
          ? 'Demande approuvée. École et admin créés.'
          : 'Demande rejetée.'
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de traiter la demande.');
    }
  };

  const columns: DataTableColumn<OnboardingRequestItem>[] = [
    {
      key: 'tracking_code',
      header: 'Code',
      sortable: true,
      accessor: (r) => r.tracking_code,
    },
    {
      key: 'school',
      header: 'École',
      sortable: true,
      accessor: (r) => (
        <div>
          <p className="font-medium">{r.school_name}</p>
          <p className="text-xs text-muted-foreground">{r.school_type} · {r.school_city || '-'}</p>
        </div>
      ),
    },
    {
      key: 'admin',
      header: 'Admin demandé',
      accessor: (r) => (
        <div>
          <p>{r.admin_first_name} {r.admin_last_name}</p>
          <p className="text-xs text-muted-foreground">{r.admin_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      accessor: (r) => (
        <StatusBadge
          status={
            r.status === 'APPROVED'
              ? 'active'
              : r.status === 'REJECTED'
                ? 'inactive'
                : 'warning'
          }
          label={
            r.status === 'APPROVED'
              ? 'Approuvée'
              : r.status === 'REJECTED'
                ? 'Rejetée'
                : 'En attente'
          }
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Soumise le',
      sortable: true,
      accessor: (r) => formatDate(r.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (r) => {
        if (r.status !== 'PENDING') return <span className="text-xs text-muted-foreground">Traité</span>;

        return (
          <div className="flex gap-2">
            <ConfirmDialog
              title="Approuver la demande"
              description={`Créer l'école et le compte admin pour ${r.school_name} ?`}
              trigger={<Button size="sm">Approuver</Button>}
              confirmLabel="Approuver"
              loadingLabel="Traitement..."
              onConfirm={() => handleReview(r, 'APPROVED')}
            />
            <ConfirmDialog
              title="Rejeter la demande"
              description={`Rejeter la demande de ${r.school_name} ?`}
              variant="destructive"
              trigger={<Button size="sm" variant="destructive">Rejeter</Button>}
              confirmLabel="Rejeter"
              loadingLabel="Traitement..."
              onConfirm={() => handleReview(r, 'REJECTED')}
            />
          </div>
        );
      },
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Demandes d'ouverture d'école"
        description="Validez ou rejetez les demandes publiques d'onboarding école."
      />

      <div className="rounded-lg border bg-card p-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          searchPlaceholder="Rechercher par école, code ou email admin..."
          emptyTitle="Aucune demande"
          emptyDescription="Aucune demande d'ouverture d'école pour le moment."
        />
      </div>
    </section>
  );
}
