'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
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
  type ClassSubjectItem,
  type ClassItem,
  type SubjectItem,
  type TeacherItem,
  createClassSubject,
  deleteClassSubject,
  getClassSubjects,
  getClasses,
  getSubjects,
  getTeachers,
  updateClassSubject,
} from '@/lib/api/pedagogy';

const schema = z.object({
  classe: z.string().min(1, 'La classe est requise.'),
  subject: z.string().min(1, 'La matière est requise.'),
  coefficient: z.string().min(1, 'Le coefficient est requis.'),
  weekly_hours: z.string().optional(),
  teacher: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type DialogMode = { type: 'create' } | { type: 'edit'; item: ClassSubjectItem };

export default function ClassSubjectsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const [items, setItems] = useState<ClassSubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [classeFilter, setClasseFilter] = useState('');
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { classe: '', subject: '', coefficient: '1', weekly_hours: '', teacher: '' },
  });

  const load = () => {
    if (!token) return;
    Promise.all([
      getClassSubjects(token, classeFilter ? { classe: classeFilter } : undefined),
      getClasses(token),
      getSubjects(token),
      getTeachers(token),
    ])
      .then(([itemRes, classRes, subjectRes, teacherRes]) => {
        setItems(itemRes.results);
        setClasses(classRes.results);
        setSubjects(subjectRes.results);
        setTeachers(teacherRes.results);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erreur de chargement.'));
  };

  useEffect(() => { load(); }, [token, classeFilter]);

  const columns = useMemo<DataTableColumn<ClassSubjectItem>[]>(
    () => [
      { key: 'classe_name', header: 'Classe', accessor: (row) => row.classe_name },
      { key: 'subject_name', header: 'Matière', accessor: (row) => row.subject_name },
      { key: 'coefficient', header: 'Coeff.', accessor: (row) => row.coefficient },
      { key: 'weekly_hours', header: 'H/sem', accessor: (row) => row.weekly_hours ?? '-' },
      {
        key: 'teacher_name', header: 'Enseignant',
        accessor: (row) => row.teacher_name ?? '-',
      },
      {
        key: 'actions', header: '',
        accessor: (row) => (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Modifier</Button>
            <ConfirmDialog
              title="Supprimer"
              description={`Supprimer ${row.subject_name} de ${row.classe_name} ?`}
              variant="destructive"
              trigger={<Button size="sm" variant="destructive">×</Button>}
              confirmLabel="Supprimer"
              onConfirm={() => handleDelete(row)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const openEdit = (item: ClassSubjectItem) => {
    form.reset({
      classe: String(item.classe),
      subject: String(item.subject),
      coefficient: String(item.coefficient),
      weekly_hours: String(item.weekly_hours || ''),
      teacher: item.teacher ? String(item.teacher) : '',
    });
    setDialogMode({ type: 'edit', item });
  };

  const handleDelete = async (item: ClassSubjectItem) => {
    try {
      await deleteClassSubject(token, item.id);
      toast.success('Association supprimée.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!token) { toast.error('Session invalide.'); return; }
    try {
      const body: Record<string, unknown> = {
        classe: Number(values.classe),
        subject: Number(values.subject),
        coefficient: Number(values.coefficient),
      };
      if (values.weekly_hours) body.weekly_hours = Number(values.weekly_hours);
      if (values.teacher) body.teacher = Number(values.teacher);

      if (dialogMode?.type === 'edit') {
        await updateClassSubject(token, dialogMode.item.id, body);
        toast.success('Association modifiée.');
      } else {
        await createClassSubject(token, body);
        toast.success('Association créée.');
      }
      setDialogMode(null);
      form.reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Matières par classe"
        description="Associez les matières aux classes avec coefficient et enseignant."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Select value={classeFilter} onValueChange={(v) => setClasseFilter(v ?? '')}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrer par classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { form.reset(); setDialogMode({ type: 'create' }); }}>
          + Ajouter
        </Button>
      </div>

      <DataTable columns={columns} data={items} rowKey={(item) => String(item.id)} />

      {dialogMode && (
        <Dialog open onOpenChange={(open) => !open && (setDialogMode(null), form.reset())}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {dialogMode.type === 'edit' ? 'Modifier l\'association' : 'Nouvelle association'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="classe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matière *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="coefficient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coefficient *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weekly_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>H/sem</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="Optionnel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="teacher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enseignant</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v ?? '')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Optionnel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Aucun</SelectItem>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.last_name} {t.first_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogMode(null); form.reset(); }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enregistrement...' : dialogMode.type === 'edit' ? 'Modifier' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
