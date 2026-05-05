'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import {
  type SubjectItem,
  createSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from '@/lib/api/pedagogy';

const CATEGORY_LABELS: Record<string, string> = {
  SCIENTIFIC: 'Sciences',
  LITERARY: 'Littéraire',
  ARTISTIC: 'Artistique',
  PHYSICAL: 'Éducation physique',
  CIVIC: 'Éducation civique',
  OTHER: 'Autre',
};

const schema = z.object({
  code: z.string().min(1, 'Le code est requis.').max(20),
  name: z.string().min(2, 'Le nom est requis.'),
  category: z.string().min(1, 'La catégorie est requise.'),
  is_official: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
type DialogMode = { type: 'create' } | { type: 'edit'; subject: SubjectItem };

export default function SubjectsPage() {
  const { data: session } = useSession();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const token = session?.accessToken ?? '';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    getSubjects(token, categoryFilter !== 'all' ? { category: categoryFilter } : undefined)
      .then((res) => { if (mounted) { setSubjects(res.results); setTotal(res.count); } })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur de chargement.'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, refreshKey, categoryFilter]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (subject: SubjectItem) => {
    try {
      await deleteSubject(token, subject.id);
      toast.success(`Matière "${subject.name}" supprimée.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const columns: DataTableColumn<SubjectItem>[] = [
    { key: 'code', header: 'Code', sortable: true, accessor: (s) => s.code },
    { key: 'name', header: 'Nom', sortable: true, accessor: (s) => s.name },
    {
      key: 'category',
      header: 'Catégorie',
      sortable: true,
      accessor: (s) => (
        <Badge variant="outline">{CATEGORY_LABELS[s.category] ?? s.category}</Badge>
      ),
    },
    {
      key: 'is_official',
      header: 'Officielle',
      accessor: (s) => (
        <Badge variant={s.is_official ? 'default' : 'secondary'}>
          {s.is_official ? 'Oui' : 'Non'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (s) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogMode({ type: 'edit', subject: s })}
          >
            Modifier
          </Button>
          <ConfirmDialog
            title="Supprimer la matière"
            description={`Supprimer définitivement la matière "${s.name}" ?`}
            variant="destructive"
            trigger={<Button variant="destructive" size="sm">Supprimer</Button>}
            confirmLabel="Supprimer"
            loadingLabel="Suppression..."
            onConfirm={() => handleDelete(s)}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Matières"
        description="Gérez les matières enseignées dans l'établissement."
        actions={<Button onClick={() => setDialogMode({ type: 'create' })}>Nouvelle matière</Button>}
      />

      <div className="flex gap-3 rounded-lg border bg-card p-3">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <DataTable
          columns={columns}
          data={subjects}
          rowKey={(s) => String(s.id)}
          total={total}
          loading={loading}
          emptyTitle="Aucune matière"
          emptyDescription="Commencez par créer une matière."
        />
      </div>

      {dialogMode && (
        <SubjectFormDialog
          mode={dialogMode}
          token={token}
          onClose={() => setDialogMode(null)}
          onSuccess={() => { setDialogMode(null); refresh(); }}
        />
      )}
    </section>
  );
}

// ─── SubjectFormDialog ────────────────────────────────────────────────────────

function SubjectFormDialog({
  mode,
  token,
  onClose,
  onSuccess,
}: {
  mode: DialogMode;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = mode.type === 'edit';
  const subject = isEditing ? mode.subject : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: subject?.code ?? '',
      name: subject?.name ?? '',
      category: subject?.category ?? '',
      is_official: subject?.is_official ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && subject) {
        await updateSubject(token, subject.id, values);
        toast.success('Matière modifiée.');
      } else {
        await createSubject(token, values);
        toast.success('Matière créée.');
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la matière' : 'Nouvelle matière'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MAT" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Mathématiques" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_official"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="font-normal">Matière officielle</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
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
