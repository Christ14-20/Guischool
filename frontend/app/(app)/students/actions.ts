/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

interface EnrollStudentInput {
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance?: string;
  sexe: "M" | "F";
  classe_id: string;
  // SCHOOLYEAR-V2-02 : optionnel — défaut = année courante côté backend.
  school_year_id?: string;
  type_inscription: string;
  guardian: {
    lien: string;
    nom_complet: string;
    telephone: string;
    email?: string;
    is_contact_urgence: boolean;
  };
}

export async function enrollStudentAction(
  input: EnrollStudentInput,
  force = false
) {
  try {
    const client = await getBackendClient();
    const response = await client.post(
      `/students/${force ? "?force=true" : ""}`,
      input
    );
    revalidatePath("/students");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    const status = err.response?.status;
    const data = err.response?.data;
    return {
      success: false,
      data: null,
      status,
      error: data?.message || "Erreur lors de l'inscription de l'élève.",
      errors: data?.errors || null,
    };
  }
}

export async function updateStudentAction(id: string, payload: Record<string, any>) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/students/${id}/`, payload);
    revalidatePath(`/students/${id}`);
    revalidatePath("/students");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la mise à jour.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function reinscriptionAction(
  id: string,
  // SCHOOLYEAR-V2-02 : school_year_id optionnel — défaut = année courante.
  payload: { classe_id: string; school_year_id?: string }
) {
  try {
    const client = await getBackendClient();
    const response = await client.post(`/students/${id}/reinscription/`, payload);
    revalidatePath(`/students/${id}`);
    revalidatePath("/students");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la réinscription.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function archiveStudentAction(id: string, motif: string) {
  try {
    const client = await getBackendClient();
    const response = await client.post(`/students/${id}/archiver/`, { motif });
    revalidatePath(`/students/${id}`);
    revalidatePath("/students");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de l'archivage.",
    };
  }
}

export async function addGuardianAction(id: string, payload: Record<string, any>) {
  try {
    const client = await getBackendClient();
    const response = await client.post(`/students/${id}/guardians/`, payload);
    revalidatePath(`/students/${id}`);
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de l'ajout du responsable.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function fetchAllStudentsForExport(query: Record<string, string>) {
  try {
    const client = await getBackendClient();
    const parts: string[] = ["page_size=100"];
    for (const [k, v] of Object.entries(query)) {
      if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
    }
    const results: any[] = [];
    let page = 1;
    while (true) {
      const resp = await client.get(`/students/?${parts.join("&")}&page=${page}`);
      if (resp.data?.status !== "success") break;
      const data = resp.data.data;
      results.push(...(data.results ?? []));
      if (!data.next) break;
      page += 1;
      if (page > 50) break;
    }
    return { success: true, data: results };
  } catch {
    return { success: false, data: [] as any[] };
  }
}
