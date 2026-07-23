/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import {
  getEvaluations,
  getGrades,
  getStudentsByClass,
  getPeriods,
  createEvaluationAction,
  bulkSaveGradesAction,
  lockEvaluationAction,
  validateGradeAction,
} from "./actions";

interface Props {
  schoolYears: any[];
  classes: any[];
  subjects: any[];
  classSubjects: any[];
  role: string;
  userId: string;
}

const INPUT_CLASS =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors";

const EVAL_TYPES = [
  { value: "DS", label: "Devoir Surveillé" },
  { value: "CC", label: "Contrôle Continu" },
];

export default function GradeEntryClient({
  schoolYears,
  classes,
  subjects,
  classSubjects,
  role,
  userId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  const canLock = role === "DIRECTOR" || role === "STUDENT_STUDIES";
  const canValidate = role === "DIRECTOR";

  const [syId, setSyId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [evalType, setEvalType] = useState("DS");

  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [draftScores, setDraftScores] = useState<Record<string, { score: string; is_absent: boolean }>>({});

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEval, setNewEval] = useState({ title: "", max_score: "20", coefficient: "1", date: "" });

  const filteredClasses = useMemo(
    () => (syId ? classes.filter((c: any) => c.school_year === syId) : classes),
    [syId, classes]
  );

  const availableSubjects = useMemo(() => {
    if (!classId) return [];
    const csIds = classSubjects
      .filter((cs: any) => {
        if (cs.class_obj_id !== classId) return false;
        if (role === "TEACHER") return cs.teacher?.id === userId;
        return true;
      })
      .map((cs: any) => cs.subject?.id);
    return subjects.filter((s: any) => csIds.includes(s.id));
  }, [classId, classSubjects, subjects, role, userId]);

  const filteredPeriods = useMemo(
    () => periods,
    [periods]
  );

  const canLockEvaluation = useMemo(() => {
    if (!selectedEval || selectedEval.is_locked) return false;
    if (students.length === 0) return false;
    const allGraded = students.every((s: any) => {
      const grade = grades.find((g: any) => g.student?.id === s.id);
      if (grade) return true;
      if (draftScores[s.id]?.score || draftScores[s.id]?.is_absent) return true;
      return false;
    });
    return allGraded;
  }, [selectedEval, students, grades, draftScores]);

  const loadGradeData = useCallback(async (evaluation: any) => {
    setSelectedEval(evaluation);
    setShowCreateForm(false);
    setWarnings([]);

    const [gradeRes, studentRes] = await Promise.all([
      getGrades(evaluation.id),
      getStudentsByClass(evaluation.class_obj),
    ]);

    const loadedGrades = gradeRes.success ? gradeRes.data : [];
    const loadedStudents = studentRes.success ? studentRes.data : [];

    setGrades(loadedGrades);
    setStudents(loadedStudents);

    const scores: Record<string, { score: string; is_absent: boolean }> = {};
    for (const g of loadedGrades) {
      const sid = g.student?.id ?? g.student;
      scores[sid] = {
        score: g.is_absent ? "" : (g.score ?? ""),
        is_absent: g.is_absent ?? false,
      };
    }
    // init empty for students without grades
    for (const s of loadedStudents) {
      if (!scores[s.id]) {
        scores[s.id] = { score: "", is_absent: false };
      }
    }
    setDraftScores(scores);
  }, []);

  const handleFilterChange = useCallback(
    async (field: string, value: string) => {
      if (field === "sy_id") {
        setSyId(value);
        setPeriodId("");
        setPeriods([]);
        if (value) {
          const res = await getPeriods(value);
          if (res.success) {
            setPeriods(res.data);
          } else {
            setError(res.error || "Erreur de chargement des périodes.");
          }
        }
      }
      if (field === "class_id") setClassId(value);
      if (field === "subject_id") setSubjectId(value);
      if (field === "period_id") setPeriodId(value);
      if (field === "eval_type") setEvalType(value);

      setSelectedEval(null);
      setGrades([]);
      setStudents([]);
      setDraftScores({});
      setShowCreateForm(false);
      setWarnings([]);

      const resolvedClassId = field === "class_id" ? value : classId;
      const resolvedPeriodId = field === "period_id" ? value : periodId;
      const resolvedSubjectId = field === "subject_id" ? value : subjectId;
      const resolvedEvalType = field === "eval_type" ? value : evalType;

      if (resolvedClassId && resolvedPeriodId && resolvedSubjectId && resolvedEvalType) {
        const res = await getEvaluations(resolvedClassId, resolvedPeriodId);
        if (res.success) {
          const match = res.data.find(
            (e: any) =>
              e.subject === resolvedSubjectId &&
              e.period === resolvedPeriodId &&
              e.type === resolvedEvalType
          );
          if (match) {
            await loadGradeData(match);
          } else {
            setShowCreateForm(true);
          }
        } else {
          setError(res.error);
        }
      }
    },
    [classId, periodId, subjectId, evalType, loadGradeData]
  );

  const handleCreateEval = async () => {
    if (!newEval.title || !newEval.date) {
      setError("Titre et date sont obligatoires.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createEvaluationAction({
        class_id: classId,
        subject_id: subjectId,
        period_id: periodId,
        type: evalType,
        title: newEval.title,
        max_score: newEval.max_score,
        coefficient: newEval.coefficient,
        date: newEval.date,
      });
      if (res.success) {
        setShowCreateForm(false);
        await loadGradeData(res.data);
        setNewEval({ title: "", max_score: "20", coefficient: "1", date: "" });
      } else {
        setError(res.error);
      }
    });
  };

  const handleBulkSave = async () => {
    setError(null);
    setWarnings([]);
    const gradesPayload = students.map((s: any) => ({
      student_id: s.id,
      score: draftScores[s.id]?.is_absent ? null : (draftScores[s.id]?.score || null),
      is_absent: draftScores[s.id]?.is_absent ?? false,
    }));

    startTransition(async () => {
      const res = await bulkSaveGradesAction(selectedEval!.id, gradesPayload);
      if (res.success) {
        if (res.data?.warnings?.length) setWarnings(res.data.warnings);
        router.refresh();
        await loadGradeData(selectedEval!);
      } else {
        setError(res.error);
      }
    });
  };

  const handleLock = async () => {
    setError(null);
    startTransition(async () => {
      const res = await lockEvaluationAction(selectedEval!.id);
      if (res.success) {
        await loadGradeData({ ...selectedEval!, is_locked: true });
      } else {
        setError(res.error);
      }
    });
  };

  const handleValidateGrade = async (gradeId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await validateGradeAction(gradeId);
      if (res.success) {
        await loadGradeData(selectedEval!);
      } else {
        setError(res.error);
      }
    });
  };

  const setScore = (studentId: string, score: string) => {
    setDraftScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], score, is_absent: false },
    }));
  };

  const setAbsent = (studentId: string) => {
    setDraftScores((prev) => ({
      ...prev,
      [studentId]: { score: "", is_absent: !prev[studentId]?.is_absent },
    }));
  };

  const evalIsLocked = selectedEval?.is_locked ?? false;
  const maxScore = selectedEval ? parseFloat(selectedEval.max_score) : 20;

  const computeNoteConvertie = (score: string) => {
    if (!score || isNaN(parseFloat(score))) return null;
    return ((parseFloat(score) / maxScore) * 20).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Cascade filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <Field label="Année">
            <select
              value={syId}
              onChange={(e) => handleFilterChange("sy_id", e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Choisir...</option>
              {schoolYears.map((sy: any) => (
                <option key={sy.id} value={sy.id}>{sy.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Classe">
            <select
              value={classId}
              onChange={(e) => handleFilterChange("class_id", e.target.value)}
              className={INPUT_CLASS}
              disabled={!syId}
            >
              <option value="">Choisir...</option>
              {filteredClasses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Matière">
            <select
              value={subjectId}
              onChange={(e) => handleFilterChange("subject_id", e.target.value)}
              className={INPUT_CLASS}
              disabled={!classId}
            >
              <option value="">Choisir...</option>
              {availableSubjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Période">
            <select
              value={periodId}
              onChange={(e) => handleFilterChange("period_id", e.target.value)}
              className={INPUT_CLASS}
              disabled={!subjectId}
            >
              <option value="">Choisir...</option>
              {filteredPeriods.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={evalType}
              onChange={(e) => handleFilterChange("eval_type", e.target.value)}
              className={INPUT_CLASS}
              disabled={!periodId}
            >
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm space-y-1">
          <p className="font-medium flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Notes rejetées
          </p>
          {warnings.map((w: any, i: number) => (
            <p key={i} className="text-xs ml-6">• {w.message}</p>
          ))}
        </div>
      )}

      {/* Evaluation creation form */}
      {showCreateForm && !selectedEval && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-white font-medium">
            <FileSpreadsheet className="size-5 text-indigo-400" />
            Nouvelle évaluation
          </div>
          <p className="text-xs text-slate-500">
            Aucune évaluation trouvée pour cette combinaison. Créez-en une pour commencer la saisie.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Titre">
              <input
                value={newEval.title}
                onChange={(e) => setNewEval((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: DS Fractions"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Barème">
              <input
                type="number"
                step="0.5"
                min="1"
                value={newEval.max_score}
                onChange={(e) => setNewEval((p) => ({ ...p, max_score: e.target.value }))}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Coefficient">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={newEval.coefficient}
                onChange={(e) => setNewEval((p) => ({ ...p, coefficient: e.target.value }))}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={newEval.date}
                onChange={(e) => setNewEval((p) => ({ ...p, date: e.target.value }))}
                className={`${INPUT_CLASS} [color-scheme:dark]`}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreateEval}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Créer l&apos;évaluation
            </button>
          </div>
        </div>
      )}

      {/* Grade table */}
      {selectedEval && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedEval.title}
              </h2>
              <p className="text-xs text-slate-500">
                Barème : {selectedEval.max_score} / Coef. {selectedEval.coefficient} / {selectedEval.date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {evalIsLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  <Lock className="size-3.5" /> Verrouillé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                  <Clock className="size-3.5" /> Brouillon
                </span>
              )}
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
              <FileSpreadsheet className="size-8 text-slate-600" />
              Aucun élève actif dans cette classe.
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Élève</th>
                      <th className="px-6 py-4">Note /{selectedEval.max_score}</th>
                      <th className="px-6 py-4">/20</th>
                      <th className="px-6 py-4">Absent</th>
                      <th className="px-6 py-4">Statut</th>
                      {canValidate && !evalIsLocked && <th className="px-6 py-4">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                    {students.map((s: any) => {
                      const grade = grades.find((g: any) => g.student?.id === s.id);
                      const draft = draftScores[s.id] ?? { score: "", is_absent: false };
                      const noteConvertie = computeNoteConvertie(draft.score);
                      const isGraded = grade || (draft.score || draft.is_absent);
                      const isValidated = grade?.is_validated ?? false;

                      return (
                        <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                          <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                            <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400 mr-2">
                              {s.matricule}
                            </span>
                            {s.nom} {s.prenom}
                          </td>
                          <td className="px-6 py-4">
                            {evalIsLocked ? (
                              <span className="font-mono text-sm">
                                {grade?.score ?? (grade?.is_absent ? "—" : "—")}
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={selectedEval.max_score}
                                value={draft.score}
                                onChange={(e) => setScore(s.id, e.target.value)}
                                disabled={draft.is_absent}
                                placeholder="Note"
                                className={`${INPUT_CLASS} w-24 text-center`}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">
                            {draft.is_absent ? (
                              <span className="text-slate-500">—</span>
                            ) : noteConvertie ? (
                              <span className="text-indigo-400">{noteConvertie}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {evalIsLocked ? (
                              <span>{grade?.is_absent ? "Absent" : "—"}</span>
                            ) : (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={draft.is_absent}
                                  onChange={() => setAbsent(s.id)}
                                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-500">Abs</span>
                              </label>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isValidated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                                <CheckCircle2 className="size-3" /> Validée
                              </span>
                            ) : isGraded ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                                <Clock className="size-3" /> Provisoire
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">En attente</span>
                            )}
                          </td>
                          {canValidate && !evalIsLocked && (
                            <td className="px-6 py-4">
                              {grade && !grade.is_validated && !isPending && (
                                <button
                                  onClick={() => handleValidateGrade(grade.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="size-3" /> Valider
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!evalIsLocked && students.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {canLock && (
                <button
                  onClick={handleLock}
                  disabled={isPending || !canLockEvaluation}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/25 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  Verrouiller
                </button>
              )}
              <button
                onClick={handleBulkSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </button>
            </div>
          )}

          {evalIsLocked && canValidate && students.length > 0 && (
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-sm text-slate-400">
              Évaluation verrouillée. Les notes ne peuvent plus être modifiées.
              {students.some((s: any) => {
                const g = grades.find((gg: any) => gg.student?.id === s.id);
                return g && !g.is_validated;
              }) && (
                <span className="ml-1">
                  Cliquez sur <span className="text-indigo-400 font-medium">Valider</span> pour chaque note afin de les officialiser.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedEval && !showCreateForm && classId && periodId && subjectId && (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
          <FileSpreadsheet className="size-8 text-slate-600" />
          Chargez les évaluations en sélectionnant une classe et une période.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
