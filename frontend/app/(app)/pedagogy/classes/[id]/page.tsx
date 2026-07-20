/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { ArrowLeft, BookOpen, Clock, Hash, GraduationCap, Users, DoorOpen } from "lucide-react";
import AddSubjectForm from "./AddSubjectForm";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  let classObj: any = null;
  let subjects: any[] = [];
  let availableSubjects: any[] = [];
  let teachers: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();

    const [classResp, subjectsResp, allSubjResp, teacherResp] = await Promise.all([
      client.get(`/pedagogy/classes/${id}/`).catch(() => ({ data: { status: "error" } })),
      client.get(`/pedagogy/classes/${id}/subjects/`),
      client.get("/pedagogy/subjects/"),
      client.get("/auth/teachers/").catch(() => ({ data: { data: [] as any[] } })),
    ]);

    if (classResp.data?.status === "success") {
      classObj = classResp.data.data;
    }
    if (subjectsResp.data?.status === "success") {
      subjects = subjectsResp.data.data ?? [];
    }
    if (allSubjResp.data?.status === "success") {
      availableSubjects = allSubjResp.data.data.results ?? [];
    }
    teachers = teacherResp.data?.data ?? [];
  } catch {
    errorMsg = "Impossible de charger les informations de la classe.";
  }

  if (!classObj && !errorMsg) {
    errorMsg = "Classe non trouvée.";
  }

  const assignedSubjectIds = new Set(subjects.map((s: any) => s.subject?.id));
  const unassignedSubjects = availableSubjects.filter(
    (s: any) => !assignedSubjectIds.has(s.id)
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/pedagogy/classes"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour aux classes
      </Link>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      {classObj && (
        <>
          {/* Class info header */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="size-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{classObj.name}</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    {classObj.level?.name || "Niveau non défini"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/50">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="size-3.5" /> Effectif
                </span>
                <p className="text-sm font-semibold text-white">
                  {classObj.current_headcount ?? 0} / {classObj.capacity ?? 60}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DoorOpen className="size-3.5" /> Salle
                </span>
                <p className="text-sm font-semibold text-white">{classObj.room || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="size-3.5" /> Matières
                </span>
                <p className="text-sm font-semibold text-white">{subjects.length}</p>
              </div>
              {classObj.main_teacher && (
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Professeur principal</span>
                  <p className="text-sm font-semibold text-white">
                    {classObj.main_teacher.first_name} {classObj.main_teacher.last_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subjects section */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md">
            <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="size-5 text-indigo-400" />
                Matières enseignées
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-full">
                {subjects.length} matière{subjects.length > 1 ? "s" : ""}
              </span>
            </div>

            {subjects.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                Aucune matière assignée à cette classe.
              </div>
            )}

            {subjects.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Matière</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4 text-center">Coefficient</th>
                      <th className="px-6 py-4 text-center">H. hebdo.</th>
                      <th className="px-6 py-4">Enseignant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                    {subjects.map((cs: any) => (
                      <tr key={cs.id} className="hover:bg-slate-900/35 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          {cs.subject?.name || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                            {cs.subject?.code || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Hash className="size-3 text-slate-500" />
                            {cs.coefficient}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3 text-slate-500" />
                            {cs.weekly_hours}h
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {cs.teacher
                            ? `${cs.teacher.first_name} ${cs.teacher.last_name}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add subject form */}
            <div className="px-6 py-4 border-t border-slate-800/50 bg-slate-900/20">
              <AddSubjectForm
                classId={id}
                subjects={unassignedSubjects}
                teachers={teachers}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
