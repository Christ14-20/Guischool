/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";

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

    // Le mot de passe est changé côté Django (must_change_password=False
    // en base), mais le JWT NextAuth en session le sait encore mustChangePassword=true
    // tant qu'on ne le lui dit pas explicitement — le token n'est sinon
    // recalculé qu'au prochain refresh (~15 min) ou à la reconnexion. Sans
    // ça, le garde `authorized` (auth.config.ts) renverrait l'utilisateur
    // en boucle vers /change-password dès la navigation suivante.
    await unstable_update({ user: { mustChangePassword: false } as any });

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
