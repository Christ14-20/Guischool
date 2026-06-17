/**
 * lib/api/tenant-settings.ts
 * API pour la configuration avancée tenant (ARCH-03).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type ModuleAvailability = {
  available: boolean;
  required_plan_module: string;
};

export type TenantSettings = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  code_minedu?: string;
  nif?: string;
  registre_commerce?: string;
  timezone: string;
  date_format: string;
  first_day_week: number;
  default_lang: string;
  default_currency: string;
  education_system: string;
  active_levels: string[];
  exams_prepared: string[];
  has_internat: boolean;
  has_transport: boolean;
  has_cantine: boolean;
  has_bibliotheque: boolean;
  has_labo: boolean;
  has_official_exams: boolean;
  has_payroll: boolean;
  has_whatsapp: boolean;
  has_offline_advanced: boolean;
  has_predictive_analytics: boolean;
  address?: string;
  phone?: string;
  email?: string;
  plan_name?: string | null;
  plan_modules: string[];
  module_availability: Record<string, ModuleAvailability>;
  updated_at?: string;
};

export type TenantSettingsUpdate = Partial<
  Omit<TenantSettings, 'id' | 'slug' | 'logo_url' | 'plan_name' | 'plan_modules' | 'module_availability' | 'updated_at'>
> & { logo?: File | null };

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const fieldErrors = payload && typeof payload === 'object' ? Object.values(payload).flat().join(' ') : '';
    const message = fieldErrors || payload?.message || payload?.detail || 'Une erreur est survenue.';
    throw new Error(typeof message === 'string' ? message : 'Une erreur est survenue.');
  }

  return (payload?.data ?? payload) as T;
}

export async function getTenantSettings(token: string): Promise<TenantSettings> {
  const response = await fetch(`${API_BASE}/settings/tenant/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<TenantSettings>(response);
}

export async function updateTenantSettings(
  token: string,
  body: TenantSettingsUpdate
): Promise<TenantSettings> {
  const { logo, ...jsonFields } = body;
  const hasFile = logo instanceof File;

  const response = await fetch(`${API_BASE}/settings/tenant/`, {
    method: 'PATCH',
    headers: hasFile
      ? { Authorization: `Bearer ${token}` }
      : { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: hasFile
      ? (() => {
          const formData = new FormData();
          Object.entries(jsonFields).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            if (Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          });
          formData.append('logo', logo);
          return formData;
        })()
      : JSON.stringify(jsonFields),
  });

  return parseResponse<TenantSettings>(response);
}
