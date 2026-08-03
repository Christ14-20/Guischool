"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { createSchoolYearAction } from "./actions";

export default function CreateSchoolYearModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSchoolYearAction(null, formData);
      if (!result.success) {
        setError(result.error);
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
        Nouvelle année scolaire
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-line rounded-2xl shadow-[var(--shadow)] w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-lg font-medium text-text">Nouvelle année scolaire</h2>
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
                    Libellé
                  </label>
                  <input
                    type="text"
                    name="label"
                    required
                    placeholder="ex: 2025-2026"
                    className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Date début
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
                      Date fin
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
