import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PERMISSIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

export default function AppDashboardPage() {
  return (
    <section>
      <PageHeader
        title="Tableau de bord"
        description="Vue globale de l'etablissement, des classes et des activites recentes."
        actions={<Button>Nouvelle action</Button>}
      />
      <div className="rounded-lg border bg-card p-6">
        <p className="mb-4 text-sm text-muted-foreground">Vue synthese en cours de construction.</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="ACTIF" />
          <StatusBadge status="EN_COURS" />
          <StatusBadge status="BROUILLON" />
          <StatusBadge status="SUSPENDU" />
          <StatusBadge status="INCONNU" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-card p-6">
        <EmptyState
          title="Aucun ticket ouvert"
          description="Votre liste de support est vide pour le moment."
          action={<Button>Creer un ticket</Button>}
          actionPermission={PERMISSIONS.STUDENT_CREATE}
        />
      </div>
    </section>
  );
}
