"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { addSubjectToClassAction } from "./actions";

interface Props {
  classId: string;
  subjects: { id: string; code: string; name: string }[];
  teachers: { id: string; first_name: string; last_name: string }[];
}

export default function AddSubjectForm({ classId, subjects, teachers }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (subjects.length === 0) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addSubjectToClassAction(classId, null, formData);
      if (result.success) {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Plus className="size-4 text-accent" />
        Ajouter une matière
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-[10.5px] tracking-[.08em] uppercase text-text-faint">Matière</label>
          <select
            name="subject_id"
            required
            className="bg-card border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
          >
            <option value="">Choisir...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10.5px] tracking-[.08em] uppercase text-text-faint">Coeff.</label>
          <input
            type="number"
            name="coefficient"
            step="0.1"
            defaultValue={1}
            min={0.1}
            max={99.9}
            className="w-20 bg-card border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10.5px] tracking-[.08em] uppercase text-text-faint">H/sem.</label>
          <input
            type="number"
            name="weekly_hours"
            step="0.5"
            defaultValue={0}
            min={0}
            className="w-20 bg-card border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10.5px] tracking-[.08em] uppercase text-text-faint">Enseignant</label>
          <select
            name="teacher_id"
            className="bg-card border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors"
          >
            <option value="">Aucun</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Ajouter
        </button>

        {error && <span className="text-xs text-danger">{error}</span>}
        {success && <span className="text-xs" style={{ color: "var(--ok)" }}>Matière ajoutée ✓</span>}
      </form>
    </div>
  );
}
