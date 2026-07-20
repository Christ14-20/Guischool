/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getBackendClient } from "@/lib/api/client";
import { revalidatePath } from "next/cache";

interface AttendanceRecordInput {
  student_id: string;
  status: string;
  minutes_late?: number | null;
}

export async function takeAttendanceAction(
  classeId: string,
  date: string,
  records: AttendanceRecordInput[]
) {
  try {
    const client = await getBackendClient();
    const response = await client.post("/pedagogy/attendances/", {
      classe_id: classeId,
      date,
      records,
    });
    revalidatePath("/attendance");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      status: err.response?.status,
      error:
        err.response?.data?.message ||
        "Erreur lors de l'enregistrement des présences.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function updateAttendanceAction(
  id: string,
  payload: { status?: string; minutes_late?: number | null }
) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/pedagogy/attendances/${id}/`, payload);
    revalidatePath("/attendance");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      status: err.response?.status,
      error: err.response?.data?.message || "Erreur lors de la correction.",
      errors: err.response?.data?.errors || null,
    };
  }
}

export async function justifyAttendanceAction(
  id: string,
  justification_text: string
) {
  try {
    const client = await getBackendClient();
    const response = await client.patch(`/pedagogy/attendances/${id}/justify/`, {
      justification_text,
    });
    revalidatePath("/attendance");
    return { success: true, data: response.data.data, error: null };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      status: err.response?.status,
      error: err.response?.data?.message || "Erreur lors de la justification.",
      errors: err.response?.data?.errors || null,
    };
  }
}
