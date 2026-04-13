import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export default function SuperadminDashboardPage() {
  return (
    <section>
      <PageHeader
        title="Dashboard Super Admin"
        description="Pilotage global de la plateforme, des ecoles et des operations critiques."
        actions={<Button>Nouvelle alerte</Button>}
      />
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Vue de supervision globale en cours de construction.
      </div>
    </section>
  );
}
