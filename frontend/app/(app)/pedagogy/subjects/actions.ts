/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createSubjectAction(state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    const payload: Record<string, any> = {
      code: formData.get("code"),
      name: formData.get("name"),
      category: formData.get("category"),
      is_official: formData.get("is_official") === "true",
    };
    const response = await client.post("/pedagogy/subjects/", payload);
    revalidatePath("/pedagogy/subjects");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    const data = err.response?.data;
    const msg = data?.message || "Erreur lors de la création de la matière.";
    return { success: false, data: null, error: msg, fieldErrors: data?.errors || null };
  }
}
