"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Plus } from "lucide-react";
import { createPeriodAction } from "./actions";

interface Props {
  schoolYearId: string;
}

export default function CreatePeriodModal({ schoolYearId }: Props) {
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
      const result = await createPeriodAction(schoolYearId, null, formData);
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
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Plus className="size-4" />
        Nouvelle période
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-line rounded-2xl shadow-[var(--shadow)] w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-lg font-medium text-text">Nouvelle période</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-text-faint hover:text-text transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                    Nom *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="ex: Semestre 1"
                    className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Type *
                    </label>
                    <select
                      name="type"
                      required
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    >
                      <option value="TRIMESTRE">Trimestre</option>
                      <option value="SEMESTRE">Semestre</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Ordre *
                    </label>
                    <input
                      type="number"
                      name="order"
                      required
                      defaultValue={1}
                      min={1}
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Date début *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Date fin *
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg text-sm bg-danger/10 border border-danger/20 text-danger">
                    {error}
                    {fieldErrors && Object.entries(fieldErrors).map(([field, msgs]) => (
                      <div key={field} className="mt-1 text-xs opacity-80">
                        {field}: {msgs.join(", ")}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-line text-text-soft text-sm font-semibold hover:border-accent-line hover:text-text transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
