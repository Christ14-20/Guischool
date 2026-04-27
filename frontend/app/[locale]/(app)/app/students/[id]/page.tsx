'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRole } from '@/hooks/useRole';
import { getStudentGrades, type GradeItem } from '@/lib/api/pedagogy';
import { archiveStudent, getStudent, reinscribeStudent, type StudentItem, updateStudent } from '@/lib/api/students';
import { PERMISSIONS, ROLES } from '@/lib/constants';

const editSchema = z.object({
  last_name: z.string().min(1, 'Le nom est requis.'),
  first_name: z.string().min(1, 'Le prénom est requis.'),
  birth_place: z.string().optional(),
  guardian_name: z.string().min(1, 'Le nom du tuteur est requis.'),
  guardian_phone: z.string().min(1, 'Le téléphone du tuteur est requis.'),
  guardian_email: z.string().email('Email invalide.').optional().or(z.literal('')),
  observations: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

function getInitials(student?: StudentItem | null) {
  if (!student) return 'EL';
  return `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase() || 'EL';
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const id = String(params?.id ?? '');
  const locale = String(params?.locale ?? 'fr');

  const [student, setStudent] = useState<StudentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('TRIMESTRE_1');
  const [gradesLoading, setGradesLoading] = useState(false);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const canEditProfile = useRole([ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE]);
  const isAdminSchool = useRole([ROLES.ADMIN_SCHOOL]);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      last_name: '',
      first_name: '',
      birth_place: '',
      guardian_name: '',
      guardian_phone: '',
      guardian_email: '',
      observations: '',
    },
  });

  const loadStudent = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const data = await getStudent(token, id);
      setStudent(data);
      form.reset({
        last_name: data.last_name || '',
        first_name: data.first_name || '',
        birth_place: data.birth_place || '',
        guardian_name: data.guardian_name || '',
        guardian_phone: data.guardian_phone || '',
        guardian_email: data.guardian_email || '',
        observations: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger la fiche élève.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;
    let mounted = true;
    setGradesLoading(true);
    getStudentGrades(token, { etudiant: id, periode: selectedPeriod })
      .then((data) => {
        if (!mounted) return;
        setGrades(data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Impossible de charger les notes.');
      })
      .finally(() => {
        if (mounted) setGradesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, id, selectedPeriod]);

  const profileRows = useMemo(
    () => [
      { label: 'Matricule', value: student?.matricule || '—' },
      { label: 'Nom', value: student?.last_name || '—' },
      { label: 'Prénom(s)', value: student?.first_name || '—' },
      { label: 'Date de naissance', value: student?.birth_date || '—' },
      { label: 'Lieu de naissance', value: student?.birth_place || '—' },
      { label: 'Sexe', value: student?.gender || '—' },
      { label: 'Classe', value: student?.classe_name || '—' },
      { label: 'Tuteur', value: student?.guardian_name || '—' },
      { label: 'Téléphone tuteur', value: student?.guardian_phone || '—' },
      { label: 'Email tuteur', value: student?.guardian_email || '—' },
    ],
    [student]
  );

  const onSaveEdit = async (values: EditValues) => {
    if (!token || !student) return;
    try {
      await updateStudent(token, student.id, {
        last_name: values.last_name,
        first_name: values.first_name,
        birth_place: values.birth_place || undefined,
        guardian_name: values.guardian_name,
        guardian_phone: values.guardian_phone,
        guardian_email: values.guardian_email || undefined,
        observations: values.observations || undefined,
      });
      toast.success('Profil élève mis à jour.');
      setEditOpen(false);
      await loadStudent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification.');
    }
  };

  const onArchive = async () => {
    if (!token || !student) return;
    await archiveStudent(token, student.id);
    toast.success('Élève archivé.');
    await loadStudent();
  };

  const onReinscribe = async () => {
    if (!token || !student?.classe) {
      toast.error('Réinscription impossible: classe actuelle introuvable.');
      return;
    }
    await reinscribeStudent(token, student.id, {
      school_year: new Date().getFullYear(),
      classe: student.classe,
    });
    toast.success('Réinscription lancée.');
  };

  const totalCoefficient = grades.reduce((sum, grade) => sum + (grade.coefficient || 0), 0);
  const totalWeighted = grades.reduce((sum, grade) => sum + (grade.weighted_score || 0), 0);
  const average = totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0;

  const mention = average >= 16 ? 'Excellent' : average >= 12 ? 'Passable' : 'Insuffisant';
  const mentionTone = average >= 16 ? 'success' : average >= 12 ? 'warning' : 'danger';

  return (
    <section className="space-y-4">
      <PageHeader
        title="Fiche élève"
        description="Profil, parcours et opérations sur l'élève."
        actions={
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/app/students`)}>
            Retour à la liste
          </Button>
        }
      />

      {loading || !student ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Chargement de la fiche...</div>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  {student.photo_url ? <AvatarImage src={student.photo_url} alt={student.full_name} /> : null}
                  <AvatarFallback>{getInitials(student)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-semibold">{student.full_name || `${student.last_name} ${student.first_name}`}</p>
                  <p className="text-sm text-muted-foreground">
                    Matricule: {student.matricule || '—'} · Classe: {student.classe_name || '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={student.status} className="uppercase" />

                {canEditProfile ? (
                  <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                    Modifier
                  </Button>
                ) : null}

                {isAdminSchool ? (
                  <>
                    <ConfirmDialog
                      title="Archiver cet élève"
                      description="Confirmez l'archivage de cet élève."
                      variant="destructive"
                      trigger={<Button variant="destructive">Archiver</Button>}
                      onConfirm={onArchive}
                    />
                    <ConfirmDialog
                      title="Réinscrire cet élève"
                      description="Confirmez la réinscription pour la prochaine année."
                      trigger={<Button>Réinscrire</Button>}
                      onConfirm={onReinscribe}
                    />
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="profil">
            <TabsList variant="line">
              <TabsTrigger value="profil">Profil</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="presences">Présences</TabsTrigger>
              <TabsTrigger value="finances">Finances</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="profil">
              <Card>
                <CardHeader>
                  <CardTitle>Informations personnelles et tuteur</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {profileRows.map((row) => (
                    <div key={row.label} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-medium">{row.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Résultats scolaires</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Période</span>
                    <select
                      value={selectedPeriod}
                      onChange={(event) => setSelectedPeriod(event.target.value)}
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                    >
                      <option value="TRIMESTRE_1">Trimestre 1</option>
                      <option value="TRIMESTRE_2">Trimestre 2</option>
                      <option value="TRIMESTRE_3">Trimestre 3</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gradesLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement des notes...</p>
                  ) : grades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune note disponible pour cette période.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-[780px] text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Matière</th>
                            <th className="px-3 py-2 text-left font-medium">Note</th>
                            <th className="px-3 py-2 text-left font-medium">Coefficient</th>
                            <th className="px-3 py-2 text-left font-medium">Note /20</th>
                            <th className="px-3 py-2 text-left font-medium">Note pondérée</th>
                            <th className="px-3 py-2 text-left font-medium">Commentaire</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map((grade) => (
                            <tr key={String(grade.id)} className="border-t">
                              <td className="px-3 py-2">{grade.subject_name}</td>
                              <td className="px-3 py-2">
                                {grade.score}/{grade.max_score}
                              </td>
                              <td className="px-3 py-2">{grade.coefficient}</td>
                              <td
                                className={`px-3 py-2 font-medium ${
                                  grade.converted_score_20 < 10 ? 'text-destructive' : ''
                                }`}
                              >
                                {grade.converted_score_20.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">{grade.weighted_score.toFixed(2)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{grade.comment || '—'}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-muted/30">
                            <td className="px-3 py-2 font-semibold" colSpan={4}>
                              Moyenne générale
                            </td>
                            <td className="px-3 py-2 font-semibold">{average.toFixed(2)} / 20</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={mention} variant={mentionTone} />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="presences">
              <Card>
                <CardContent className="py-2 text-sm text-muted-foreground">
                  Onglet Présences en cours d'implémentation (`STUDENTS-05`).
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="finances">
              <Card>
                <CardContent className="py-2 text-sm text-muted-foreground">
                  Onglet Finances en cours d'implémentation (`STUDENTS-06`).
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historique">
              <Card>
                <CardContent className="py-2 text-sm text-muted-foreground">
                  Onglet Historique en cours d'implémentation (`STUDENTS-07`).
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <PermissionGate permission={PERMISSIONS.STUDENT_EDIT} fallback={null}>
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetContent side="right" className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Modifier le profil élève</SheetTitle>
              <SheetDescription>
                Mise à jour des informations de base et du tuteur.
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSaveEdit)} className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom(s)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="birth_place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu de naissance</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guardian_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom tuteur</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="guardian_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone tuteur</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardian_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email tuteur</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observations</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SheetFooter className="px-0">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </PermissionGate>
    </section>
  );
}
