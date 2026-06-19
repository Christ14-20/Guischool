'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Baby, BookOpen, GraduationCap, School } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
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
import { getLevels, createLevel, updateLevel, deleteLevel, LevelItem } from '@/lib/api/pedagogy';

const schema = z.object({
  cycle: z.string().min(1, 'Le cycle est requis.'),
  name: z.string().min(1, 'Le nom est requis.'),
  code_officiel_minedu: z.string().optional(),
  age_min: z.coerce.number().optional(),
  age_max: z.coerce.number().optional(),
  diplome_final: z.string().optional(),
  duree_annees: z.coerce.number().default(1),
  evaluation_type: z.enum(['NUMERIC', 'DESCRIPTIVE']).default('NUMERIC'),
  order_index: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof schema>;

const CYCLE_CHOICES = [
  { value: 'MATERNELLE', label: 'Maternelle', icon: Baby },
  { value: 'PRIMAIRE', label: 'Primaire', icon: BookOpen },
  { value: 'CQP', label: 'CQP (BEP/CAP)', icon: GraduationCap },
  { value: 'COLLEGE', label: 'Collège', icon: School },
  { value: 'LYCEE_GEN', label: 'Lycée Général', icon: GraduationCap },
  { value: 'LYCEE_TECH', label: 'Lycée Technique', icon: GraduationCap },
  { value: 'ETFP_A', label: 'ETFP A', icon: BookOpen },
  { value: 'ETFP_B', label: 'ETFP B', icon: BookOpen },
] as const;

const EVAL_TYPE_LABELS = {
  NUMERIC: 'Numérique',
  DESCRIPTIVE: 'Descriptive',
};

export default function LevelsPage() {
  const { data: session } = useSession();
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = session?.accessToken ?? '';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    getLevels(token)
      .then((res) => {
        if (!mounted) return;
        setLevels(res.results);
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

  const openCreateDialog = () => {
    setEditingLevel(null);
    setDialogOpen(true);
  };

  const openEditDialog = (level: LevelItem) => {
    setEditingLevel(level);
    setDialogOpen(true);
  };

  const handleDelete = async (level: LevelItem) => {
    if (!confirm(`Supprimer le niveau "${level.name}" ?`)) return;
    try {
      await deleteLevel(token, level.id);
      toast.success('Niveau supprimé.');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      cycle: '',
      name: '',
      code_officiel_minedu: '',
      age_min: undefined,
      age_max: undefined,
      diplome_final: '',
      duree_annees: 1,
      evaluation_type: 'NUMERIC',
      order_index: 0,
    },
  });

  useEffect(() => {
    if (editingLevel) {
      form.reset({
        cycle: editingLevel.cycle,
        name: editingLevel.name,
        code_officiel_minedu: editingLevel.code_officiel_minedu ?? '',
        age_min: editingLevel.age_min,
        age_max: editingLevel.age_max,
        diplome_final: editingLevel.diplome_final ?? '',
        duree_annees: editingLevel.duree_annees ?? 1,
        evaluation_type: editingLevel.evaluation_type ?? 'NUMERIC',
        order_index: editingLevel.order_index,
      });
    }
  }, [editingLevel, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const body = {
        cycle: values.cycle,
        name: values.name,
        code_officiel_minedu: values.code_officiel_minedu,
        age_min: values.age_min,
        age_max: values.age_max,
        diplome_final: values.diplome_final,
        duree_annees: values.duree_annees,
        evaluation_type: values.evaluation_type,
        order_index: values.order_index,
      };
      if (editingLevel) {
        await updateLevel(token, editingLevel.id, body);
        toast.success('Niveau modifié.');
      } else {
        await createLevel(token, body);
        toast.success('Niveau créé.');
      }
      setDialogOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Niveaux éducatifs"
        description="Catalogue complet des niveaux du système éducatif guinéen."
        actions={
          <Button onClick={openCreateDialog}>Nouveau niveau</Button>
        }
      />

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : (
        <div className="space-y-6">
          {CYCLE_CHOICES.map(({ value: cycle, label, icon: Icon }) => {
            const cycleLevels = levelsByCycle[cycle] ?? [];
            if (cycleLevels.length === 0) return null;

            return (
              <div key={cycle}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{label}</h2>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Code MINEDU</TableHead>
                        <TableHead>Âge</TableHead>
                        <TableHead>Diplôme</TableHead>
                        <TableHead>Type éval.</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycleLevels.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name}</TableCell>
                          <TableCell>{l.code_officiel_minedu || '—'}</TableCell>
                          <TableCell>
                            {l.age_min && l.age_max ? `${l.age_min}-${l.age_max} ans` : '—'}
                          </TableCell>
                          <TableCell>{l.diplome_final || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={l.evaluation_type === 'DESCRIPTIVE' ? 'secondary' : 'default'}>
                              {EVAL_TYPE_LABELS[l.evaluation_type ?? 'NUMERIC']}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(l)}>
                              Modifier
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}

          {levels.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Aucun niveau configuré. Créez des niveaux pour commencer.
            </p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Modifier le niveau' : 'Nouveau niveau'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        {CYCLE_CHOICES.map(({ value, label }) => (
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du niveau</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex : 6ème A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code_officiel_minedu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code MINEDU (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex : 6EME" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Âge minimum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="6"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age_max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Âge maximum</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="12"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="diplome_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diplôme final (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex : CEPE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evaluation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'évaluation</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NUMERIC">Numérique</SelectItem>
                        <SelectItem value="DESCRIPTIVE">Descriptive (Maternelle)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d'affichage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? 'Enregistrement...'
                    : editingLevel
                    ? 'Modifier'
                    : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}