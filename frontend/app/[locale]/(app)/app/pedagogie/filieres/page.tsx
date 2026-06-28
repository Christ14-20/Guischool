'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { GraduationCap, Wrench, Beaker } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type FiliereItem,
  getFilieres,
  createFiliere,
  updateFiliere,
  deleteFiliere,
} from '@/lib/api/pedagogy';

const CYCLE_LABELS: Record<string, string> = {
  LYCEE_GEN: 'Lycée Général',
  LYCEE_TECH: 'Lycée Technique',
  CQP: 'CQP (BEP/CAP/BTS)',
};

const CYCLE_ICONS: Record<string, typeof GraduationCap> = {
  LYCEE_GEN: GraduationCap,
  LYCEE_TECH: Wrench,
  CQP: Beaker,
};

const CODE_CHOICES = [
  { value: 'S', label: 'Scientifique' },
  { value: 'L', label: 'Littéraire' },
  { value: 'SE', label: 'Sciences Économiques' },
  { value: 'SM', label: 'Sciences Mathématiques' },
  { value: 'SS', label: 'Sciences de la Santé' },
  { value: 'T1', label: 'Technique 1' },
  { value: 'T2', label: 'Technique 2' },
  { value: 'T3', label: 'Technique 3' },
  { value: 'T4', label: 'Technique 4' },
  { value: 'BEP', label: 'BEP' },
  { value: 'CAP', label: 'CAP' },
  { value: 'BTS', label: 'BTS' },
] as const;

const schema = z.object({
  code: z.string().min(1, 'Le code est requis.'),
  name: z.string().min(1, 'Le nom est requis.'),
  cycle: z.string().min(1, 'Le cycle est requis.'),
  matieres_dominantes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type DialogMode = { type: 'create' } | { type: 'edit'; filiere: FiliereItem };

export default function FilieresPage() {
  const { data: session } = useSession();
  const [filieres, setFilieres] = useState<FiliereItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = session?.accessToken ?? '';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    getFilieres(token)
      .then((res) => { if (mounted) setFilieres(res.results); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur de chargement.'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const filieresByCycle = filieres.reduce<Record<string, FiliereItem[]>>((acc, f) => {
    acc[f.cycle] = [...(acc[f.cycle] ?? []), f];
    return acc;
  }, {});

  const handleDelete = async (filiere: FiliereItem) => {
    try {
      await deleteFiliere(token, filiere.id);
      toast.success(`Filière "${filiere.name}" supprimée.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Filières"
        description="Gérez les filières d'études (Lycée général, technique et CQP)."
        actions={
          <Button onClick={() => setDialogMode({ type: 'create' })}>Nouvelle filière</Button>
        }
      />

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : (
        <div className="space-y-6">
          {(['LYCEE_GEN', 'LYCEE_TECH', 'CQP'] as const).map((cycle) => {
            const cycleFilieres = filieresByCycle[cycle] ?? [];
            if (cycleFilieres.length === 0) return null;
            const Icon = CYCLE_ICONS[cycle];

            return (
              <div key={cycle}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{CYCLE_LABELS[cycle]}</h2>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead className="hidden sm:table-cell">Matières dominantes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleFilieres.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <Badge variant="outline">{f.code}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {f.matieres_dominantes?.length
                              ? f.matieres_dominantes.join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDialogMode({ type: 'edit', filiere: f })}
                              >
                                Modifier
                              </Button>
                              <ConfirmDialog
                                title="Supprimer la filière"
                                description={`Confirmer la suppression de la filière "${f.name}" ?`}
                                variant="destructive"
                                trigger={<Button variant="destructive" size="sm">Supprimer</Button>}
                                confirmLabel="Supprimer"
                                loadingLabel="Suppression..."
                                onConfirm={() => handleDelete(f)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}

          {filieres.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Aucune filière configurée. Créez des filières pour commencer.
            </p>
          )}
        </div>
      )}

      {dialogMode && (
        <FiliereFormDialog
          mode={dialogMode}
          token={token}
          onClose={() => setDialogMode(null)}
          onSuccess={() => { setDialogMode(null); refresh(); }}
        />
      )}
    </section>
  );
}

// ─── FiliereFormDialog ──────────────────────────────────────────────────────

function FiliereFormDialog({
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
  const filiere = isEditing ? mode.filiere : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: filiere?.code ?? '',
      name: filiere?.name ?? '',
      cycle: filiere?.cycle ?? '',
      matieres_dominantes: filiere?.matieres_dominantes?.join(', ') ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const body = {
        code: values.code,
        name: values.name,
        cycle: values.cycle,
        matieres_dominantes: values.matieres_dominantes
          ? values.matieres_dominantes.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (isEditing && filiere) {
        await updateFiliere(token, filiere.id, body);
        toast.success('Filière modifiée.');
      } else {
        await createFiliere(token, body);
        toast.success('Filière créée.');
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la filière' : 'Nouvelle filière'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CODE_CHOICES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.value} — {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la filière</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : Scientifique" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un cycle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CYCLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="matieres_dominantes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matières dominantes</FormLabel>
                  <FormControl>
                    <Input placeholder="FR, MATH, PC" {...field} />
                  </FormControl>
                  <FormDescription>
                    Codes des matières séparés par des virgules (ex: FR, MATH, PC, SVT, ANG)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Enregistrement...'
                  : isEditing
                  ? 'Modifier'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
