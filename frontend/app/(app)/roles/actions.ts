/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createRoleAction(payload: {
  label: string;
  description?: string;
  permissions: string[];
}) {
  try {
    const client = await getBackendClient();
    const response = await client.post("/auth/roles/", payload);
    revalidatePath("/roles");
    return { success: true, data: response.data.data, error: null, fieldErrors: null };
  } catch (err: any) {
    const apiErrors = err.response?.data?.errors;
    const apiMessage = err.response?.data?.message;
    return {
      success: false,
      data: null,
      error: apiMessage || "Erreur lors de la création du rôle.",
      fieldErrors: apiErrors || null,
    };
  }
}

export async function updateRoleAction(
  id: string,
  payload: { label?: string; description?: string; permissions?: string[] }
) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/auth/roles/${id}/`, payload);
    revalidatePath("/roles");
    revalidatePath(`/roles/${id}`);
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la modification du rôle.",
    };
  }
}

export async function deleteRoleAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.delete(`/auth/roles/${id}/`);
    revalidatePath("/roles");
    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || "Erreur lors de la suppression du rôle.",
    };
  }
}
