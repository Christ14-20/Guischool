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

export async function listPaymentsAction(params?: Record<string, string>) {
  try {
    const client = await getBackendClient();
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const resp = await client.get(`/finance/payments/${query}`);
    return { success: true, data: extractData(resp), error: null };
  } catch (err) {
    return { success: false, data: [], error: extractError(err) };
  }
}

export async function searchStudentsAction(query: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/students/?search=${encodeURIComponent(query)}`);
    return { success: true, data: extractData(resp), error: null };
  } catch {
    return { success: false, data: [], error: null };
  }
}

export async function createCashPaymentAction(data: {
  student_id: string;
  student_fee_id?: string | null;
  amount: number;
  method: string;
  idempotency_key: string;
}) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, unknown> = {
      student_id: data.student_id,
      amount: data.amount,
      method: "CASH",
      idempotency_key: data.idempotency_key,
    };
    if (data.student_fee_id) payload.student_fee_id = data.student_fee_id;
    const resp = await client.post("/finance/payments/", payload);
    revalidatePath("/finance/payments");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}

export async function initiateOMPaymentAction(data: {
  student_id: string;
  student_fee_id?: string | null;
  amount: number;
  payer_phone: string;
}) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, unknown> = {
      student_id: data.student_id,
      amount: data.amount,
      payer_phone: data.payer_phone,
    };
    if (data.student_fee_id) payload.student_fee_id = data.student_fee_id;
    const resp = await client.post("/finance/payments/orange-money/initiate/", payload);
    revalidatePath("/finance/payments");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}

export async function pollPaymentStatusAction(paymentId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/finance/payments/${paymentId}/status/`);
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}
