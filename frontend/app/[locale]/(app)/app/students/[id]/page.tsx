import { PageHeader } from '@/components/layout/page-header';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Fiche élève"
        description={`Module 5 en cours - fiche élève ${id}.`}
      />
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Les onglets Profil, Notes, Présences, Finances et Historique seront implémentés dans la prochaine étape du module 5.
      </div>
    </section>
  );
}
