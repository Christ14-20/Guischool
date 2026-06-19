type RequestOptions = {
  token: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined | null>;
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

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? 'Requete backend invalide.';
    throw new Error(message);
  }

  return payload as T;
}

export type PaginatedResult<T> = {
  count: number;
  results: T[];
};

export type SchoolItem = {
  id: string;
  name: string;
  slug: string;
  code_minedu?: string;
  type?: string;
  school_type?: 'PUB' | 'PRIV' | 'FRAR' | 'ETP' | 'ETPR' | 'INT' | 'COM' | 'INC';
  status: string;
  plan: number | null;
  plan_name: string | null;
  can_use_payroll?: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
};

export type PlanItem = {
  id: number;
  name: 'STARTER' | 'PRO' | 'ENTERPRISE';
  max_students: number;
  max_staff: number;
  modules_activated: string[];
  storage_max_gb: number;
  price_monthly: string;
  price_annual: string;
  created_at: string;
};

export type SuperadminUserItem = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  last_login: string | null;
  date_joined: string;
};

export type SystemAlertItem = {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
};

export type OnboardingRequestItem = {
  id: string;
  tracking_code: string;
  school_name: string;
  school_type: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'MIXTE';
  school_city: string;
  school_phone: string;
  school_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_note: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSchools(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<SchoolItem>> {
  const data = await request<any>('/superadmin/schools/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function getSchool(token: string, id: string): Promise<SchoolItem> {
  const data = await request<any>(`/superadmin/schools/${id}/`, { token });
  return data?.data ?? data;
}

export async function createSchool(token: string, body: Record<string, unknown>) {
  const data = await request<any>('/superadmin/schools/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function suspendSchool(token: string, id: string, reason = '') {
  return request(`/superadmin/schools/${id}/suspend/`, {
    token,
    method: 'PATCH',
    body: { reason },
  });
}

export async function reactivateSchool(token: string, id: string) {
  return request(`/superadmin/schools/${id}/reactivate/`, {
    token,
    method: 'PATCH',
  });
}

export async function updateSchool(token: string, id: string, body: Record<string, unknown>) {
  const data = await request<any>(`/superadmin/schools/${id}/`, {
    token,
    method: 'PATCH',
    body,
  });
  return data?.data ?? data;
}

export async function getPlans(token: string): Promise<PlanItem[]> {
  const data = await request<any>('/superadmin/plans/', { token });
  const list = data?.data ?? data;
  return Array.isArray(list) ? list : [];
}

export async function updatePlan(token: string, id: number, body: Record<string, unknown>) {
  const data = await request<any>(`/superadmin/plans/${id}/`, {
    token,
    method: 'PUT',
    body,
  });
  return data?.data ?? data;
}

export async function getSystemAlerts(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<SystemAlertItem>> {
  const data = await request<any>('/monitoring/systemalerts/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function resolveSystemAlert(token: string, id: string) {
  return request(`/monitoring/systemalerts/${id}/resolve/`, {
    token,
    method: 'POST',
  });
}

export async function getSuperadminUsers(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<SuperadminUserItem>> {
  const data = await request<any>('/superadmin/users/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function createSuperadminUser(
  token: string,
  body: { first_name: string; last_name: string; email: string; role: string; password: string }
): Promise<SuperadminUserItem> {
  const data = await request<any>('/superadmin/users/', { token, method: 'POST', body });
  return data?.data ?? data;
}

export async function updateSuperadminUser(
  token: string,
  id: string,
  body: { first_name?: string; last_name?: string; email?: string; role?: string; password?: string }
): Promise<SuperadminUserItem> {
  const data = await request<any>(`/superadmin/users/${id}/`, { token, method: 'PATCH', body });
  return data?.data ?? data;
}

export async function toggleSuperadminUser(token: string, id: string) {
  const data = await request<any>(`/superadmin/users/${id}/toggle-active/`, {
    token,
    method: 'PATCH',
  });
  return data?.data ?? data;
}

export async function resetSuperadminUserPassword(token: string, id: string) {
  return request(`/superadmin/users/${id}/reset-password/`, {
    token,
    method: 'POST',
  });
}

export async function getOnboardingRequests(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<OnboardingRequestItem>> {
  const data = await request<any>('/support/onboarding-requests/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

export async function reviewOnboardingRequest(
  token: string,
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; review_note?: string }
) {
  const data = await request<any>(`/support/onboarding-requests/${id}/review/`, {
    token,
    method: 'POST',
    body,
  });
  return data?.data ?? data;
}

// ── Campus ────────────────────────────────────────────────────────────────

export type CampusItem = {
  id: string;
  tenant: string;
  tenant_name: string;
  name: string;
  address: string;
  city: string;
  prefecture: string;
  latitude: string | null;
  longitude: string | null;
  active_levels: string[];
  phone: string;
  email: string;
  is_main: boolean;
  is_active: boolean;
  classes_count: number;
  students_count: number;
  created_at: string;
  updated_at: string;
};

export type CampusCreateBody = {
  name: string;
  address?: string;
  city?: string;
  prefecture?: string;
  latitude?: number | null;
  longitude?: number | null;
  active_levels?: string[];
  phone?: string;
  email?: string;
  is_main?: boolean;
  is_active?: boolean;
};

export async function getCampuses(token: string, schoolId: string): Promise<CampusItem[]> {
  const data = await request<any>(`/superadmin/schools/${schoolId}/campuses/`, { token });
  return data?.data ?? (Array.isArray(data?.results) ? data.results : []);
}

export async function createCampus(
  token: string,
  schoolId: string,
  body: CampusCreateBody
): Promise<CampusItem> {
  const data = await request<any>(`/superadmin/schools/${schoolId}/campuses/`, {
    token,
    method: 'POST',
    body,
  });
  return data?.data ?? data;
}

export async function updateCampus(
  token: string,
  schoolId: string,
  campusId: string,
  body: Partial<CampusCreateBody>
): Promise<CampusItem> {
  const data = await request<any>(`/superadmin/schools/${schoolId}/campuses/${campusId}/`, {
    token,
    method: 'PATCH',
    body,
  });
  return data?.data ?? data;
}