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
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-12">
        <Link
          href="/pedagogy/classes"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-soft hover:text-accent transition-colors no-underline mb-[18px]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux classes
        </Link>

        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        {classObj && (
          <>
            {/* Class info header */}
            <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] mb-[22px]">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
                  <GraduationCap className="size-7" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-medium">{classObj.name}</h1>
                  <p className="text-sm text-text-soft mt-1">
                    {classObj.level?.name || "Niveau non défini"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-line">
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint flex items-center gap-1.5">
                    <Users className="size-3.5" /> Effectif
                  </span>
                  <p className="text-sm font-semibold">
                    {classObj.current_headcount ?? 0} / {classObj.capacity ?? 60}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint flex items-center gap-1.5">
                    <DoorOpen className="size-3.5" /> Salle
                  </span>
                  <p className="text-sm font-semibold">{classObj.room || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint flex items-center gap-1.5">
                    <BookOpen className="size-3.5" /> Matières
                  </span>
                  <p className="text-sm font-semibold">{subjects.length}</p>
                </div>
                {classObj.main_teacher && (
                  <div className="space-y-1">
                    <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">Professeur principal</span>
                    <p className="text-sm font-semibold">
                      {classObj.main_teacher.first_name} {classObj.main_teacher.last_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Subjects section */}
            <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <h2 className="font-serif text-lg font-medium flex items-center gap-2">
                  <BookOpen className="size-5 text-accent" />
                  Matières enseignées
                </h2>
                <span className="text-xs text-text-soft border border-line px-2.5 py-1 rounded-full">
                  {subjects.length} matière{subjects.length > 1 ? "s" : ""}
                </span>
              </div>

              {subjects.length === 0 && (
                <div className="p-10 text-center text-text-faint">
                  Aucune matière assignée à cette classe.
                </div>
              )}

              {subjects.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Matière</th>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Code</th>
                        <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Coefficient</th>
                        <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">H. hebdo.</th>
                        <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Enseignant</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {subjects.map((cs: any) => (
                        <tr key={cs.id} className="hover:bg-paper-alt transition-colors">
                          <td className="px-6 py-4 border-b border-line last:border-b-0 font-medium">
                            {cs.subject?.name || "—"}
                          </td>
                          <td className="px-6 py-4 border-b border-line">
                            <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                              {cs.subject?.code || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-b border-line text-center">
                            <span className="inline-flex items-center gap-1">
                              <Hash className="size-3 text-text-faint" />
                              {cs.coefficient}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-b border-line text-center">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3 text-text-faint" />
                              {cs.weekly_hours}h
                            </span>
                          </td>
                          <td className="px-6 py-4 border-b border-line text-text-soft">
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
              <div className="px-6 py-4 border-t border-line bg-paper-alt rounded-b-xl">
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
    </div>
  );
}
