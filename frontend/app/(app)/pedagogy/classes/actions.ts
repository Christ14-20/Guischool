/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createClassAction(state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    const payload = {
      school_year: formData.get("school_year"),
      level_id: formData.get("level_id"),
      name: formData.get("name"),
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : 60,
      room: formData.get("room") || "",
      main_teacher_id: formData.get("main_teacher_id") || null,
    };
    const response = await client.post("/pedagogy/classes/", payload);
    revalidatePath("/pedagogy/classes");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    const msg = err.response?.data?.message || "Erreur lors de la création de la classe.";
    return { success: false, data: null, error: msg, fieldErrors: err.response?.data?.errors || null };
  }
}

export async function addClassSubjectAction(classId: string, state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, any> = {
      subject_id: formData.get("subject_id"),
      coefficient: formData.get("coefficient") || "1.0",
      weekly_hours: formData.get("weekly_hours") || "0",
    };
    const teacherId = formData.get("teacher_id");
    if (teacherId) payload.teacher_id = teacherId;
    await client.post(`/pedagogy/classes/${classId}/subjects/`, payload);
    revalidatePath(`/pedagogy/classes/${classId}`);
    return { success: true, error: null };
  } catch (err: any) {
    const msg = err.response?.data?.message || "Erreur lors de l'ajout de la matière.";
    return { success: false, error: msg, fieldErrors: err.response?.data?.errors || null };
  }
}
