/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { getBackendClient } from "@/lib/api/client";
import { BookOpen, Hash, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import CreateSubjectModal from "./CreateSubjectModal";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  let subjects: any[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/pedagogy/subjects/");
    if (resp.data?.status === "success") {
      subjects = resp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger les matières.";
  }

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start gap-4 px-11 pt-9 pb-[22px]">
        <Link
          href="/pedagogy/classes"
          className="text-text-faint hover:text-accent transition-colors mt-1.5"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Matières</h1>
            <p className="m-0 text-text-soft text-[13.5px]">
              Gérez les matières enseignées dans l&apos;établissement
            </p>
          </div>
          <CreateSubjectModal />
        </div>
      </div>

      <div className="px-11 pb-12 space-y-[22px]">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
          {subjects.length === 0 && !errorMsg && (
            <div className="p-10 text-center text-text-faint">
              Aucune matière pour le moment. Créez-en une avec le bouton ci-dessus.
            </div>
          )}

          {subjects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Code</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom</th>
                    <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Catégorie</th>
                    <th className="text-center text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Officielle</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {subjects.map((s: any) => (
                    <tr key={s.id} className="hover:bg-paper-alt transition-colors">
                      <td className="px-6 py-4 border-b border-line last:border-b-0">
                        <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                          {s.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b border-line font-medium">
                        <span className="flex items-center gap-2">
                          <BookOpen className="size-4 text-accent" />
                          {s.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b border-line">
                        <span className="inline-flex items-center gap-1 text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                          <Hash className="size-3" />
                          {s.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b border-line text-center">
                        {s.is_official ? (
                          <CheckCircle className="size-4 inline-block" style={{ color: "var(--ok)" }} />
                        ) : (
                          <XCircle className="size-4 text-text-faint inline-block" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
