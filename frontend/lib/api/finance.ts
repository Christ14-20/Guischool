/**
 * lib/api/finance.ts
 * Client API pour le module Finance.
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

export type PaymentItem = {
  id: string;
  student: string | number;
  student_name?: string;
  student_matricule?: string;
  student_fee?: string | number;
  student_fee_name?: string;
  amount: number;
  payment_date: string;
  method: 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'WAVE' | 'BANK_TRANSFER' | 'CHECK' | string;
  reference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  receipt_number?: string;
  receipt_url?: string;
  created_at?: string;
};

export type StudentFinancialSummary = {
  total_due: number;
  total_paid: number;
  balance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | string;
};

export type InvoiceItem = {
  id: string;
  student: string | number;
  student_name?: string;
  school_year: string | number;
  total_due: number;
  total_paid: number;
  balance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | string;
  pdf_url?: string;
  generated_at?: string;
  created_at?: string;
};

export async function getStudentPayments(
  token: string,
  studentId: string
): Promise<PaginatedResult<PaymentItem>> {
  const data = await request<any>('/finance/payments/', {
    token,
    query: { student: studentId },
  });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function getPayments(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<PaymentItem>> {
  const data = await request<any>('/finance/payments/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function createPayment(token: string, body: Record<string, unknown>) {
  return request<PaymentItem>('/finance/payments/', { token, method: 'POST', body });
}


/**
 * Récupère le résumé financier de l'élève pour l'année scolaire en cours via la facture.
 */
export async function getStudentFinancialSummary(
  token: string,
  studentId: string,
  schoolYearId?: string | number
): Promise<StudentFinancialSummary | null> {
  try {
    const query: Record<string, any> = { student: studentId };
    if (schoolYearId) query.school_year = schoolYearId;

    const response = await request<PaginatedResult<InvoiceItem>>('/finance/invoices/', {
      token,
      query,
    });

    if (response.results.length > 0) {
      const inv = response.results[0];
      return {
        total_due: Number(inv.total_due),
        total_paid: Number(inv.total_paid),
        balance: Number(inv.balance),
        status: inv.status,
      };
    }
    return null;
  } catch (e) {
    console.error('Erreur summary finance:', e);
    return null;
  }
}

export async function getInvoices(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<InvoiceItem>> {
  const data = await request<any>('/finance/invoices/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function getInvoiceDetails(token: string, id: string): Promise<InvoiceItem> {
  return request<InvoiceItem>(`/finance/invoices/${id}/`, { token });
}

export async function generateInvoicePdf(token: string, id: string): Promise<{ status: string, message: string }> {
  return request<{ status: string, message: string }>(`/finance/invoices/${id}/generate-pdf/`, { 
    token, 
    method: 'POST' 
  });
}

// ─── Fee Categories (Catégories de Frais) ────────────────────────────────────

export type FeeInstallment = {
  date: string;
  amount: number;
};

export type FeeCategoryItem = {
  id: number;
  name: string;
  type: 'TUITION' | 'REGISTRATION' | 'CANTEEN' | 'TRANSPORT' | 'UNIFORM' | 'SUPPLIES' | 'TRIP' | 'OTHER' | string;
  amount: number;
  installments: FeeInstallment[];
  is_mandatory: boolean;
  school_year: number | null;
  created_at?: string;
};

export async function getFeeCategories(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<FeeCategoryItem>> {
  const data = await request<any>('/finance/feecategories/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function createFeeCategory(token: string, body: Record<string, unknown>) {
  return request<FeeCategoryItem>('/finance/feecategories/', { token, method: 'POST', body });
}

export async function updateFeeCategory(token: string, id: number, body: Record<string, unknown>) {
  return request<FeeCategoryItem>(`/finance/feecategories/${id}/`, { token, method: 'PATCH', body });
}

export async function deleteFeeCategory(token: string, id: number) {
  return request(`/finance/feecategories/${id}/`, { token, method: 'DELETE' });
}

// ─── Student Fees (Frais par Élève) ──────────────────────────────────────────

export type StudentFeeItem = {
  id: number;
  student: string | number;
  fee_category: number;
  fee_category_name?: string;
  total_amount: number;
  discount_amount: number;
  balance_due: number;
};

export async function getStudentFees(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<StudentFeeItem>> {
  const data = await request<any>('/finance/student-fees/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}
