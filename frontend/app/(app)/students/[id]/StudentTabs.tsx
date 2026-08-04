/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  Wallet,
  History,
  Phone,
  Mail,
  Loader2,
  Archive,
  RefreshCw,
  Check,
  X,
  CalendarCheck,
} from "lucide-react";
import StatutBadge from "../StatutBadge";
import StudentGradesTab from "./StudentGradesTab";
import StudentFinancesTab from "./StudentFinancesTab";
import {
  updateStudentAction,
  archiveStudentAction,
  reinscriptionAction,
} from "../actions";
import { PERMISSIONS, hasPermission, hasAnyPermission } from "@/lib/permissions";

interface Props {
  student: any;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  attendances?: any[];
  invoices?: any[];
  payments?: any[];
  permissions?: string[];
}

const ALL_TABS = [
  { key: "profil", label: "Profil", icon: User, permissions: null },
  { key: "presences", label: "Présences", icon: CalendarCheck, permissions: null },
  { key: "notes", label: "Notes", icon: BookOpen, permissions: null },
  { key: "finances", label: "Finances", icon: Wallet, permissions: [PERMISSIONS.FINANCE_READ] },
  { key: "historique", label: "Historique", icon: History, permissions: null },
];

const inputClass =
  "w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function StudentTabs({
  student,
  classes,
  schoolYears,
  attendances = [],
  invoices = [],
  payments = [],
  permissions,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("profil");
  const TABS = ALL_TABS.filter((t) => !t.permissions || hasAnyPermission(permissions, t.permissions));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-xl font-semibold">
              {student.prenom?.[0]}
              {student.nom?.[0]}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-medium">
                {student.nom} {student.prenom}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs bg-paper-alt border border-line px-2 py-0.5 rounded text-text-soft">
                  {student.matricule}
                </span>
                <StatutBadge statut={student.statut} />
                <span className="text-sm text-text-soft">
                  {student.classe_actuelle?.name || "Sans classe"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs nav */}
      <div className="flex gap-1 border-b border-line">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === key
                ? "border-accent text-text"
                : "border-transparent text-text-faint hover:text-text"
              }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <ProfilTab
          student={student}
          classes={classes}
          schoolYears={schoolYears}
          permissions={permissions}
          onChanged={() => router.refresh()}
        />
      )}
      {tab === "presences" && <PresencesTab attendances={attendances} />}
      {tab === "notes" && <StudentGradesTab studentId={student.id} permissions={permissions} />}
      {tab === "finances" && <StudentFinancesTab invoices={invoices} payments={payments} />}
      {tab === "historique" && <HistoriqueTab enrollments={student.enrollments ?? []} />}
    </div>
  );
}

const PRESENCE_LABELS: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  ABSENT_JUSTIFIE: "Absent justifié",
  RETARD: "Retard",
};

const PRESENCE_STYLES: Record<string, { color: string }> = {
  PRESENT: { color: "var(--ok)" },
  ABSENT: { color: "var(--danger)" },
  ABSENT_JUSTIFIE: { color: "var(--warn)" },
  RETARD: { color: "var(--info)" },
};

function PresencesTab({ attendances }: { attendances: any[] }) {
  const total = attendances.length;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const absent = attendances.filter(
    (a) => a.status === "ABSENT" || a.status === "ABSENT_JUSTIFIE"
  ).length;
  const retard = attendances.filter((a) => a.status === "RETARD").length;
  const taux = total > 0 ? Math.round((present / total) * 100) : null;

  const sorted = [...attendances].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Taux d'assiduité" value={taux === null ? "—" : `${taux}%`} color="var(--accent)" />
        <StatCard label="Présences" value={String(present)} color="var(--ok)" />
        <StatCard label="Absences" value={String(absent)} color="var(--danger)" />
        <StatCard label="Retards" value={String(retard)} color="var(--info)" />
      </div>

      {total === 0 ? (
        <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl">
          Aucune présence enregistrée pour cet élève.
        </div>
      ) : (
        <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Date</th>
                <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Statut</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sorted.map((a: any) => (
                <tr key={a.id} className="hover:bg-paper-alt transition-colors">
                  <td className="px-6 py-4 border-b border-line last:border-b-0">{a.date}</td>
                  <td className="px-6 py-4 border-b border-line">
                    <span
                      className="inline-flex items-center gap-[7px] text-[12.5px]"
                      style={{ color: PRESENCE_STYLES[a.status]?.color ?? "var(--mute)" }}
                    >
                      <span
                        className="size-[9px] rounded-full border-2"
                        style={{ borderColor: PRESENCE_STYLES[a.status]?.color ?? "var(--mute)" }}
                      />
                      {PRESENCE_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)]">
      <p className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

function ProfilTab({
  student,
  classes,
  schoolYears,
  permissions,
  onChanged,
}: {
  student: any;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  permissions?: string[];
  onChanged: () => void;
}) {
  const canUpdate = hasPermission(permissions, PERMISSIONS.ELEVES_UPDATE);
  const canOverrideSchoolYear = hasPermission(permissions, PERMISSIONS.SCHOOLYEAR_OVERRIDE);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lieu, setLieu] = useState(student.lieu_naissance || "");

  const [showReinscription, setShowReinscription] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const saveProfil = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateStudentAction(student.id, { lieu_naissance: lieu });
      if (res.success) {
        setEditing(false);
        onChanged();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identité */}
        <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
              Identité
            </h3>
            {canUpdate && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-accent hover:opacity-80 cursor-pointer"
              >
                Modifier
              </button>
            )}
          </div>
          <Field label="Nom" value={student.nom} />
          <Field label="Prénom" value={student.prenom} />
          <Field label="Date de naissance" value={student.date_naissance} />
          <Field label="Sexe" value={student.sexe === "F" ? "Féminin" : "Masculin"} />
          <div className="space-y-1">
            <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">
              Lieu de naissance
            </span>
            {editing ? (
              <div className="flex gap-2">
                <input
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className={inputClass}
                />
                <button
                  onClick={saveProfil}
                  disabled={isPending}
                  className="px-3 bg-accent hover:opacity-90 text-white rounded-lg disabled:opacity-50 cursor-pointer transition-opacity"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setLieu(student.lieu_naissance || "");
                  }}
                  className="px-3 border border-line hover:border-accent-line text-text rounded-lg cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium">
                {student.lieu_naissance || "—"}
              </p>
            )}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        {/* Responsables */}
        <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Responsables légaux
          </h3>
          {(student.guardians ?? []).length === 0 && (
            <p className="text-sm text-text-faint">Aucun responsable enregistré.</p>
          )}
          {(student.guardians ?? []).map((g: any) => (
            <div
              key={g.id}
              className="border border-line rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{g.nom_complet}</span>
                <span className="text-xs text-text-faint">{g.lien}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-soft">
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" /> {g.telephone}
                </span>
                {g.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3.5" /> {g.email}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {canUpdate && (
        <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowReinscription((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="size-4" /> Réinscrire
            </button>
            {student.statut !== "ARCHIVE" && (
              <button
                onClick={() => setShowArchive((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-danger text-sm font-medium transition-colors cursor-pointer"
                style={{ boxShadow: "inset 0 0 0 1px var(--danger)" }}
              >
                <Archive className="size-4" /> Archiver
              </button>
            )}
          </div>

          {showReinscription && (
            <ReinscriptionForm
              studentId={student.id}
              classes={classes}
              schoolYears={schoolYears}
              canOverrideSchoolYear={canOverrideSchoolYear}
              onDone={() => {
                setShowReinscription(false);
                onChanged();
              }}
            />
          )}
          {showArchive && (
            <ArchiveForm
              studentId={student.id}
              onDone={() => {
                setShowArchive(false);
                onChanged();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReinscriptionForm({
  studentId,
  classes,
  schoolYears,
  canOverrideSchoolYear,
  onDone,
}: {
  studentId: string;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  canOverrideSchoolYear?: boolean;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [classeId, setClasseId] = useState("");
  const [yearId, setYearId] = useState("");

  const submit = () => {
    setError(null);
    if (!classeId) {
      setError("La classe est obligatoire.");
      return;
    }
    startTransition(async () => {
      const res = await reinscriptionAction(studentId, {
        classe_id: classeId,
        // Omis si non renseigné : le backend défaut sur l'année courante.
        ...(yearId ? { school_year_id: yearId } : {}),
      });
      if (res.success) onDone();
      else setError(res.error);
    });
  };

  return (
    <div className="border border-line rounded-xl p-4 space-y-3 bg-paper-alt">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {canOverrideSchoolYear && (
          <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={inputClass}>
            <option value="">Année courante (par défaut)</option>
            {schoolYears.map((sy) => (
              <option key={sy.id} value={sy.id}>
                {sy.label}
              </option>
            ))}
          </select>
        )}
        <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className={inputClass}>
          <option value="">Classe...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 cursor-pointer transition-opacity"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Confirmer la réinscription
      </button>
    </div>
  );
}

function ArchiveForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [motif, setMotif] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await archiveStudentAction(studentId, motif);
      if (res.success) onDone();
      else setError(res.error);
    });
  };

  return (
    <div className="border border-danger/20 rounded-xl p-4 space-y-3 bg-danger/5">
      <input
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Motif (ex: Fin de scolarité)"
        className={inputClass}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: "var(--danger)" }}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Confirmer l&apos;archivage
      </button>
    </div>
  );
}

function HistoriqueTab({ enrollments }: { enrollments: any[] }) {
  if (!enrollments.length) {
    return (
      <div className="p-12 text-center text-text-faint border border-line bg-card rounded-xl">
        Aucun historique d&apos;inscription.
      </div>
    );
  }
  return (
    <div className="border border-line bg-card rounded-xl shadow-[var(--shadow)]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Année</th>
            <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Classe</th>
            <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Type</th>
            <th className="text-left text-[10.5px] tracking-[.08em] uppercase text-text-faint font-medium px-6 py-4 border-b border-line">Date</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {enrollments.map((e: any) => (
            <tr key={e.id} className="hover:bg-paper-alt transition-colors">
              <td className="px-6 py-4 border-b border-line last:border-b-0">{e.school_year?.label}</td>
              <td className="px-6 py-4 border-b border-line">{e.classe?.name}</td>
              <td className="px-6 py-4 border-b border-line">{e.type_inscription}</td>
              <td className="px-6 py-4 border-b border-line text-text-soft">{e.date_inscription}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="space-y-1">
      <span className="text-[10.5px] tracking-[.08em] uppercase text-text-faint">{label}</span>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
