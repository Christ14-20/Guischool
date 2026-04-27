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
    const data = payload as Record<string, unknown> | null;
    const message = data?.message ?? data?.detail ?? 'Erreur serveur.';
    throw new Error(String(message));
  }

  return payload as T;
}

export type PaginatedResult<T> = {
  count: number;
  results: T[];
};

export type StudentStatus = 'ACTIF' | 'SUSPENDU' | 'TRANSFERE' | 'ARCHIVE' | string;

export type StudentItem = {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date?: string;
  classe: number | null;
  classe_name: string;
  status: StudentStatus;
  guardian_name: string;
  guardian_phone: string;
};

type RawStudent = Record<string, unknown>;

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeStudent(raw: RawStudent): StudentItem {
  const firstName =
    toStringValue(raw.first_name) || toStringValue(raw.firstName) || toStringValue(raw.prenom);
  const lastName =
    toStringValue(raw.last_name) || toStringValue(raw.lastName) || toStringValue(raw.nom);
  const classeName =
    toStringValue(raw.classe_name) ||
    toStringValue(raw.class_name) ||
    toStringValue(raw.classroom_name) ||
    toStringValue(raw.classe_label);
  const guardianName =
    toStringValue(raw.guardian_name) || toStringValue(raw.tuteur_nom) || toStringValue(raw.tutor_name);
  const guardianPhone =
    toStringValue(raw.guardian_phone) ||
    toStringValue(raw.tuteur_phone) ||
    toStringValue(raw.tuteur_telephone) ||
    toStringValue(raw.tutor_phone);
  const status = toStringValue(raw.status).toUpperCase() || 'ACTIF';

  return {
    id: String(raw.id ?? ''),
    matricule:
      toStringValue(raw.matricule) || toStringValue(raw.registration_number) || toStringValue(raw.code),
    first_name: firstName,
    last_name: lastName,
    full_name: [lastName, firstName].filter(Boolean).join(' ').trim() || toStringValue(raw.full_name),
    birth_date:
      toStringValue(raw.birth_date) || toStringValue(raw.date_of_birth) || toStringValue(raw.date_naissance),
    classe: typeof raw.classe === 'number' ? raw.classe : null,
    classe_name: classeName,
    status,
    guardian_name: guardianName,
    guardian_phone: guardianPhone,
  };
}

export async function getStudents(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<StudentItem>> {
  const data = await request<any>('/students/', { token, query });
  const rows = Array.isArray(data?.results) ? data.results : [];
  return {
    count: Number(data?.count ?? 0),
    results: rows.map((item: RawStudent) => normalizeStudent(item)),
  };
}

export type CreateStudentPayload = {
  last_name: string;
  first_name: string;
  birth_date: string;
  birth_place?: string;
  gender: 'M' | 'F';
  photo_url?: string;
  guardian_name: string;
  guardian_relationship: 'PERE' | 'MERE' | 'TUTEUR' | 'AUTRE';
  guardian_phone: string;
  guardian_email?: string;
  school_year: number;
  classe: number;
  registration_type: 'NOUVELLE' | 'REINSCRIPTION' | 'TRANSFERT_ENTRANT';
  observations?: string;
};

export async function createStudent(token: string, body: CreateStudentPayload) {
  const data = await request<any>('/students/', { token, method: 'POST', body });
  return data?.data ?? data;
}
