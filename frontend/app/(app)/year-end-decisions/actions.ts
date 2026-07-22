/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createYearEndDecisionAction(data: any) {
  try {
    const client = await getBackendClient();
    const resp = await client.post("/pedagogy/year-end-decisions/", data);
    revalidatePath("/year-end-decisions");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la création de la décision.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function promotionsBulkAction(data: {
  classe_origine_id: string;
  school_year_cible_id: string;
  decisions_filter: string;
}) {
  try {
    const client = await getBackendClient();
    const resp = await client.post("/pedagogy/promotions/bulk/", data);
    revalidatePath("/year-end-decisions");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la promotion groupée.",
      errors: err.response?.data?.errors || null,
    };
  }
}