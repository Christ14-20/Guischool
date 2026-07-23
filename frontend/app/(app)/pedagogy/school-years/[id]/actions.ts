/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createPeriodAction(schoolYearId: string, state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    const payload = {
      name: formData.get("name"),
      type: formData.get("type"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      order: formData.get("order") || "1",
    };
    await client.post(`/pedagogy/school-years/${schoolYearId}/periods/`, payload);
    revalidatePath(`/pedagogy/school-years/${schoolYearId}`);
    return { success: true, error: null };
  } catch (err: any) {
    const data = err.response?.data;
    const msg = data?.message || "Erreur lors de la création de la période.";
    return { success: false, error: msg, fieldErrors: data?.errors || null };
  }
}

export async function closePeriodAction(periodId: string, schoolYearId: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/pedagogy/periods/${periodId}/close/`);
    revalidatePath(`/pedagogy/school-years/${schoolYearId}`);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.message || "Erreur lors de la clôture." };
  }
}
