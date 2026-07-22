/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(formData: FormData) {
  try {
    const oldPassword = formData.get("old_password");
    const newPassword = formData.get("new_password");
    const newPasswordConfirm = formData.get("new_password_confirm");

    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      return { success: false, error: "Tous les champs sont obligatoires." };
    }

    if (newPassword !== newPasswordConfirm) {
      return { success: false, error: "Les nouveaux mots de passe ne correspondent pas." };
    }

    const client = await getBackendClient();
    const response = await client.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });

    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    const status = err.response?.status;
    const apiMessage = err.response?.data?.message;
    const apiErrors = err.response?.data?.errors;

    if (status === 400 && apiErrors) {
      const firstError = Object.values(apiErrors as Record<string, string[]>).flat()[0];
      return {
        success: false,
        error: firstError || apiMessage || "Données invalides.",
      };
    }

    return {
      success: false,
      error: apiMessage || "Erreur lors du changement de mot de passe.",
    };
  }
}
