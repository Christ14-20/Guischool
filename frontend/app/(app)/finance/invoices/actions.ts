"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

function extractData(resp: unknown): unknown[] {
  const r = resp as { data?: { data?: { results?: unknown[] }; results?: unknown[] } };
  const results = r?.data?.data?.results;
  if (results) return results;
  const direct = r?.data?.results;
  if (direct) return direct;
  const flat = r?.data?.data;
  if (Array.isArray(flat)) return flat;
  return [];
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } } };
  return e?.response?.data?.message || e?.response?.data?.detail || "Erreur";
}

export async function listInvoicesAction(params?: Record<string, string>) {
  try {
    const client = await getBackendClient();
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const resp = await client.get(`/finance/invoices/${query}`);
    return { success: true, data: extractData(resp), error: null };
  } catch (err) {
    return { success: false, data: [], error: extractError(err) };
  }
}

export async function generateInvoicePdfAction(invoiceId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.post(`/finance/invoices/${invoiceId}/generate-pdf/`);
    revalidatePath("/finance/invoices");
    return { success: true, data: resp.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}

export async function pollTaskStatusAction(taskId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/pedagogy/tasks/${taskId}/status/`);
    const d = resp.data;
    return { success: true, data: d?.data ?? d, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}
