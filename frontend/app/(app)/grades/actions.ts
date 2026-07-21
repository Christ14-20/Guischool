/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

export async function getEvaluations(classId: string, periodId: string) {
  try {
    const client = await getBackendClient();
    const params = new URLSearchParams();
    if (classId) params.append("classe_id", classId);
    if (periodId) params.append("period_id", periodId);
    const resp = await client.get(`/pedagogy/evaluations/?${params.toString()}`);
    const data = resp.data?.data?.results ?? resp.data?.data ?? resp.data ?? [];
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.response?.data?.message || "Erreur de chargement des évaluations." };
  }
}

export async function getPeriods(schoolYearId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/pedagogy/school-years/${schoolYearId}/periods/`);
    const data = resp.data?.data?.results ?? resp.data?.data ?? resp.data ?? [];
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.response?.data?.message || "Erreur de chargement des périodes." };
  }
}

export async function getGrades(evaluationId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/pedagogy/grades/?evaluation_id=${evaluationId}`);
    const data = resp.data?.data?.results ?? resp.data?.data ?? resp.data ?? [];
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.response?.data?.message || "Erreur de chargement des notes." };
  }
}

export async function getStudentsByClass(classId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.get(`/students/?classe_id=${classId}&statut=ACTIF&page_size=200`);
    const data = resp.data?.data?.results ?? [];
    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: [], error: err.response?.data?.message || "Erreur de chargement des élèves." };
  }
}

export async function createEvaluationAction(data: any) {
  try {
    const client = await getBackendClient();
    const resp = await client.post("/pedagogy/evaluations/", data);
    revalidatePath("/grades");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la création de l'évaluation.",
      errors: err.response?.data?.errors,
    };
  }
}

export async function bulkSaveGradesAction(evaluationId: string, grades: any[]) {
  try {
    const client = await getBackendClient();
    const resp = await client.post("/pedagogy/grades/bulk/", {
      evaluation_id: evaluationId,
      grades,
    });
    revalidatePath("/grades");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de l'enregistrement des notes.",
      errors: err.response?.data?.errors,
    };
  }
}

export async function lockEvaluationAction(evaluationId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.patch(`/pedagogy/evaluations/${evaluationId}/lock/`);
    revalidatePath("/grades");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors du verrouillage.",
    };
  }
}

export async function validateGradeAction(gradeId: string) {
  try {
    const client = await getBackendClient();
    const resp = await client.post(`/grades/${gradeId}/valider/`);
    revalidatePath("/grades");
    return { success: true, data: resp.data?.data ?? resp.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.response?.data?.message || "Erreur lors de la validation.",
    };
  }
}
