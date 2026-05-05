/**
 * lib/api/settings.ts
 * API authentifiée pour la configuration et les paramètres (Module 9).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? 'Une erreur est survenue.';
    throw new Error(message);
  }

  return payload as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type SchoolSettings = {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  // Paramètres pédagogiques
  passing_threshold: number; // ex: 10
  max_repeats: number; // ex: 2
};

export type SchoolUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  last_login?: string;
};

export type AuditLogItem = {
  id: string;
  timestamp: string;
  user_name: string;
  action: string;
  description: string;
  entity_name: string;
  ip_address: string;
};

export type PaginatedResult<T> = {
  count: number;
  results: T[];
};

// ─── Fonctions ───────────────────────────────────────────────────────────────

/**
 * Récupère les logs d'audit de l'école.
 */
export async function getAuditLogs(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<AuditLogItem>> {
  const data = await request<any>(token, '/monitoring/auditlogs/', {
    // Note: Dans un environnement réel, on filtrerait probablement par school_id côté backend
  });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

/**
 * Récupère les paramètres de l'école courante.
 */
export async function getSchoolSettings(token: string, schoolId: string): Promise<SchoolSettings> {
  return request<SchoolSettings>(token, `/schools/${schoolId}/`);
}

/**
 * Met à jour les paramètres de l'école.
 */
export async function updateSchoolSettings(
  token: string,
  schoolId: string,
  body: Partial<SchoolSettings>
): Promise<SchoolSettings> {
  return request<SchoolSettings>(token, `/schools/${schoolId}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Liste les utilisateurs de l'école.
 */
export async function getSchoolUsers(token: string): Promise<SchoolUser[]> {
  const data = await request<any>(token, '/schools/users/');
  return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
}

/**
 * Invite un nouvel utilisateur.
 */
export async function inviteSchoolUser(
  token: string,
  body: { email: string; role: string; first_name?: string; last_name?: string }
): Promise<SchoolUser> {
  return request<SchoolUser>(token, '/schools/users/invite/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Change le mot de passe de l'utilisateur courant.
 */
export async function changePassword(
  token: string,
  body: { current_password: string; new_password: string }
): Promise<{ message: string }> {
  return request<{ message: string }>(token, '/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
