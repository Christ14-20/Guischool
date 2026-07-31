/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export interface PlanPayload {
  name: string;
  max_students: number;
  max_staff: number;
  price_monthly: string;
  is_active: boolean;
}

export async function createPlanAction(payload: PlanPayload) {
  try {
    const client = await getBackendClient();
    const response = await client.post("/superadmin/plans/", payload);

    revalidatePath("/superadmin/plans");
    revalidatePath("/superadmin/schools/new");

    return { success: true, data: response.data.data, error: null, fieldErrors: null, affectedTenants: null };
  } catch (err: any) {
    console.error("Error creating plan:", err.response?.data || err.message);
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Une erreur est survenue lors de la création du plan.",
      fieldErrors: err.response?.data?.errors || null,
      affectedTenants: null,
    };
  }
}

export async function updatePlanAction(id: string, payload: Partial<PlanPayload>) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/superadmin/plans/${id}/`, payload);

    revalidatePath("/superadmin/plans");
    revalidatePath("/superadmin/schools/new");
    revalidatePath("/superadmin/schools");

    return { success: true, data: response.data.data, error: null, fieldErrors: null, affectedTenants: null };
  } catch (err: any) {
    console.error("Error updating plan:", err.response?.data || err.message);
    const errors = err.response?.data?.errors;
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Une erreur est survenue lors de la modification du plan.",
      fieldErrors: errors && !errors.affected_tenants ? errors : null,
      affectedTenants: errors?.affected_tenants || null,
    };
  }
}
