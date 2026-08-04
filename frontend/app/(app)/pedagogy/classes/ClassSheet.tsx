"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Plus } from "lucide-react";
import { createClassAction } from "./actions";

interface Props {
  schoolYears: { id: string; label: string }[];
  levels: { id: string; name: string; cycle: string }[];
  teachers: { id: string; first_name: string; last_name: string }[];
  canOverrideSchoolYear?: boolean;
}

export default function ClassSheet({ schoolYears, levels, teachers, canOverrideSchoolYear }: Props) {
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
      const result = await createClassAction(null, formData);
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
        Nouvelle classe
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l border-line shadow-[var(--shadow)] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <h2 className="font-serif text-lg font-medium text-text">Nouvelle classe</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-text-faint hover:text-text transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                    Nom de la classe *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="ex: 6ème A"
                    className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                  />
                </div>

                {canOverrideSchoolYear && (
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Année scolaire <span className="normal-case text-text-faint">(par défaut : année courante)</span>
                    </label>
                    <select
                      name="school_year"
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    >
                      <option value="">Année courante (par défaut)</option>
                      {schoolYears.map((sy) => (
                        <option key={sy.id} value={sy.id}>
                          {sy.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                    Niveau *
                  </label>
                  <select
                    name="level_id"
                    required
                    className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                  >
                    <option value="">Sélectionner...</option>
                    {levels.map((lv) => (
                      <option key={lv.id} value={lv.id}>
                        {lv.name} ({lv.cycle})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Capacité
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      defaultValue={60}
                      min={1}
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                      Salle
                    </label>
                    <input
                      type="text"
                      name="room"
                      placeholder="ex: Salle 12"
                      className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
                    Professeur principal
                  </label>
                  <select
                    name="main_teacher_id"
                    className="w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-accent-line transition-colors"
                  >
                    <option value="">Aucun</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
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

                <div className="flex gap-3 pt-4 border-t border-line">
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
                    Créer la classe
                  </button>
                </div>
              </form>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
