/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import FeesClient from "./FeesClient";

export const dynamic = "force-dynamic";

async function fetchFeeCategories() {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/feecategories/");
    const data = resp.data;
    return data?.data?.results ?? data?.data ?? data?.results ?? [];
  } catch {
    return [];
  }
}

async function fetchStudentFees() {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/student-fees/");
    const data = resp.data;
    return data?.data?.results ?? data?.data ?? data?.results ?? [];
  } catch {
    return [];
  }
}

async function fetchSchoolYears() {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/schoolyears/");
    const data = resp.data;
    return data?.data?.results ?? data?.data ?? data?.results ?? [];
  } catch {
    return [];
  }
}

export default async function FeesPage() {
  const session = await auth();
  const role = (session as any)?.user?.role;

  const [categories, studentFees, schoolYears] = await Promise.all([
    fetchFeeCategories(),
    fetchStudentFees(),
    fetchSchoolYears(),
  ]);

  return (
    <div className="p-7 px-8">
      <h1 className="text-2xl font-bold text-white mb-6">Gestion des frais</h1>
      <FeesClient
        categories={JSON.parse(JSON.stringify(categories))}
        studentFees={JSON.parse(JSON.stringify(studentFees))}
        schoolYears={JSON.parse(JSON.stringify(schoolYears))}
        role={role}
      />
    </div>
  );
}
