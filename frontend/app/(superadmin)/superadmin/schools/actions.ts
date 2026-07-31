/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";


import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function createSchoolAction(state: any, formData: FormData) {
  try {
    const client = await getBackendClient();
    
    const payload = {
      name: formData.get("name"),
      school_type: formData.get("school_type"),
      code_minedu: formData.get("code_minedu") || null,
      contact_name: formData.get("contact_name"),
      contact_phone: formData.get("contact_phone"),
      contact_email: formData.get("contact_email"),
      region: formData.get("region") || "",
      prefecture: formData.get("prefecture") || "",
      commune: formData.get("commune") || "",
      quartier: formData.get("quartier") || "",
      plan_id: formData.get("plan_id"),
    };

    const response = await client.post("/superadmin/schools/", payload);
    
    revalidatePath("/superadmin/dashboard");
    revalidatePath("/superadmin/schools");

    return {
      success: true,
      data: response.data.data,
      error: null,
    };
  } catch (err: any) {
    console.error("Error creating school:", err.response?.data || err.message);
    const apiErrors = err.response?.data?.errors;
    const apiMessage = err.response?.data?.message;
    return {
      success: false,
      data: null,
      error: apiMessage || "Une erreur est survenue lors de la création de l'établissement.",
      fieldErrors: apiErrors || null,
    };
  }
}

export async function suspendSchoolAction(id: string, reason: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/superadmin/schools/${id}/suspend/`, { reason });
    
    revalidatePath("/superadmin/dashboard");
    revalidatePath("/superadmin/schools");
    revalidatePath(`/superadmin/schools/${id}`);

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error suspending school:", err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.message || "Impossible de suspendre cet établissement.",
    };
  }
}

export async function changePlanAction(id: string, planId: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/superadmin/schools/${id}/change-plan/`, { plan_id: planId });

    revalidatePath("/superadmin/dashboard");
    revalidatePath("/superadmin/schools");
    revalidatePath(`/superadmin/schools/${id}`);

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error changing plan:", err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.message || "Impossible de changer le plan de cet établissement.",
    };
  }
}

export async function reactivateSchoolAction(id: string) {
  try {
    const client = await getBackendClient();
    await client.patch(`/superadmin/schools/${id}/reactivate/`, {});
    
    revalidatePath("/superadmin/dashboard");
    revalidatePath("/superadmin/schools");
    revalidatePath(`/superadmin/schools/${id}`);

    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error reactivating school:", err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.message || "Impossible de réactiver cet établissement.",
    };
  }
}
