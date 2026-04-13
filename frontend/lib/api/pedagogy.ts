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
  cycle: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'SUPERIEUR';
  name: string;
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

export async function createAttendance(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/pedagogy/attendances/', { token, method: 'POST', body });
  return data?.data ?? data;
}
