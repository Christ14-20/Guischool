/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createSchoolYearAction(state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    const payload = {
      label: formData.get("label"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
    };
    const response = await client.post("/pedagogy/schoolyears/", payload);
    revalidatePath("/pedagogy/school-years");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    const msg = err.response?.data?.message || "Erreur lors de la création de l'année scolaire.";
    return { success: false, data: null, error: msg, fieldErrors: err.response?.data?.errors || null };
  }
}

export async function setCurrentSchoolYearAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/pedagogy/schoolyears/${id}/set-current/`);
    revalidatePath("/pedagogy/school-years");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.message || "Erreur lors du changement d'année." };
  }
}
