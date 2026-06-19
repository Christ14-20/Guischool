/**
 * lib/api/pedagogy.ts
 * Client API authentifié pour le module Pédagogie (Module 4).
 */

type RequestOptions = {
  token: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);

  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const p = payload as Record<string, unknown> | null;
    const message = p?.message ?? p?.detail ?? 'Erreur serveur.';
    throw new Error(String(message));
  }

  return payload as T;
}

export type PaginatedResult<T> = {
  count: number;
  results: T[];
};

// ─── Types ──────────────────────────────────────────────────────────────────

export type SchoolYearItem = {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  status: 'PREPARATION' | 'OUVERTE' | 'EN_COURS' | 'CLOTURE_EN_COURS' | 'CLOTUREE';
  is_current: boolean;
};

export type LevelItem = {
  id: number;
  cycle: 'MATERNELLE' | 'PRIMAIRE' | 'CQP' | 'COLLEGE' | 'LYCEE_GEN' | 'LYCEE_TECH' | 'ETFP_A' | 'ETFP_B';
  name: string;
  code_officiel_minedu?: string;
  age_min?: number;
  age_max?: number;
  diplome_final?: string;
  duree_annees?: number;
  evaluation_type?: 'NUMERIC' | 'DESCRIPTIVE';
  order_index: number;
};

export type ClassItem = {
  id: number;
  school_year: number;
  level: number;
  level_name: string;
  name: string;
  capacity: number;
  room: string;
  main_teacher: string | null;
  current_count: number;
};

export type SubjectItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  is_official: boolean;
};

export type TimetableSlotItem = {
  id: number;
  classe: number;
  teacher: string;
  subject: number;
  room: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

export type EvaluationItem = {
  id: number;
  classe: number;
  subject: number;
  subject_name?: string;
  teacher?: string;
  type: 'INTERROGATION' | 'DEVOIR' | 'COMPOSITION' | string;
  title: string;
  max_score: number;
  coefficient: number;
  date: string;
  is_published: boolean;
  is_locked: boolean;
};

export type AttendanceItem = {
  id: number;
  student: string;
  classe: number;
  subject: number | null;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'ABSENT_JUSTIFIED' | 'LATE' | 'EXCLUDED';
  minutes_late: number;
  justification: string;
};

export type GradeItem = {
  id: number | string;
  student?: string | number;
  subject_name: string;
  score: number;
  max_score: number;
  coefficient: number;
  converted_score_20: number;
  weighted_score: number;
  comment: string;
  period: string;
};

// ─── School Years ────────────────────────────────────────────────────────────

export async function getSchoolYears(
  token: string,
  query?: Record<string, string | undefined>
): Promise<PaginatedResult<SchoolYearItem>> {
  const data = await request<any>('/pedagogy/schoolyears/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function createSchoolYear(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/schoolyears/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateSchoolYear(token: string, id: number, body: Record<string, unknown>) {
  const data = await request<any>(`/pedagogy/schoolyears/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function deleteSchoolYear(token: string, id: number) {
  return request(`/pedagogy/schoolyears/${id}/`, { token, method: 'DELETE' });
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export async function getLevels(
  token: string,
  query?: Record<string, string | undefined>
): Promise<PaginatedResult<LevelItem>> {
  const data = await request<any>('/pedagogy/levels/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function createLevel(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/levels/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateLevel(
  token: string,
  id: number,
  body: Record<string, unknown>
) {
  const data = await request<any>(`/pedagogy/levels/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function deleteLevel(token: string, id: number) {
  return request(`/pedagogy/levels/${id}/`, { token, method: 'DELETE' });
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function getClasses(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<ClassItem>> {
  const data = await request<any>('/pedagogy/classes/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function createClass(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/classes/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateClass(token: string, id: number, body: Record<string, unknown>) {
  const data = await request<any>(`/pedagogy/classes/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function deleteClass(token: string, id: number) {
  return request(`/pedagogy/classes/${id}/`, { token, method: 'DELETE' });
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function getSubjects(
  token: string,
  query?: Record<string, string | undefined>
): Promise<PaginatedResult<SubjectItem>> {
  const data = await request<any>('/pedagogy/subjects/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function createSubject(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/subjects/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateSubject(token: string, id: number, body: Record<string, unknown>) {
  const data = await request<any>(`/pedagogy/subjects/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function deleteSubject(token: string, id: number) {
  return request(`/pedagogy/subjects/${id}/`, { token, method: 'DELETE' });
}

// ─── Timetable ───────────────────────────────────────────────────────────────

export async function getTimetableSlots(
  token: string,
  classeId: number
): Promise<TimetableSlotItem[]> {
  const data = await request<any>('/pedagogy/timetable/', { token, query: { classe: classeId } });
  const list = data?.results ?? data;
  return Array.isArray(list) ? list : [];
}

export async function createTimetableSlot(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/timetable/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateTimetableSlot(token: string, id: number, body: Record<string, unknown>) {
  const data = await request<any>(`/pedagogy/timetable/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function deleteTimetableSlot(token: string, id: number) {
  return request(`/pedagogy/timetable/${id}/`, { token, method: 'DELETE' });
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export async function getAttendances(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<AttendanceItem>> {
  const data = await request<any>('/pedagogy/attendances/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function bulkCreateAttendances(token: string, records: Record<string, unknown>[]) {
  const data = await request<any>('/pedagogy/attendances/', { token, method: 'POST', body: records });
  return data;
}

// ─── Evaluations ─────────────────────────────────────────────────────────────
export async function getEvaluations(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<EvaluationItem>> {
  const data = await request<any>('/pedagogy/evaluations/', { token, query });
  return { count: Number(data?.count ?? 0), results: Array.isArray(data?.results) ? data.results : [] };
}

export async function createEvaluation(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/evaluations/', { token, method: 'POST', body });
  return data?.data ?? data;
}

// ─── Grades ──────────────────────────────────────────────────────────────────
export async function bulkCreateGrades(token: string, grades: any[]) {
  return request<any>('/grades/bulk/', { token, method: 'POST', body: grades });
}

export async function getGradeTemplate(token: string, classeId: string): Promise<Blob> {
  const url = `${API_BASE}/grades/template/?classe=${classeId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Impossible de générer le modèle.');
  return response.blob();
}

export async function getStudentGrades(
  token: string,
  params: { eleve?: string; classe?: string; matiere?: number; periode?: string; annee?: number }
): Promise<GradeItem[]> {
  const query = new URLSearchParams();
  if (params.eleve) query.append('eleve', params.eleve);
  if (params.classe) query.append('classe', params.classe);
  if (params.matiere) query.append('matiere', String(params.matiere));
  if (params.periode) query.append('periode', params.periode);
  if (params.annee) query.append('annee_scolaire', String(params.annee));

  const data = await request<any>(`/grades/?${query.toString()}`, { token });
  const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

  return list.map((item: any) => {
    const score = Number(item.note ?? 0);
    const maxScore = Number(item.note_sur ?? 20) || 20;
    const coef = Number(item.coefficient ?? 1) || 1;
    const converted = Number(item.note_convertie ?? (score * 20) / maxScore);

    return {
      id: item.id,
      subject_name: item.matiere_name || '—',
      score,
      max_score: maxScore,
      coefficient: coef,
      converted_score_20: converted,
      weighted_score: converted * coef,
      comment: item.appreciation || '',
    };
  });
}

export async function getClassRanking(
  token: string,
  classeId: string,
  anneeId: string,
  periode?: string
) {
  const query = new URLSearchParams({ classe: classeId, annee: anneeId });
  if (periode) query.append('periode', periode);

  return request<any[]>(`/grades/ranking/?${query.toString()}`, { token });
}

export async function getStudentGradesLegacy(
  token: string,
  query: { eleve: string; periode: string }
): Promise<GradeItem[]> {
  const data = await request<any>('/grades/', { token, query });
  const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

  return list.map((item: Record<string, unknown>) => {
    const score = Number(item.score ?? item.note ?? item.value ?? 0);
    const maxScore = Number(item.max_score ?? item.scale ?? item.bareme ?? 20) || 20;
    const coefficient = Number(item.coefficient ?? item.coef ?? 1) || 1;
    const converted = Number(item.converted_score_20 ?? item.note_sur_20 ?? (score * 20) / maxScore);

    return {
      id: (item.id as number | string | undefined) ?? Math.random().toString(36).slice(2),
      student: (item.student as string | number | undefined) ?? (item.etudiant as string | number | undefined),
      subject_name: String(item.subject_name ?? item.subject ?? item.matiere_name ?? item.matiere ?? 'Matière'),
      score,
      max_score: maxScore,
      coefficient,
      converted_score_20: converted,
      weighted_score: Number(item.weighted_score ?? item.note_ponderee ?? converted * coefficient),
      comment: String(item.comment ?? item.appreciation ?? ''),
      period: String(item.period ?? item.periode ?? query.periode),
    };
  });
}

export async function getYearEndDecisions(
  token: string,
  params: { annee?: string; classe?: string; decision?: string }
) {
  const query = new URLSearchParams();
  if (params.annee) query.append('annee_scolaire', params.annee);
  if (params.classe) query.append('classe_origine', params.classe);
  if (params.decision) query.append('decision', params.decision);

  return request<any>('/year-end-decisions/', { token, query: Object.fromEntries(query) });
}

export async function createYearEndDecision(token: string, payload: any) {
  return request<any>('/year-end-decisions/', { token, method: 'POST', body: payload });
}

export async function bulkCreatePromotions(token: string, payload: any) {
  return request<any>('/promotions/bulk/', { token, method: 'POST', body: payload });
}
