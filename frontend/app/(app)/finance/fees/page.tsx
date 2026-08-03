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
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0">Gestion des frais</h1>
      </div>
      <div className="px-11 pb-12">
        <FeesClient
          categories={JSON.parse(JSON.stringify(categories))}
          studentFees={JSON.parse(JSON.stringify(studentFees))}
          schoolYears={JSON.parse(JSON.stringify(schoolYears))}
          role={role}
        />
      </div>
    </div>
  );
}
