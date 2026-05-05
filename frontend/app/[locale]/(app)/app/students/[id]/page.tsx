'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { AlertCircle, Calendar, CreditCard, Gavel, Star, UserPlus } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
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
import { getAttendances, getStudentGrades, type AttendanceItem, type GradeItem } from '@/lib/api/pedagogy';
import { getStudentHistory, getStudent, type StudentHistory, type StudentItem, updateStudent, archiveStudent, reinscribeStudent } from '@/lib/api/students';
import { getStudentFinancialSummary, getStudentPayments, type PaymentItem, type StudentFinancialSummary } from '@/lib/api/finance';
import { PERMISSIONS, ROLES } from '@/lib/constants';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

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
type AttendanceViewMode = 'list' | 'calendar';

const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: '#22c55e',
  ABSENT: '#ef4444',
  LATE: '#eab308',
};

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
  const [attendancesLoading, setAttendancesLoading] = useState(false);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [attendanceView, setAttendanceView] = useState<AttendanceViewMode>('list');
  const [financeLoading, setFinanceLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [financeSummary, setFinanceSummary] = useState<StudentFinancialSummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<StudentHistory | null>(null);

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
    getStudentGrades(token, { eleve: id, periode: selectedPeriod })
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

  useEffect(() => {
    if (!token || !id) return;
    let mounted = true;
    setAttendancesLoading(true);
    getAttendances(token, { student: id, page_size: 200 })
      .then((response) => {
        if (!mounted) return;
        setAttendances(response.results);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Impossible de charger les présences.');
      })
      .finally(() => {
        if (mounted) setAttendancesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;
    let mounted = true;
    setFinanceLoading(true);

    Promise.all([
      getStudentPayments(token, id),
      getStudentFinancialSummary(token, id)
    ])
      .then(([paymentsRes, summaryRes]) => {
        if (!mounted) return;
        setPayments(paymentsRes.results);
        setFinanceSummary(summaryRes);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Impossible de charger les données financières.');
      })
      .finally(() => {
        if (mounted) setFinanceLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;
    let mounted = true;
    setHistoryLoading(true);
    getStudentHistory(token, id)
      .then((data) => {
        if (mounted) setHistory(data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Impossible de charger l'historique.");
      })
      .finally(() => {
        if (mounted) setHistoryLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, id]);

  const timelineEvents = useMemo(() => {
    if (!history && payments.length === 0) return [];
    const events: any[] = [];

    // Inscriptions
    history?.inscriptions.forEach((ins) => {
      events.push({
        date: ins.date_inscription,
        type: 'INSCRIPTION',
        title: ins.type_inscription === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription initiale',
        description: `Classe: ${ins.classe_name || '—'} (${ins.annee_scolaire_label || '—'})`,
        icon: 'UserPlus',
        color: 'blue',
      });
    });

    // Décisions fin d'année
    history?.decisions_fin_annee.forEach((dec) => {
      events.push({
        date: dec.date_decision,
        type: 'DECISION',
        title: `Décision: ${dec.decision_display}`,
        description: `Année: ${dec.annee_scolaire_label || '—'} - Moyenne: ${dec.moyenne_annuelle} - Mention: ${dec.mention_display}`,
        icon: 'Gavel',
        color: 'purple',
      });
    });

    // Notes validées
    history?.notes_validees.forEach((grade) => {
      events.push({
        date: grade.created_at,
        type: 'NOTE',
        title: `Note validée: ${grade.matiere_name}`,
        description: `Période: ${grade.periode} - Note: ${grade.note_convertie}/20`,
        icon: 'Star',
        color: 'orange',
      });
    });

    // Paiements
    payments.forEach((pay) => {
      events.push({
        date: pay.payment_date || pay.created_at || '',
        type: 'PAIEMENT',
        title: `Paiement reçu`,
        description: `${formatCurrency(pay.amount)} (${pay.method}) - Reçu: ${pay.receipt_number || '—'}`,
        icon: 'CreditCard',
        color: 'green',
      });
    });

    return events.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  }, [history, payments]);

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
        nom: values.last_name,
        prenom: values.first_name,
        lieu_naissance: values.birth_place || undefined,
        tuteur_nom: values.guardian_name,
        tuteur_telephone: values.guardian_phone,
        tuteur_email: values.guardian_email || undefined,
        observations: values.observations || undefined,
      } as any);
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

  const attendanceCounts = attendances.reduce(
    (acc, item) => {
      const status = item.status;
      if (status === 'PRESENT') acc.present += 1;
      if (status === 'ABSENT' || status === 'ABSENT_JUSTIFIED' || status === 'EXCLUDED') acc.absent += 1;
      if (status === 'LATE') acc.late += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  const totalAttendances = attendanceCounts.present + attendanceCounts.absent + attendanceCounts.late;
  const attendanceRate = totalAttendances > 0 ? (attendanceCounts.present / totalAttendances) * 100 : 0;

  const pieData = [
    { name: 'PRESENT', label: 'Présent', value: attendanceCounts.present },
    { name: 'ABSENT', label: 'Absent', value: attendanceCounts.absent },
    { name: 'LATE', label: 'Retard', value: attendanceCounts.late },
  ].filter((item) => item.value > 0);

  const attendancesByDate = [...attendances].sort((a, b) => b.date.localeCompare(a.date));

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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Suivi des présences</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={attendanceView === 'list' ? 'default' : 'outline'}
                      onClick={() => setAttendanceView('list')}
                    >
                      Vue liste
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={attendanceView === 'calendar' ? 'default' : 'outline'}
                      onClick={() => setAttendanceView('calendar')}
                    >
                      Vue calendrier
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Taux d'assiduité global</p>
                      <p className="text-lg font-semibold">{attendanceRate.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Absences</p>
                      <p className="text-lg font-semibold text-destructive">{attendanceCounts.absent}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Retards</p>
                      <p className="text-lg font-semibold text-amber-600">{attendanceCounts.late}</p>
                    </div>
                  </div>

                  {attendancesLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement des présences...</p>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-lg border p-3">
                        {attendanceView === 'list' ? (
                          attendancesByDate.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune présence enregistrée.</p>
                          ) : (
                            <div className="space-y-2">
                              {attendancesByDate.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                  <p className="text-sm">{item.date}</p>
                                  <StatusBadge status={item.status} />
                                </div>
                              ))}
                            </div>
                          )
                        ) : attendancesByDate.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune présence enregistrée.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {attendancesByDate.map((item) => (
                              <div key={item.id} className="rounded-md border p-2">
                                <p className="text-xs text-muted-foreground">{item.date}</p>
                                <div className="mt-1">
                                  <StatusBadge status={item.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="mb-2 text-sm font-medium">Répartition des statuts</p>
                        {pieData.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune donnée pour le graphique.</p>
                        ) : (
                          <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  dataKey="value"
                                  nameKey="label"
                                  innerRadius={55}
                                  outerRadius={85}
                                  label={({ name, percent }) =>
                                    `${String(name ?? '')} ${Math.round(((percent as number) || 0) * 100)}%`
                                  }
                                  labelLine={false}
                                >
                                  {pieData.map((entry) => (
                                    <Cell
                                      key={entry.name}
                                      fill={ATTENDANCE_COLORS[entry.name] ?? '#94a3b8'}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="finances">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>État financier et paiements</CardTitle>
                  <PermissionGate permission={PERMISSIONS.FINANCE_EDIT} fallback={null}>
                    <Button onClick={() => router.push(`/${locale}/app/finance/payments/new?student=${id}`)}>
                      Enregistrer un paiement
                    </Button>
                  </PermissionGate>
                </CardHeader>
                <CardContent className="space-y-6">
                  {financeLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement des finances...</p>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Total dû (Année en cours)</p>
                          <p className="text-xl font-bold">{formatCurrency(financeSummary?.total_due || 0)}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Total payé</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(financeSummary?.total_paid || 0)}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">Solde restant</p>
                          <p className={`text-xl font-bold ${(financeSummary?.balance || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(financeSummary?.balance || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Historique des paiements</h4>
                        {payments.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                            Aucun paiement enregistré pour le moment.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/40">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">Date</th>
                                  <th className="px-3 py-2 text-left font-medium">Référence / Reçu</th>
                                  <th className="px-3 py-2 text-left font-medium">Méthode</th>
                                  <th className="px-3 py-2 text-right font-medium">Montant</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payments.map((p) => (
                                  <tr key={p.id} className="border-t">
                                    <td className="px-3 py-2">{formatDate(p.payment_date)}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {p.receipt_number || p.reference || '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                      <StatusBadge status={p.method} />
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold">
                                      {formatCurrency(p.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle>Fil d'actualité scolaire</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement de l'historique...</p>
                  ) : timelineEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
                  ) : (
                    <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-muted">
                      {timelineEvents.map((event, idx) => (
                        <div key={idx} className="relative pl-10">
                          <div
                            className={cn(
                              "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background ring-4 ring-background",
                              event.color === 'blue' && "text-blue-600",
                              event.color === 'green' && "text-green-600",
                              event.color === 'purple' && "text-purple-600",
                              event.color === 'orange' && "text-orange-600"
                            )}
                          >
                            {event.icon === 'UserPlus' && <UserPlus className="h-4 w-4" />}
                            {event.icon === 'Gavel' && <Gavel className="h-4 w-4" />}
                            {event.icon === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                            {event.icon === 'Star' && <Star className="h-4 w-4" />}
                            {!['UserPlus', 'Gavel', 'CreditCard', 'Star'].includes(event.icon) && (
                              <div className="h-2 w-2 rounded-full bg-current" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold">{event.title}</h5>
                              <time className="text-xs text-muted-foreground">{formatDate(event.date)}</time>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
