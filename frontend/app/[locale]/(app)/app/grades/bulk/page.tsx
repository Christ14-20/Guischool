'use client';

import { ArrowLeft, Download, FileSpreadsheet, Loader2, Save, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Papa from 'papaparse';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getClasses,
  getSchoolYears,
  getSubjects,
  bulkCreateGrades,
  getGradeTemplate,
  type ClassItem,
  type SchoolYearItem,
  type SubjectItem,
} from '@/lib/api/pedagogy';
import { PERMISSIONS } from '@/lib/constants';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ParsedRow = {
  matricule: string;
  nom_complet: string;
  note: string;
  appreciation: string;
  error?: string;
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

export default function GradesBulkPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [classId, setClassId] = useState('');
  const [yearId, setYearId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState('TRIMESTRE_1');
  const [evalType, setEvalType] = useState('INTERROGATION');
  const [maxScore, setMaxScore] = useState('20');
  const [coef, setCoef] = useState('1');

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([getClasses(token), getSchoolYears(token), getSubjects(token)])
      .then(([classRes, yearRes, subjectRes]) => {
        setClasses(classRes.results);
        setYears(yearRes.results);
        setSubjects(subjectRes.results);
        if (yearRes.results.length > 0) {
          const current = yearRes.results.find((y) => y.is_current) || yearRes.results[0];
          setYearId(String(current.id));
        }
      })
      .catch(() => toast.error('Erreur chargement filtres.'));
  }, [token]);

  const handleDownloadTemplate = async () => {
    if (!classId) {
      toast.error('Sélectionnez d\'abord une classe.');
      return;
    }
    setIsDownloadingTemplate(true);
    try {
      const blob = await getGradeTemplate(token, classId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modele_notes_classe_${classId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Échec du téléchargement du modèle.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedRow[] = (results.data as any[]).map((r) => ({
          matricule: String(r.matricule || '').trim(),
          nom_complet: String(r.nom_complet || '').trim(),
          note: String(r.note || '').trim(),
          appreciation: String(r.appreciation || '').trim(),
        }));

        // Validation basique
        const max = Number(maxScore);
        parsed.forEach((r) => {
          if (!r.matricule) r.error = 'Matricule manquant';
          const n = Number(r.note.replace(',', '.'));
          if (r.note && (isNaN(n) || n < 0 || n > max)) {
            r.error = `Note invalide (max ${max})`;
          }
        });

        setRows(parsed);
        setIsParsing(false);
        toast.info(`${parsed.length} lignes chargées.`);
      },
      error: () => {
        toast.error('Erreur lors de la lecture du CSV.');
        setIsParsing(false);
      },
    });
  };
  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    toast.info('Ligne supprimée.');
  };

  const handleImport = async () => {
    if (!token || !yearId || !subjectId || rows.length === 0) {
      toast.error('Veuillez remplir les informations manquantes.');
      return;
    }

    const hasErrors = rows.some((r) => r.error);
    if (hasErrors) {
      toast.error('Veuillez corriger les erreurs dans le fichier avant d\'importer.');
      return;
    }

    const payload = rows
      .filter((r) => r.note !== '')
      .map((r) => ({
        eleve_matricule: r.matricule, // On va laisser le backend mapper ou on le fait ici
        matiere: Number(subjectId),
        annee_scolaire: Number(yearId),
        periode: period,
        type_note: evalType,
        note: Number(r.note.replace(',', '.')),
        note_sur: Number(maxScore),
        coefficient: Number(coef),
        appreciation: r.appreciation,
      }));

    // Note: Le GradeSerializer attend 'eleve' (ID). 
    // On devrait peut-être adapter le backend pour accepter 'eleve_matricule' 
    // ou faire une recherche ici. Pour simplifier GRADES-01 utilisait l'ID.
    // Mettons à jour le backend bulk_create pour chercher par matricule si ID absent.

    setIsSaving(true);
    try {
      await bulkCreateGrades(token, payload);
      toast.success('Importation réussie.');
      router.push('/app/grades');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Échec de l\'importation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/app/grades" className="flex items-center hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour à la saisie
        </Link>
      </div>

      <PageHeader
        title="Importation en masse (CSV)"
        description="Chargez un fichier CSV pour importer les notes d'une classe entière."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Configuration & Modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Année</label>
              <Select value={yearId} onValueChange={(val) => setYearId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.id} value={String(y.id)}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Classe</label>
              <Select value={classId} onValueChange={(val) => setClassId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">Matière</label>
              <Select value={subjectId} onValueChange={(val) => setSubjectId(val ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Barème</label>
                <Input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} />
               </div>
               <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Coef.</label>
                <Input type="number" value={coef} onChange={e => setCoef(e.target.value)} />
               </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              disabled={!classId || isDownloadingTemplate}
              onClick={handleDownloadTemplate}
            >
              {isDownloadingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Télécharger le modèle CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">2. Chargement & Aperçu</CardTitle>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Choisir un fichier
              </Button>
              <PermissionGate permission={PERMISSIONS.GRADE_CREATE}>
                <Button size="sm" disabled={rows.length === 0 || isSaving} onClick={handleImport}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Valider l'import
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent>
            {isParsing ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p>Analyse du fichier en cours...</p>
              </div>
            ) : rows.length > 0 ? (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead className="text-center w-24">Note</TableHead>
                      <TableHead>Appréciation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className={cn(row.error && "bg-destructive/5")}>
                        <TableCell className="font-mono text-xs">{row.matricule}</TableCell>
                        <TableCell className="font-medium text-xs">{row.nom_complet}</TableCell>
                        <TableCell className="text-center font-bold">{row.note}</TableCell>
                        <TableCell className="text-xs italic text-muted-foreground">{row.appreciation}</TableCell>
                        <TableCell>
                          {row.error ? (
                            <span className="text-[10px] font-bold uppercase text-destructive">{row.error}</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-green-600 italic">OK</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl text-muted-foreground opacity-50">
                <FileSpreadsheet className="h-12 w-12" />
                <p>Aucun fichier chargé</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
