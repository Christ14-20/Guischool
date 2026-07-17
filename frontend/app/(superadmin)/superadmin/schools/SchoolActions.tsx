"use client";



import React, { useState, useTransition } from "react";
import { suspendSchoolAction, reactivateSchoolAction } from "./actions";
import { ShieldAlert, PlayCircle, Eye, Loader2 } from "lucide-react";
import Link from "next/link";

interface SchoolActionsProps {
  schoolId: string;
  schoolName: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL";
}

export default function SchoolActions({ schoolId, schoolName, status }: SchoolActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReactivate = () => {
    if (confirm(`Voulez-vous vraiment réactiver l’établissement "${schoolName}" ?`)) {
      setErrorMsg(null);
      startTransition(async () => {
        const res = await reactivateSchoolAction(schoolId);
        if (!res.success) {
          setErrorMsg(res.error);
        }
      });
    }
  };

  const handleSuspendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Une raison de suspension est requise.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await suspendSchoolAction(schoolId, reason);
      if (res.success) {
        setShowSuspendModal(false);
        setReason("");
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/superadmin/schools/${schoolId}`}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Détails"
        >
          <Eye className="size-4" />
        </Link>

        {status === "SUSPENDED" ? (
          <button
            onClick={handleReactivate}
            disabled={isPending}
            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Réactiver"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          </button>
        ) : (
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowSuspendModal(true);
            }}
            disabled={isPending}
            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            title="Suspendre"
          >
            <ShieldAlert className="size-4" />
          </button>
        )}
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Suspendre l’établissement</h3>
              <p className="text-slate-400 text-sm mt-1">
                Veuillez indiquer la raison de la suspension pour <strong>{schoolName}</strong>.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSuspendSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Raison de la suspension
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Facture impayée, non respect des CGUs..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Suspendre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
