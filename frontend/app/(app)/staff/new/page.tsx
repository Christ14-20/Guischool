import React from "react";
import { getBackendClient } from "@/lib/api/client";
import CreateStaffForm from "./CreateStaffForm";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  let subjects: { id: string; code: string; name: string }[] = [];

  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/subjects/");
    if (resp.data?.status === "success") {
      subjects = resp.data.data.results ?? [];
    }
  } catch {
    // Silently fallback to empty subjects list
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <CreateStaffForm subjects={subjects} />
      </div>
    </div>
  );
}
