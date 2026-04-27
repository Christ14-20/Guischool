'use client';

import { Check, Loader2, Save, Trash2, Upload, UserCheck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClasses, getSchoolYears, bulkCreateGrades, type ClassItem, type SchoolYearItem, type SubjectItem, getSubjects } from '@/lib/api/pedagogy';
import { getStudents, type StudentItem } from '@/lib/api/students';
import { PERMISSIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type GradeEntry = {
  student_id: string;
  matricule: string;
  full_name: string;
  score: string;
  comment: string;
};

const PERIODS = [
  { value: 'TRIMESTRE_1', label: 'Trimestre 1' },
  { value: 'TRIMESTRE_2', label: 'Trimestre 2' },
  { value: 'TRIMESTRE_3', label: 'Trimestre 3' },
  { value: 'SEMESTRE_1', label: 'Semestre 1' },
  { value: 'SEMESTRE_2', label: 'Semestre 2' },
];

const EVALUATION_TYPES = [
  { value: 'INTERROGATION', label: 'Interrogation' },
  { value: 'DEVOIR', label: 'Devoir' },
  { value: 'COMPOSITION', label: 'Composition' },
];

export default function GradesPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [classId, setClassId] = useState<string>(searchParams.get('classe') || '');
  const [yearId, setYearId] = useState<string>(searchParams.get('annee') || '');
  const [subjectId, setSubjectId] = useState<string>(searchParams.get('matiere') || '');
  const [period, setPeriod] = useState<string>(searchParams.get('periode') || 'TRIMESTRE_1');
  const [evalType, setEvalType] = useState<string>(searchParams.get('type') || 'INTERROGATION');
  const [maxScore, setMaxScore] = useState<string>('20');
  const [coef, setCoef] = useState<string>('1');

  const [entries, setEntries] = useState<Record<string, { score: string; comment: string }>>({});

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoadingFilters(true);

    Promise.all([getClasses(token), getSchoolYears(token), getSubjects(token)])
      .then(([classRes, yearRes, subjectRes]) => {
        if (!mounted) return;
        setClasses(classRes.results);
        setYears(yearRes.results);
        setSubjects(subjectRes.results);
        
        // Auto-select current year if not set
        if (!yearId && yearRes.results.length > 0) {
          const current = yearRes.results.find(y => y.is_current) || yearRes.results[0];
          setYearId(String(current.id));
        }
      })
      .catch((error) => {
        toast.error('Erreur lors du chargement des filtres.');
      })
      .finally(() => {
        if (mounted) setLoadingFilters(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !classId || classId === 'all') {
      setStudents([]);
      return;
    }

    let mounted = true;
    setLoadingStudents(true);
    getStudents(token, { classe: classId, page_size: 200 })
      .then((res) => {
        if (!mounted) return;
        setStudents(res.results);
        // Initialize entries
        const initial: Record<string, { score: string; comment: string }> = {};
        res.results.forEach(s => {
          initial[s.id] = { score: '', comment: '' };
        });
        setEntries(initial);
      })
      .catch(() => {
        toast.error('Erreur lors du chargement des élèves.');
      })
      .finally(() => {
        if (mounted) setLoadingStudents(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, classId]);

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, field: 'score' | 'comment') => {
    const currentIndex = students.findIndex(s => s.id === studentId);
    if (currentIndex === -1) return;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = students[currentIndex + 1];
      if (nextStudent) {
        const nextInput = document.querySelector(`input[data-student="${nextStudent.id}"][data-field="${field}"]`) as HTMLInputElement;
        nextInput?.focus();
        nextInput?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = students[currentIndex - 1];
      if (prevStudent) {
        const prevInput = document.querySelector(`input[data-student="${prevStudent.id}"][data-field="${field}"]`) as HTMLInputElement;
        prevInput?.focus();
        prevInput?.select();
      }
    }
  };

  const handleScoreChange = (studentId: string, value: string) => {
    const num = Number(value.replace(',', '.'));
    const max = Number(maxScore);
    
    if (value !== '' && (isNaN(num) || num < 0 || num > max)) {
      // Don't toast on every keystroke, but maybe show a visual error
    }

    setEntries(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: value }
    }));
  };

  const handleCommentChange = (studentId: string, value: string) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], comment: value }
    }));
  };

  const handleSave = async () => {
    if (!token || !classId || !subjectId || !yearId) {
      toast.error('Veuillez remplir tous les filtres obligatoires.');
      return;
    }

    const max = Number(maxScore);
    const validEntries = Object.entries(entries).filter(([_, data]) => data.score !== '');
    
    // Validation
    const invalid = validEntries.find(([_, data]) => {
      const num = Number(data.score.replace(',', '.'));
      return isNaN(num) || num < 0 || num > max;
    });

    if (invalid) {
      toast.error(`Certaines notes sont invalides (doivent être entre 0 et ${maxScore}).`);
      return;
    }

    const payload = validEntries.map(([studentId, data]) => ({
      eleve: studentId,
      matiere: Number(subjectId),
      annee_scolaire: Number(yearId),
      periode: period,
      type_note: evalType,
      note: Number(data.score.replace(',', '.')),
      note_sur: max,
      coefficient: Number(coef),
      appreciation: data.comment,
    }));

    if (payload.length === 0) {
      toast.info('Aucune note à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      await bulkCreateGrades(token, payload);
      toast.success(`${payload.length} note(s) enregistrée(s) avec succès.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<DataTableColumn<StudentItem>[]>(
    () => [
      {
        key: 'matricule',
        header: 'Matricule',
        className: 'w-32',
        accessor: (row) => <span className="text-xs font-mono">{row.matricule}</span>,
      },
      {
        key: 'nom',
        header: 'Élève',
        accessor: (row) => <span className="font-medium">{row.full_name}</span>,
      },
      {
        key: 'note',
        header: `Note / ${maxScore}`,
        className: 'w-32',
        accessor: (row) => {
          const score = entries[row.id]?.score || '';
          const num = Number(score.replace(',', '.'));
          const isInvalid = score !== '' && (isNaN(num) || num < 0 || num > Number(maxScore));
          
          return (
            <Input
              type="text"
              placeholder="0.00"
              data-student={row.id}
              data-field="score"
              className={cn(
                "h-8 w-24 text-center font-bold",
                isInvalid && "border-destructive text-destructive"
              )}
              value={score}
              onChange={(e) => handleScoreChange(row.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, row.id, 'score')}
            />
          );
        },
      },
      {
        key: 'commentaire',
        header: 'Appréciation',
        accessor: (row) => (
          <Input
            type="text"
            placeholder="Facultatif..."
            data-student={row.id}
            data-field="comment"
            className="h-8"
            value={entries[row.id]?.comment || ''}
            onChange={(e) => handleCommentChange(row.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, row.id, 'comment')}
          />
        ),
      },
    ],
    [entries, maxScore, students]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saisie des notes"
        description="Enregistrez les résultats des évaluations par classe et par matière."
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Filtres de session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Année Scolaire</label>
              <Select value={yearId} onValueChange={(val) => setYearId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Classe</label>
              <Select value={classId} onValueChange={(val) => setClassId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Matière</label>
              <Select value={subjectId} onValueChange={(val) => setSubjectId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Période</label>
              <Select value={period} onValueChange={(val) => setPeriod(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Barème (/)</label>
                  <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="h-8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Coef.</label>
                  <Input type="number" value={coef} onChange={(e) => setCoef(e.target.value)} className="h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Type d'évaluation</label>
                <Select value={evalType} onValueChange={(val) => setEvalType(val ?? '')}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVALUATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Liste des élèves</CardTitle>
            <div className="flex gap-2">
               <PermissionGate permission={PERMISSIONS.GRADE_CREATE}>
                  <Button variant="outline" onClick={() => router.push(`${pathname}/bulk`)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button onClick={handleSave} disabled={saving || students.length === 0}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Enregistrer tout
                  </Button>
               </PermissionGate>
            </div>
          </CardHeader>
          <CardContent>
            {classId && classId !== 'all' ? (
              <DataTable
                columns={columns}
                data={students}
                rowKey={(row) => row.id}
                loading={loadingStudents}
                pageSize={200} // Large enough for a class
                searchPlaceholder="Rechercher un élève..."
                emptyTitle="Aucun élève"
                emptyDescription="Cette classe ne contient aucun élève actif."
              />
            ) : (
              <div className="py-20 text-center space-y-2">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Sélectionnez une classe pour commencer la saisie.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M23 7a4 4 0 0 0-4-4" />
    </svg>
  );
}
