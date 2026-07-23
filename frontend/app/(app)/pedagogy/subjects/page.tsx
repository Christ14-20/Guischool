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
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          href="/pedagogy/classes"
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Matières
            </h1>
            <p className="text-slate-400 mt-1">
              Gérez les matières enseignées dans l&apos;établissement
            </p>
          </div>
          <CreateSubjectModal />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        {subjects.length === 0 && !errorMsg && (
          <div className="p-10 text-center text-slate-500">
            Aucune matière pour le moment. Créez-en une avec le bouton ci-dessus.
          </div>
        )}

        {subjects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Nom</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4 text-center">Officielle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
                {subjects.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      <span className="flex items-center gap-2">
                        <BookOpen className="size-4 text-indigo-400" />
                        {s.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                        <Hash className="size-3" />
                        {s.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.is_official ? (
                        <CheckCircle className="size-4 text-emerald-400 inline-block" />
                      ) : (
                        <XCircle className="size-4 text-slate-600 inline-block" />
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
  );
}
