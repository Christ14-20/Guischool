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

interface Props {
  student: any;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  attendances?: any[];
  invoices?: any[];
  payments?: any[];
  role?: string;
}

const ALL_TABS = [
  { key: "profil", label: "Profil", icon: User, roles: null },
  { key: "presences", label: "Présences", icon: CalendarCheck, roles: null },
  { key: "notes", label: "Notes", icon: BookOpen, roles: null },
  { key: "finances", label: "Finances", icon: Wallet, roles: ["DIRECTOR", "ACCOUNTANT", "STUDENT_STUDIES"] },
  { key: "historique", label: "Historique", icon: History, roles: null },
];

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors";

export default function StudentTabs({
  student,
  classes,
  schoolYears,
  attendances = [],
  invoices = [],
  payments = [],
  role,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("profil");
  const TABS = ALL_TABS.filter((t) => !t.roles || (role && t.roles.includes(role)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xl font-bold">
              {student.prenom?.[0]}
              {student.nom?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {student.nom} {student.prenom}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded text-slate-400">
                  {student.matricule}
                </span>
                <StatutBadge statut={student.statut} />
                <span className="text-sm text-slate-400">
                  {student.classe_actuelle?.name || "Sans classe"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs nav */}
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === key
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
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
          onChanged={() => router.refresh()}
        />
      )}
      {tab === "presences" && <PresencesTab attendances={attendances} />}
      {tab === "notes" && <StudentGradesTab studentId={student.id} />}
      {tab === "finances" && <StudentFinancesTab invoices={invoices} payments={payments} />}
      {tab === "historique" && <HistoriqueTab enrollments={student.enrollments ?? []} />}
    </div>
  );
}

function Placeholder({ label, epic }: { label: string; epic: string }) {
  return (
    <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl">
      <p className="font-medium text-slate-400">{label}</p>
      <p className="text-xs mt-1">Disponible prochainement ({epic}).</p>
    </div>
  );
}

const PRESENCE_LABELS: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  ABSENT_JUSTIFIE: "Absent justifié",
  RETARD: "Retard",
};

const PRESENCE_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ABSENT_JUSTIFIE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RETARD: "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
        <StatCard
          label="Taux d'assiduité"
          value={taux === null ? "—" : `${taux}%`}
          accent="text-indigo-400"
        />
        <StatCard label="Présences" value={String(present)} accent="text-emerald-400" />
        <StatCard label="Absences" value={String(absent)} accent="text-rose-400" />
        <StatCard label="Retards" value={String(retard)} accent="text-orange-400" />
      </div>

      {total === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl">
          Aucune présence enregistrée pour cet élève.
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
              {sorted.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-900/35 transition-colors">
                  <td className="px-6 py-4 text-white">{a.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-medium ${PRESENCE_STYLES[a.status] ?? ""
                        }`}
                    >
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
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

function ProfilTab({
  student,
  classes,
  schoolYears,
  onChanged,
}: {
  student: any;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  onChanged: () => void;
}) {
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
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Identité
            </h3>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
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
            <span className="text-xs text-slate-500 uppercase tracking-wider">
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
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setLieu(student.lieu_naissance || "");
                  }}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-white">
                {student.lieu_naissance || "—"}
              </p>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Responsables */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Responsables légaux
          </h3>
          {(student.guardians ?? []).length === 0 && (
            <p className="text-sm text-slate-500">Aucun responsable enregistré.</p>
          )}
          {(student.guardians ?? []).map((g: any) => (
            <div
              key={g.id}
              className="border border-slate-800/50 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{g.nom_complet}</span>
                <span className="text-xs text-slate-500">{g.lien}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowReinscription((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="size-4" /> Réinscrire
          </button>
          {student.statut !== "ARCHIVE" && (
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-sm font-medium rounded-xl transition-colors cursor-pointer"
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
    </div>
  );
}

function ReinscriptionForm({
  studentId,
  classes,
  schoolYears,
  onDone,
}: {
  studentId: string;
  classes: { id: string; name: string }[];
  schoolYears: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [classeId, setClasseId] = useState("");
  const [yearId, setYearId] = useState("");

  const submit = () => {
    setError(null);
    if (!classeId || !yearId) {
      setError("Classe et année sont obligatoires.");
      return;
    }
    startTransition(async () => {
      const res = await reinscriptionAction(studentId, {
        classe_id: classeId,
        school_year_id: yearId,
      });
      if (res.success) onDone();
      else setError(res.error);
    });
  };

  return (
    <div className="border border-slate-800/50 rounded-xl p-4 space-y-3 bg-slate-950/40">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={inputClass}>
          <option value="">Année cible...</option>
          {schoolYears.map((sy) => (
            <option key={sy.id} value={sy.id}>
              {sy.label}
            </option>
          ))}
        </select>
        <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className={inputClass}>
          <option value="">Classe...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 cursor-pointer"
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
    <div className="border border-rose-500/20 rounded-xl p-4 space-y-3 bg-rose-950/10">
      <input
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Motif (ex: Fin de scolarité)"
        className={inputClass}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={submit}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 cursor-pointer"
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
      <div className="p-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800/80 rounded-xl">
        Aucun historique d&apos;inscription.
      </div>
    );
  }
  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="px-6 py-4">Année</th>
            <th className="px-6 py-4">Classe</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/30 text-sm text-slate-300">
          {enrollments.map((e: any) => (
            <tr key={e.id} className="hover:bg-slate-900/35 transition-colors">
              <td className="px-6 py-4 text-white">{e.school_year?.label}</td>
              <td className="px-6 py-4">{e.classe?.name}</td>
              <td className="px-6 py-4">{e.type_inscription}</td>
              <td className="px-6 py-4 text-slate-400">{e.date_inscription}</td>
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
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-white">{value || "—"}</p>
    </div>
  );
}
