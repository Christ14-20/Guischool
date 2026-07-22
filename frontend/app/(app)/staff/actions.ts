/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createStaffAction(_state: any, formData: FormData) {
  try {
    const client = await getBackendClient();

    const rawSubjects = formData.get("subjects_taught");
    const subjects_taught = rawSubjects
      ? (rawSubjects as string).split(",").filter(Boolean)
      : [];

    const payload = {
      email: formData.get("email"),
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      phone: formData.get("phone") || "",
      role: formData.get("role"),
      subjects_taught,
    };

    const response = await client.post("/auth/staff/", payload);

    revalidatePath("/staff");

    return {
      success: true,
      data: response.data.data,
      error: null,
      fieldErrors: null,
    };
  } catch (err: any) {
    console.error("Error creating staff:", err.response?.data || err.message);
    const apiErrors = err.response?.data?.errors;
    const apiMessage = err.response?.data?.message;
    return {
      success: false,
      data: null,
      error: apiMessage || "Erreur lors de la création du membre du personnel.",
      fieldErrors: apiErrors || null,
    };
  }
}

export async function updateStaffAction(id: string, payload: Record<string, any>) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/auth/staff/${id}/`, payload);
    revalidatePath(`/staff/${id}`);
    revalidatePath("/staff");
    return { success: true, data: response.data.data, error: null, fieldErrors: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la mise à jour.",
      fieldErrors: err.response?.data?.errors || null,
    };
  }
}

export async function disableStaffAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/auth/staff/${id}/disable/`);
    revalidatePath(`/staff/${id}`);
    revalidatePath("/staff");
    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || "Impossible de désactiver ce compte.",
    };
  }
}

export async function enableStaffAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/auth/staff/${id}/enable/`);
    revalidatePath(`/staff/${id}`);
    revalidatePath("/staff");
    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || "Impossible de réactiver ce compte.",
    };
  }
}
