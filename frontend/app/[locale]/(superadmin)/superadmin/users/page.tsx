'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createSuperadminUser,
  getSuperadminUsers,
  resetSuperadminUserPassword,
  toggleSuperadminUser,
  updateSuperadminUser,
} from '@/lib/api/superadmin';

type SuperadminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLogin: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return 'Jamais';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRole(role: SuperadminUser['role']) {
  return role
    .toLowerCase()
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

// ─── User Form Dialog ────────────────────────────────────────────────────────

const userSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis.'),
  last_name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('Adresse email invalide.'),
  role: z.string().min(1, 'Le rôle est requis.'),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser: SuperadminUser | null;
  token: string;
  onSuccess: () => void;
};

function UserFormDialog({ open, onOpenChange, initialUser, token, onSuccess }: UserFormDialogProps) {
  const isEditing = initialUser !== null;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing
        ? userSchema
        : userSchema.extend({ password: z.string().min(8, 'Au moins 8 caractères requis.') })
    ),
    defaultValues: {
      first_name: initialUser ? initialUser.name.split(' ')[0] ?? '' : '',
      last_name: initialUser ? (initialUser.name.split(' ').slice(1).join(' ') ?? '') : '',
      email: initialUser?.email ?? '',
      role: initialUser?.role ?? '',
      password: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: initialUser ? initialUser.name.split(' ')[0] ?? '' : '',
        last_name: initialUser ? (initialUser.name.split(' ').slice(1).join(' ') ?? '') : '',
        email: initialUser?.email ?? '',
        role: initialUser?.role ?? '',
        password: '',
      });
    }
  }, [open, initialUser, form]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (isEditing) {
        const body: Record<string, string> = {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          role: values.role,
        };
        if (values.password) body.password = values.password;
        await updateSuperadminUser(token, initialUser.id, body);
        toast.success('Utilisateur modifié avec succès.');
      } else {
        await createSuperadminUser(token, {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          role: values.role,
          password: values.password!,
        });
        toast.success('Utilisateur créé avec succès.');
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Mamadou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Diallo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@eduguinee.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN_SCHOOL">Admin École</SelectItem>
                      <SelectItem value="SECRETAIRE">Secrétaire</SelectItem>
                      <SelectItem value="ENSEIGNANT">Enseignant</SelectItem>
                      <SelectItem value="PARENT">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperadminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperadminUser | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const roleFilter = searchParams.get('role') ?? 'all';
  const statusFilter = searchParams.get('status') ?? 'all';
  const query = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('page_size') ?? '10');

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

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    setLoading(true);
    getSuperadminUsers(accessToken, {
      page,
      page_size: pageSize,
      role: roleFilter === 'all' ? undefined : roleFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: query || undefined,
    })
      .then((response) => {
        if (!isMounted) return;
        setUsers(
          response.results.map((item) => ({
            id: item.id,
            name: `${item.first_name} ${item.last_name}`.trim() || item.email,
            email: item.email,
            role: item.role || 'N/A',
            status: item.status,
            lastLogin: item.last_login,
          }))
        );
        setTotal(response.count);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.';
        toast.error(message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, page, pageSize, roleFilter, statusFilter, query, refreshKey]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEditDialog = (user: SuperadminUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const onToggleUserStatus = async (user: SuperadminUser) => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    await toggleSuperadminUser(accessToken, user.id);

    toast.success(
      user.status === 'ACTIVE' ? 'Utilisateur desactive avec succes.' : 'Utilisateur active avec succes.'
    );

    const response = await getSuperadminUsers(accessToken, {
      page,
      page_size: pageSize,
      role: roleFilter === 'all' ? undefined : roleFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: query || undefined,
    });

    setUsers(
      response.results.map((item) => ({
        id: item.id,
        name: `${item.first_name} ${item.last_name}`.trim() || item.email,
        email: item.email,
        role: item.role || 'N/A',
        status: item.status,
        lastLogin: item.last_login,
      }))
    );
    setTotal(response.count);
  };

  const onResetPassword = async (user: SuperadminUser) => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    await resetSuperadminUserPassword(accessToken, user.id);
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
          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
            Modifier
          </Button>
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
        actions={
          <Button onClick={openCreateDialog}>Ajouter un utilisateur</Button>
        }
      />

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <Select value={roleFilter} onValueChange={(value) => setFilterParam('role', value)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN_SCHOOL">Admin School</SelectItem>
            <SelectItem value="SECRETAIRE">Secretaire</SelectItem>
            <SelectItem value="ENSEIGNANT">Enseignant</SelectItem>
            <SelectItem value="PARENT">Parent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setFilterParam('status', value)}>
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
          data={users}
          rowKey={(row) => row.id}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          searchPlaceholder="Rechercher par nom ou email..."
          emptyTitle="Aucun utilisateur"
          emptyDescription="Aucun utilisateur ne correspond aux filtres appliques."
        />
      </div>

      {session?.accessToken && (
        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialUser={editingUser}
          token={session.accessToken}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </section>
  );
}