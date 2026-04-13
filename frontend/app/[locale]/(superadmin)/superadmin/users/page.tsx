'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SuperadminUser = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OPS_ADMIN' | 'SUPPORT_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  lastLogin: string;
};

const FALLBACK_USERS: SuperadminUser[] = [
  {
    id: 'u-1',
    name: 'Kadiatou Bah',
    email: 'kadiatou.bah@eduguinee.com',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-04-12T18:30:00.000Z',
  },
  {
    id: 'u-2',
    name: 'Mamadou Diallo',
    email: 'mamadou.diallo@eduguinee.com',
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-04-12T16:45:00.000Z',
  },
  {
    id: 'u-3',
    name: 'Aissatou Camara',
    email: 'aissatou.camara@eduguinee.com',
    role: 'SUPPORT_ADMIN',
    status: 'SUSPENDED',
    lastLogin: '2026-04-09T10:20:00.000Z',
  },
  {
    id: 'u-4',
    name: 'Fode Keita',
    email: 'fode.keita@eduguinee.com',
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-04-11T13:05:00.000Z',
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRole(role: SuperadminUser['role']) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'OPS_ADMIN') return 'Ops Admin';
  return 'Support Admin';
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<SuperadminUser[]>(FALLBACK_USERS);
  const [roleFilter, setRoleFilter] = useState<'all' | SuperadminUser['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SuperadminUser['status']>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;
      return roleMatch && statusMatch;
    });
  }, [roleFilter, statusFilter, users]);

  const onToggleUserStatus = async (user: SuperadminUser) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? {
              ...item,
              status: item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
            }
          : item
      )
    );

    toast.success(
      user.status === 'ACTIVE' ? 'Utilisateur desactive avec succes.' : 'Utilisateur active avec succes.'
    );
  };

  const onResetPassword = async (user: SuperadminUser) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    toast.success(`Lien de reinitialisation envoye a ${user.email}.`);
  };

  const columns: DataTableColumn<SuperadminUser>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      accessor: (user) => user.name,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      accessor: (user) => user.email,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: (user) => formatRole(user.role),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      accessor: (user) => <StatusBadge status={user.status.toLowerCase()} />,
    },
    {
      key: 'lastLogin',
      header: 'Derniere connexion',
      sortable: true,
      accessor: (user) => formatDate(user.lastLogin),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (user) => (
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            title={user.status === 'ACTIVE' ? 'Desactiver le compte' : 'Activer le compte'}
            description={`Confirmer cette action pour ${user.name} ?`}
            variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
            trigger={
              <Button variant={user.status === 'ACTIVE' ? 'outline' : 'default'} size="sm">
                {user.status === 'ACTIVE' ? 'Desactiver' : 'Activer'}
              </Button>
            }
            confirmLabel={user.status === 'ACTIVE' ? 'Desactiver' : 'Activer'}
            loadingLabel="Traitement..."
            onConfirm={() => onToggleUserStatus(user)}
          />

          <ConfirmDialog
            title="Reinitialiser le mot de passe"
            description={`Envoyer un lien de reinitialisation a ${user.email} ?`}
            trigger={<Button variant="outline" size="sm">Reinit. mot de passe</Button>}
            confirmLabel="Envoyer"
            loadingLabel="Envoi..."
            onConfirm={() => onResetPassword(user)}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Utilisateurs Super Admin"
        description="Gestion des comptes d'administration globale de la plateforme."
      />

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="OPS_ADMIN">Ops Admin</SelectItem>
            <SelectItem value="SUPPORT_ADMIN">Support Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actif</SelectItem>
            <SelectItem value="SUSPENDED">Suspendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <DataTable
          columns={columns}
          data={filteredUsers}
          rowKey={(row) => row.id}
          total={filteredUsers.length}
          page={1}
          pageSize={10}
          loading={false}
          searchPlaceholder="Rechercher par nom ou email..."
          emptyTitle="Aucun utilisateur"
          emptyDescription="Aucun utilisateur ne correspond aux filtres appliques."
        />
      </div>
    </section>
  );
}