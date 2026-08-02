/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import { GraduationCap, Users, DoorOpen } from "lucide-react";
import ClassSheet from "./ClassSheet";
import LevelFilterSelect from "./LevelFilterSelect";

export const dynamic = "force-dynamic";

interface ClassesPageProps {
  searchParams: Promise<{
    level_id?: string;
  }>;
}

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const params = await searchParams;
  const levelFilter = params.level_id || "";
  const session = await auth();
  const role = (session as any)?.user?.role;

  let classes: any[] = [];
  let levels: any[] = [];
  let schoolYears: any[] = [];
  let teachers: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const [classesResp, levelsResp, syResp, teacherResp] = await Promise.all([
      client.get(`/pedagogy/classes/${levelFilter ? `?level_id=${levelFilter}` : ""}`),
      client.get("/pedagogy/levels/"),
      client.get("/pedagogy/schoolyears/"),
      client.get("/auth/teachers/").catch(() => ({ data: { data: [] as any[] } })),
    ]);

    if (classesResp.data?.status === "success") {
      classes = classesResp.data.data.results ?? [];
    }
    if (Array.isArray(levelsResp.data)) {
      levels = levelsResp.data;
    } else if (levelsResp.data?.status === "success") {
      levels = levelsResp.data.data ?? [];
    }
    if (syResp.data?.status === "success") {
      schoolYears = syResp.data.data.results ?? [];
    }
    teachers = teacherResp.data?.data ?? [];
  } catch {
    errorMsg = "Impossible de charger les classes.";
  }

  const groupedByLevel: Record<string, any[]> = {};
  for (const cls of classes) {
    const levelName = cls.level?.name || "Sans niveau";
    if (!groupedByLevel[levelName]) groupedByLevel[levelName] = [];
    groupedByLevel[levelName].push(cls);
  }

  return (
    <div className="space-y-8 animate-fade-in p-7 px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Classes
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les classes et leurs matières
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ClassSheet
            schoolYears={schoolYears}
            levels={levels}
            teachers={teachers}
            role={role}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {/* Level filter */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <form method="get" className="flex items-center gap-4">
          <LevelFilterSelect levels={levels} defaultValue={levelFilter} />
          {levelFilter && (
            <Link
              href="/pedagogy/classes"
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Réinitialiser
            </Link>
          )}
        </form>
      </div>

      {/* Classes by level */}
      {Object.keys(groupedByLevel).length === 0 && !errorMsg && (
        <div className="p-10 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl">
          Aucune classe trouvée.
        </div>
      )}

      {Object.entries(groupedByLevel).map(([levelName, clsList]) => (
        <div key={levelName} className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="size-5 text-indigo-400" />
            {levelName}
            <span className="text-sm font-normal text-slate-500">
              ({clsList.length} classe{clsList.length > 1 ? "s" : ""})
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clsList.map((cls: any) => (
              <Link
                key={cls.id}
                href={`/pedagogy/classes/${cls.id}`}
                className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-3 hover:border-indigo-500/50 transition-all hover:shadow-indigo-500/5 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cls.level?.name || "Niveau non défini"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <DoorOpen className="size-3.5" />
                    {cls.room || "—"}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800/50 pt-3">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {cls.current_headcount ?? 0}/{cls.capacity ?? 60}
                  </span>
                  {cls.main_teacher && (
                    <span className="text-slate-500">
                      {cls.main_teacher.first_name} {cls.main_teacher.last_name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
