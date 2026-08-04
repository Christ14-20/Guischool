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
  canTakeAttendance?: boolean;
  canJustify?: boolean;
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
  PRESENT: "var(--ok)",
  ABSENT: "var(--danger)",
  ABSENT_JUSTIFIE: "var(--warn)",
  RETARD: "var(--info)",
};

const inputClass =
  "w-full bg-paper-alt border border-line rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent-line transition-colors";

export default function AttendanceGrid({
  classeId,
  className,
  date,
  students,
  existing,
  canTakeAttendance,
  canJustify,
}: Props) {
  const hasExisting = existing.length > 0;

  if (students.length === 0) {
    return (
      <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl flex flex-col items-center gap-3">
        <Users className="size-8 text-text-faint" />
        Aucun élève actif dans cette classe.
      </div>
    );
  }

  if (hasExisting) {
    return (
      <EditMode
        className={className}
        date={date}
        students={students}
        existing={existing}
        canTakeAttendance={canTakeAttendance}
        canJustify={canJustify}
      />
    );
  }

  if (!canTakeAttendance) {
    return (
      <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl flex flex-col items-center gap-3">
        <Users className="size-8 text-text-faint" />
        Aucune présence enregistrée pour cette classe à cette date. Vous n&apos;avez pas la permission de saisir les présences.
      </div>
    );
  }

  return (
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
        <h2 className="font-serif text-lg font-medium">
          {className} — {date}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-faint">Marquer tous :</span>
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAll(o.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text transition-colors cursor-pointer"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Matricule</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom & Prénom</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Minutes de retard</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {students.map((s) => {
                const row = rows[s.id];
                return (
                  <tr key={s.id} className="hover:bg-paper-alt transition-colors">
                    <td className="px-6 py-4 border-b border-line last:border-b-0">
                      <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                        {s.matricule}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-line font-medium">
                      {s.nom} {s.prenom}
                    </td>
                    <td className="px-6 py-4 border-b border-line">
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
                    <td className="px-6 py-4 border-b border-line">
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
                        <span className="text-text-faint">—</span>
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
        <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-white font-medium transition-opacity disabled:opacity-50 cursor-pointer"
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
  canTakeAttendance,
  canJustify,
}: {
  className: string;
  date: string;
  students: Student[];
  existing: AttendanceRecord[];
  canTakeAttendance?: boolean;
  canJustify?: boolean;
}) {
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-medium">
          {className} — {date}
        </h2>
        <span className="text-xs text-text-faint">
          Présences déjà enregistrées — correction possible tant que non verrouillées.
        </span>
      </div>

      <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Nom & Prénom</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut actuel</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {existing.map((record) => (
                <EditRow
                  key={record.id}
                  record={record}
                  student={studentsById[record.student_id]}
                  canTakeAttendance={canTakeAttendance}
                  canJustify={canJustify}
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
  canTakeAttendance,
  canJustify,
}: {
  record: AttendanceRecord;
  student?: Student;
  canTakeAttendance?: boolean;
  canJustify?: boolean;
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
    <tr className="hover:bg-paper-alt transition-colors align-top">
      <td className="px-6 py-4 border-b border-line last:border-b-0 font-medium">
        {student ? `${student.nom} ${student.prenom}` : "—"}
      </td>
      <td className="px-6 py-4 border-b border-line">
        <span
          className="inline-flex items-center gap-[7px] text-[12.5px]"
          style={{ color: STATUS_STYLES[record.status] ?? "var(--mute)" }}
        >
          <span
            className="size-[9px] rounded-full border-2"
            style={{ borderColor: STATUS_STYLES[record.status] ?? "var(--mute)" }}
          />
          {STATUS_LABELS[record.status] ?? record.status}
        </span>
      </td>
      <td className="px-6 py-4 border-b border-line">
        {record.is_locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-faint">
            <Lock className="size-3.5" /> Verrouillé
          </span>
        ) : !canTakeAttendance && !canJustify ? (
          <span className="text-text-faint text-xs">—</span>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {canTakeAttendance && (
                <>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-medium disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Enregistrer
                  </button>
                </>
              )}
              {canJustify && (record.status === "ABSENT" || record.status === "RETARD") && (
                <button
                  onClick={() => setShowJustify((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ color: "var(--warn)", boxShadow: "inset 0 0 0 1px var(--warn)" }}
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-50 cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: "var(--warn)" }}
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Confirmer
                </button>
              </div>
            )}

            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
