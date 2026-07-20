"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Lock, Check, ShieldCheck, Users } from "lucide-react";
import {
  takeAttendanceAction,
  updateAttendanceAction,
  justifyAttendanceAction,
} from "./actions";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: string;
  is_locked: boolean;
}

interface Props {
  classeId: string;
  className: string;
  date: string;
  students: Student[];
  existing: AttendanceRecord[];
}

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Présent" },
  { value: "ABSENT", label: "Absent" },
  { value: "RETARD", label: "Retard" },
];

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  ABSENT_JUSTIFIE: "Absent justifié",
  RETARD: "Retard",
};

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ABSENT_JUSTIFIE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RETARD: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors";

export default function AttendanceGrid({
  classeId,
  className,
  date,
  students,
  existing,
}: Props) {
  const hasExisting = existing.length > 0;

  if (students.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-3">
        <Users className="size-8 text-slate-600" />
        Aucun élève actif dans cette classe.
      </div>
    );
  }

  return hasExisting ? (
    <EditMode
      className={className}
      date={date}
      students={students}
      existing={existing}
    />
  ) : (
    <EntryMode
      classeId={classeId}
      className={className}
      date={date}
      students={students}
    />
  );
}

function EntryMode({
  classeId,
  className,
  date,
  students,
}: {
  classeId: string;
  className: string;
  date: string;
  students: Student[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Record<string, { status: string; minutes_late: string }>
  >(() =>
    Object.fromEntries(
      students.map((s) => [s.id, { status: "PRESENT", minutes_late: "" }])
    )
  );

  const setStatus = (studentId: string, status: string) =>
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));

  const setMinutes = (studentId: string, minutes_late: string) =>
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], minutes_late },
    }));

  const setAll = (status: string) =>
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, { ...v, status }])
      )
    );

  const submit = () => {
    setError(null);
    const records = students.map((s) => {
      const row = rows[s.id];
      return {
        student_id: s.id,
        status: row.status,
        minutes_late:
          row.status === "RETARD" && row.minutes_late
            ? Number(row.minutes_late)
            : null,
      };
    });
    startTransition(async () => {
      const res = await takeAttendanceAction(classeId, date, records);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          {className} — {date}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Marquer tous :</span>
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAll(o.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Nom & Prénom</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Minutes de retard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {students.map((s) => {
                const row = rows[s.id];
                return (
                  <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                        {s.matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {s.nom} {s.prenom}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => setStatus(s.id, e.target.value)}
                        className={inputClass}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === "RETARD" ? (
                        <input
                          type="number"
                          min={0}
                          value={row.minutes_late}
                          onChange={(e) => setMinutes(s.id, e.target.value)}
                          placeholder="min"
                          className={`${inputClass} w-24`}
                        />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer tout
        </button>
      </div>
    </div>
  );
}

function EditMode({
  className,
  date,
  students,
  existing,
}: {
  className: string;
  date: string;
  students: Student[];
  existing: AttendanceRecord[];
}) {
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          {className} — {date}
        </h2>
        <span className="text-xs text-slate-500">
          Présences déjà enregistrées — correction possible tant que non verrouillées.
        </span>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Nom & Prénom</th>
                <th className="px-6 py-4">Statut actuel</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {existing.map((record) => (
                <EditRow
                  key={record.id}
                  record={record}
                  student={studentsById[record.student_id]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EditRow({
  record,
  student,
}: {
  record: AttendanceRecord;
  student?: Student;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(record.status);
  const [showJustify, setShowJustify] = useState(false);
  const [justifyText, setJustifyText] = useState("");

  const dirty = status !== record.status;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateAttendanceAction(record.id, { status });
      if (res.success) router.refresh();
      else setError(res.error);
    });
  };

  const justify = () => {
    setError(null);
    if (!justifyText.trim()) {
      setError("Le motif de justification est obligatoire.");
      return;
    }
    startTransition(async () => {
      const res = await justifyAttendanceAction(record.id, justifyText.trim());
      if (res.success) router.refresh();
      else setError(res.error);
    });
  };

  return (
    <tr className="hover:bg-slate-900/35 transition-colors align-top">
      <td className="px-6 py-4 font-medium text-white">
        {student ? `${student.nom} ${student.prenom}` : "—"}
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${
            STATUS_STYLES[record.status] ?? ""
          }`}
        >
          {STATUS_LABELS[record.status] ?? record.status}
        </span>
      </td>
      <td className="px-6 py-4">
        {record.is_locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="size-3.5" /> Verrouillé
          </span>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`${inputClass} w-40`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                {record.status === "ABSENT_JUSTIFIE" && (
                  <option value="ABSENT_JUSTIFIE">Absent justifié</option>
                )}
              </select>
              <button
                onClick={save}
                disabled={isPending || !dirty}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl disabled:opacity-40 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Enregistrer
              </button>
              {(record.status === "ABSENT" || record.status === "RETARD") && (
                <button
                  onClick={() => setShowJustify((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 text-xs font-medium rounded-xl cursor-pointer"
                >
                  <ShieldCheck className="size-3.5" /> Justifier
                </button>
              )}
            </div>

            {showJustify && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={justifyText}
                  onChange={(e) => setJustifyText(e.target.value)}
                  placeholder="Motif (ex : certificat médical)"
                  className={`${inputClass} w-72`}
                />
                <button
                  onClick={justify}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Confirmer
                </button>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
