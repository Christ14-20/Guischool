"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractData(resp: any): unknown[] {
  const data = resp?.data;
  return data?.data?.results ?? data?.data ?? data?.results ?? [];
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } } };
  return e?.response?.data?.message || e?.response?.data?.detail || "Erreur";
}

export async function listFeeCategoriesAction(): Promise<{ success: boolean; data: Record<string, unknown>[]; error: string | null }> {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/feecategories/");
    return { success: true, data: extractData(resp) as Record<string, unknown>[], error: null };
  } catch (err) {
    return { success: false, data: [], error: extractError(err) };
  }
}

export async function createFeeCategoryAction(data: {
  school_year: string;
  name: string;
  type: string;
  amount: number;
  is_mandatory?: boolean;
  due_date?: string | null;
}) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, unknown> = {
      school_year: data.school_year,
      name: data.name,
      type: data.type,
      amount: data.amount,
    };
    if (data.is_mandatory !== undefined) payload.is_mandatory = data.is_mandatory;
    if (data.due_date) payload.due_date = data.due_date;
    const resp = await client.post("/finance/feecategories/", payload);
    revalidatePath("/finance/fees");
    return { success: true, data: resp.data?.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}

export async function updateFeeCategoryAction(id: string, data: {
  school_year: string;
  name: string;
  type: string;
  amount: number;
  is_mandatory?: boolean;
  due_date?: string | null;
}) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, unknown> = {
      school_year: data.school_year,
      name: data.name,
      type: data.type,
      amount: data.amount,
    };
    if (data.is_mandatory !== undefined) payload.is_mandatory = data.is_mandatory;
    if (data.due_date) payload.due_date = data.due_date;
    const resp = await client.put(`/finance/feecategories/${id}/`, payload);
    revalidatePath("/finance/fees");
    return { success: true, data: resp.data?.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}

export async function deleteFeeCategoryAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.delete(`/finance/feecategories/${id}/`);
    revalidatePath("/finance/fees");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: extractError(err) };
  }
}

export async function searchStudentsAction(query: string): Promise<{ success: boolean; data: unknown[]; error: string | null }> {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/students/?search=${encodeURIComponent(query)}`);
    return { success: true, data: extractData(resp), error: null };
  } catch {
    return { success: false, data: [], error: null };
  }
}

export async function listStudentFeesAction(): Promise<{ success: boolean; data: Record<string, unknown>[]; error: string | null }> {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/student-fees/");
    return { success: true, data: extractData(resp) as Record<string, unknown>[], error: null };
  } catch (err) {
    return { success: false, data: [], error: extractError(err) };
  }
}

export async function assignStudentFeeAction(data: {
  student: string;
  fee_category_id: string;
  total_amount: number;
  discount_amount?: number;
}) {
  try {
    const client = await getBackendClient();
    const resp = await client.post("/finance/student-fees/", {
      ...data,
      discount_amount: data.discount_amount || 0,
    });
    revalidatePath("/finance/fees");
    return { success: true, data: resp.data?.data, error: null };
  } catch (err) {
    return { success: false, data: null, error: extractError(err) };
  }
}
