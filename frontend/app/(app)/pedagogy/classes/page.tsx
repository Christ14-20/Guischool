/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import { GraduationCap, Users, DoorOpen } from "lucide-react";
import ClassSheet from "./ClassSheet";
import LevelFilterSelect from "./LevelFilterSelect";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

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
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  const canCreateClass = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_CREATE);
  const canOverrideSchoolYear = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_OVERRIDE);

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
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Classes</h1>
          <p className="m-0 text-text-soft text-[13.5px]">Gérez les classes et leurs matières</p>
        </div>
        {canCreateClass && (
          <ClassSheet
            schoolYears={schoolYears}
            levels={levels}
            teachers={teachers}
            canOverrideSchoolYear={canOverrideSchoolYear}
          />
        )}
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {/* Level filter */}
        <div className="border border-line bg-card rounded-xl p-4 shadow-[var(--shadow)]">
          <form method="get" className="flex items-center gap-4">
            <LevelFilterSelect levels={levels} defaultValue={levelFilter} />
            {levelFilter && (
              <Link
                href="/pedagogy/classes"
                className="px-3 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-sm font-medium transition-colors"
              >
                Réinitialiser
              </Link>
            )}
          </form>
        </div>

        {/* Classes by level */}
        {Object.keys(groupedByLevel).length === 0 && !errorMsg && (
          <div className="p-10 text-center text-text-faint border border-line bg-card rounded-xl">
            Aucune classe trouvée.
          </div>
        )}

        {Object.entries(groupedByLevel).map(([levelName, clsList]) => (
          <div key={levelName} className="space-y-3">
            <h2 className="font-serif text-[16.5px] font-medium flex items-center gap-2">
              <GraduationCap className="size-5 text-accent" />
              {levelName}
              <span className="text-sm font-sans font-normal text-text-faint">
                ({clsList.length} classe{clsList.length > 1 ? "s" : ""})
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clsList.map((cls: any) => (
                <Link
                  key={cls.id}
                  href={`/pedagogy/classes/${cls.id}`}
                  className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] space-y-3 hover:border-accent-line transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[14.5px] group-hover:text-accent transition-colors">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-text-faint mt-0.5">
                        {cls.level?.name || "Niveau non défini"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-faint">
                      <DoorOpen className="size-3.5" />
                      {cls.room || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-soft border-t border-line pt-3">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {cls.current_headcount ?? 0}/{cls.capacity ?? 60}
                    </span>
                    {cls.main_teacher && (
                      <span className="text-text-faint">
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
    </div>
  );
}
