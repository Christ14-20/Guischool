/**
 * lib/api/support.ts
 * Client API pour le module Support & Tickets.
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

// ─── Ticket Types ─────────────────────────────────────────────────────────────

export type TicketCategory =
  | 'TECHNIQUE'
  | 'FACTURATION'
  | 'FONCTIONNEL'
  | 'FEATURE'
  | 'BLOCAGE'
  | 'PAIEMENT'
  | string;

export type TicketPriority = 'BLOQUANT' | 'MAJEUR' | 'MINEUR' | 'QUESTION' | string;

export type TicketStatus =
  | 'OUVERT'
  | 'EN_COURS'
  | 'EN_ATTENTE'
  | 'RESOLU'
  | 'FERME'
  | string;

export type TicketMessage = {
  id: string | number;
  ticket: string | number;
  author: string | number;
  author_name?: string;
  author_role?: string;
  content: string;
  created_at: string;
};

export type TicketItem = {
  id: string | number;
  ticket_number?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  created_by?: string | number;
  created_by_name?: string;
  assigned_to?: string | number | null;
  assigned_to_name?: string | null;
  messages?: TicketMessage[];
  message_count?: number;
  attachment_url?: string | null;
  created_at: string;
  updated_at?: string;
};

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getTickets(
  token: string,
  query?: Record<string, string | number | undefined>
): Promise<PaginatedResult<TicketItem>> {
  const data = await request<any>('/support/tickets/', { token, query });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function getTicket(token: string, id: string): Promise<TicketItem> {
  return request<TicketItem>(`/support/tickets/${id}/`, { token });
}

export async function createTicket(
  token: string,
  body: Record<string, unknown>
): Promise<TicketItem> {
  return request<TicketItem>('/support/tickets/', { token, method: 'POST', body });
}

export async function updateTicket(
  token: string,
  id: string | number,
  body: Record<string, unknown>
): Promise<TicketItem> {
  return request<TicketItem>(`/support/tickets/${id}/`, { token, method: 'PATCH', body });
}

export async function getTicketMessages(
  token: string,
  ticketId: string
): Promise<PaginatedResult<TicketMessage>> {
  const data = await request<any>(`/support/tickets/${ticketId}/messages/`, { token });
  return {
    count: Number(data?.count ?? 0),
    results: Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
  };
}

export async function addTicketMessage(
  token: string,
  ticketId: string,
  content: string
): Promise<TicketMessage> {
  return request<TicketMessage>(`/support/tickets/${ticketId}/messages/`, {
    token,
    method: 'POST',
    body: { content },
  });
}
