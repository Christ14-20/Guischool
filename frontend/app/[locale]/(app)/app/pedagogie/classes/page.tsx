'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LayoutGrid, List } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ClassItem,
  type LevelItem,
  type SchoolYearItem,
  createClass,
  createLevel,
  deleteClass,
  getClasses,
  getLevels,
  getSchoolYears,
  updateClass,
} from '@/lib/api/pedagogy';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  school_year: z.string().min(1, 'L\'année scolaire est requise.'),
  level: z.string().min(1, 'Le niveau est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité doit être au moins 1.'),
  room: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type ViewMode = 'grid' | 'list';
type DialogMode = { type: 'create' } | { type: 'edit'; classe: ClassItem };

const CYCLE_LABELS: Record<string, string> = {
  PRIMAIRE: 'Primaire',
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
  SUPERIEUR: 'Supérieur',
};

export default function ClassesPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  const token = session?.accessToken ?? '';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    Promise.all([
      getClasses(token),
      getSchoolYears(token),
      getLevels(token),
    ])
      .then(([classRes, yearRes, levelRes]) => {
        if (!mounted) return;
        setClasses(classRes.results);
        setYears(yearRes.results);
        setLevels(levelRes.results);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur de chargement.'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const levelsByCycle = levels.reduce<Record<string, LevelItem[]>>((acc, l) => {
    acc[l.cycle] = [...(acc[l.cycle] ?? []), l];
    return acc;
  }, {});

  const filteredClasses =
    cycleFilter === 'all'
      ? classes
      : classes.filter((c) => {
          const level = levels.find((l) => l.id === c.level);
          return level?.cycle === cycleFilter;
        });

  const handleDelete = async (classe: ClassItem) => {
    try {
      await deleteClass(token, classe.id);
      toast.success(`Classe "${classe.name}" archivée.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const handleInitDefaultLevels = async () => {
    if (!token) return;

    const presets = [
      { cycle: 'PRIMAIRE', name: 'CP1', order_index: 1 },
      { cycle: 'PRIMAIRE', name: 'CP2', order_index: 2 },
      { cycle: 'PRIMAIRE', name: 'CE1', order_index: 3 },
      { cycle: 'PRIMAIRE', name: 'CE2', order_index: 4 },
      { cycle: 'PRIMAIRE', name: 'CM1', order_index: 5 },
      { cycle: 'PRIMAIRE', name: 'CM2', order_index: 6 },
      { cycle: 'COLLEGE', name: '7e', order_index: 1 },
      { cycle: 'COLLEGE', name: '8e', order_index: 2 },
      { cycle: 'COLLEGE', name: '9e', order_index: 3 },
      { cycle: 'COLLEGE', name: '10e', order_index: 4 },
      { cycle: 'LYCEE', name: '11e', order_index: 1 },
      { cycle: 'LYCEE', name: '12e', order_index: 2 },
      { cycle: 'LYCEE', name: 'Terminale', order_index: 3 },
    ] as const;

    try {
      await Promise.all(
        presets.map((item) =>
          createLevel(token, {
            cycle: item.cycle,
            name: item.name,
            order_index: item.order_index,
          })
        )
      );
      toast.success('Niveaux par défaut initialisés.');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible d\'initialiser les niveaux.');
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Classes"
        description="Gérez les classes de l'établissement."
        actions={
          <Button onClick={() => setDialogMode({ type: 'create' })}>Nouvelle classe</Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Select value={cycleFilter} onValueChange={(v) => setCycleFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les cycles</SelectItem>
            <SelectItem value="PRIMAIRE">Primaire</SelectItem>
            <SelectItem value="COLLEGE">Collège</SelectItem>
            <SelectItem value="LYCEE">Lycée</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center rounded-lg border bg-background p-1">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('grid')}
            aria-label="Vue grille"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={() => setViewMode('list')}
            aria-label="Vue liste"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!loading && levels.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-2 font-medium">Aucun niveau n'est disponible.</p>
          <p className="mb-3 text-amber-800">
            Initialisez les niveaux de base pour pouvoir sélectionner un niveau lors de la création d'une classe.
          </p>
          <Button type="button" onClick={handleInitDefaultLevels}>
            Initialiser les niveaux par défaut
          </Button>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : filteredClasses.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Aucune classe trouvée.</p>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClasses.map((c) => {
            const isOverloaded = c.current_count > c.capacity;
            const level = levels.find((l) => l.id === c.level);
            return (
              <Card key={c.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {isOverloaded && (
                      <Badge variant="destructive" className="text-xs">Surcharge</Badge>
                    )}
                  </div>
                  {level && (
                    <p className="text-xs text-muted-foreground">
                      {level.name} — {CYCLE_LABELS[level.cycle] ?? level.cycle}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Effectif</span>
                    <span className={isOverloaded ? 'font-semibold text-destructive' : ''}>
                      {c.current_count} / {c.capacity}
                    </span>
                  </div>
                  {c.room && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Salle</span>
                      <span>{c.room}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogMode({ type: 'edit', classe: c })}>
                      Modifier
                    </Button>
                    <ConfirmDialog
                      title="Archiver la classe"
                      description={`Confirmer l'archivage de la classe "${c.name}" ?`}
                      variant="destructive"
                      trigger={<Button variant="destructive" size="sm">Archiver</Button>}
                      confirmLabel="Archiver"
                      loadingLabel="Archivage..."
                      onConfirm={() => handleDelete(c)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Niveau / Cycle</TableHead>
                <TableHead>Effectif / Max</TableHead>
                <TableHead>Salle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((c) => {
                const isOverloaded = c.current_count > c.capacity;
                const level = levels.find((l) => l.id === c.level);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {level ? `${level.name} / ${CYCLE_LABELS[level.cycle] ?? level.cycle}` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={isOverloaded ? 'font-semibold text-destructive' : ''}>
                        {c.current_count} / {c.capacity}
                        {isOverloaded && (
                          <Badge variant="destructive" className="ml-2 text-xs">Surcharge</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{c.room || '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDialogMode({ type: 'edit', classe: c })}>
                          Modifier
                        </Button>
                        <ConfirmDialog
                          title="Archiver la classe"
                          description={`Confirmer l'archivage de la classe "${c.name}" ?`}
                          variant="destructive"
                          trigger={<Button variant="destructive" size="sm">Archiver</Button>}
                          confirmLabel="Archiver"
                          loadingLabel="Archivage..."
                          onConfirm={() => handleDelete(c)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogMode && (
        <ClassFormDialog
          mode={dialogMode}
          token={token}
          years={years}
          levels={levels}
          onClose={() => setDialogMode(null)}
          onSuccess={() => { setDialogMode(null); refresh(); }}
        />
      )}
    </section>
  );
}

// ─── ClassFormDialog ─────────────────────────────────────────────────────────

function ClassFormDialog({
  mode,
  token,
  years,
  levels,
  onClose,
  onSuccess,
}: {
  mode: DialogMode;
  token: string;
  years: SchoolYearItem[];
  levels: LevelItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = mode.type === 'edit';
  const classe = isEditing ? mode.classe : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: classe?.name ?? '',
      school_year: classe?.school_year ? String(classe.school_year) : '',
      level: classe?.level ? String(classe.level) : '',
      capacity: classe?.capacity ?? 40,
      room: classe?.room ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const body = {
        name: values.name,
        school_year: Number(values.school_year),
        level: Number(values.level),
        capacity: values.capacity,
        room: values.room ?? '',
      };
      if (isEditing && classe) {
        await updateClass(token, classe.id, body);
        toast.success('Classe modifiée.');
      } else {
        await createClass(token, body);
        toast.success('Classe créée.');
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const CYCLES = ['PRIMAIRE', 'COLLEGE', 'LYCEE', 'SUPERIEUR'] as const;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la classe' : 'Nouvelle classe'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la classe</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : 6ème A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Année scolaire</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une année" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y.id} value={String(y.id)}>
                          {y.label}
                          {y.is_current ? ' (courante)' : ''}
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
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niveau</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un niveau" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CYCLES.map((cycle) => {
                        const cycleItems = levels.filter((l) => l.cycle === cycle);
                        if (cycleItems.length === 0) return null;
                        return (
                          <div key={cycle}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {CYCLE_LABELS[cycle]}
                            </div>
                            {cycleItems.map((l) => (
                              <SelectItem key={l.id} value={String(l.id)}>
                                {l.name}
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité max</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salle (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Salle A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
