"use client";

import { useState, useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { createSubjectAction } from "./actions";

export default function CreateSubjectModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSubjectAction(null, formData);
      if (!result.success) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? null);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
      >
        Nouvelle matière
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Nouvelle matière</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="ex: MATH"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Catégorie *
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="PRIMARY">PRIMARY</option>
                    <option value="SECONDARY">SECONDARY</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nom *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="ex: Mathématiques"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="hidden"
                  name="is_official"
                  value="true"
                />
                <input
                  type="checkbox"
                  name="is_official"
                  id="is_official"
                  defaultChecked
                  onChange={(e) => {
                    const hidden = e.currentTarget.form?.querySelector(
                      'input[name="is_official"]'
                    ) as HTMLInputElement;
                    if (hidden) hidden.value = e.target.checked ? "true" : "false";
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="is_official" className="text-sm text-slate-300">
                  Matière officielle (incluse dans le programme)
                </label>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                  {error}
                  {fieldErrors && Object.entries(fieldErrors).map(([field, msgs]) => (
                    <div key={field} className="mt-1 text-xs text-destructive/80">
                      {field}: {msgs.join(", ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
