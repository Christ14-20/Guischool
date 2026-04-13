import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export default function AppDashboardPage() {
  return (
    <section>
      <PageHeader
        title="Tableau de bord"
        description="Vue globale de l'etablissement, des classes et des activites recentes."
        actions={<Button>Nouvelle action</Button>}
      />
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Contenu du dashboard en cours de construction.
      </div>
    </section>
  );
}
