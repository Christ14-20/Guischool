'use client';

import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/layout/page-header';
import { AuditTable } from '@/components/settings/AuditTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuperadminAuditPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Journal d'Audit Global" 
        description="Consultez l'historique complet des actions effectuées par tous les utilisateurs du système."
      />

      <Card>
        <CardHeader>
          <CardTitle>Journal d'activité</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTable token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
