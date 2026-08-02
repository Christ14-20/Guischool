"use client";



import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { suspendSchoolAction, reactivateSchoolAction } from "./actions";
import { isSuspendedStatus } from "../statusStyles";
import { ShieldAlert, PlayCircle, Eye, Loader2 } from "lucide-react";
import Link from "next/link";

interface SchoolActionsProps {
  schoolId: string;
  schoolName: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED_SOFT" | "SUSPENDED_HARD" | "CANCELLED";
}

export default function SchoolActions({ schoolId, schoolName, status }: SchoolActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [reason, setReason] = useState("");
  const [suspensionType, setSuspensionType] = useState<"SOFT" | "HARD">("SOFT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const suspended = isSuspendedStatus(status);

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
      const res = await suspendSchoolAction(schoolId, reason, suspensionType);
      if (res.success) {
        setShowSuspendModal(false);
        setReason("");
        setSuspensionType("SOFT");
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/superadmin/schools/${schoolId}`}
          className="size-[30px] rounded-full border border-line text-text-soft flex items-center justify-center hover:border-accent-line hover:text-accent transition-colors"
          title="Détails"
        >
          <Eye className="size-3.5" />
        </Link>

        {suspended ? (
          <button
            onClick={handleReactivate}
            disabled={isPending}
            className="size-[30px] rounded-full border border-line text-text-soft flex items-center justify-center hover:border-ok hover:text-ok transition-colors disabled:opacity-50"
            title="Réactiver"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
          </button>
        ) : (
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowSuspendModal(true);
            }}
            disabled={isPending}
            className="size-[30px] rounded-full border border-line text-text-soft flex items-center justify-center hover:border-warn hover:text-warn transition-colors disabled:opacity-50"
            title="Suspendre"
          >
            <ShieldAlert className="size-3.5" />
          </button>
        )}
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="font-serif text-lg font-medium text-text">Suspendre l&apos;établissement</h3>
              <p className="text-text-soft text-sm mt-1">
                Veuillez indiquer la raison de la suspension pour <strong>{schoolName}</strong>.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSuspendSubmit} className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider mb-2">
                  Type de suspension
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSuspensionType("SOFT")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                      suspensionType === "SOFT"
                        ? "bg-warn/10 border-warn/40 text-warn"
                        : "bg-paper-alt border-line text-text-soft hover:text-text"
                    }`}
                  >
                    Lecture seule (soft)
                    <span className="block font-normal text-[11px] opacity-80 mt-0.5">
                      Consultation toujours possible
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuspensionType("HARD")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                      suspensionType === "HARD"
                        ? "bg-danger/10 border-danger/40 text-danger"
                        : "bg-paper-alt border-line text-text-soft hover:text-text"
                    }`}
                  >
                    Blocage total (hard)
                    <span className="block font-normal text-[11px] opacity-80 mt-0.5">
                      Accès entièrement coupé
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-text-faint uppercase tracking-wider mb-2">
                  Raison de la suspension
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Facture impayée, non respect des CGUs..."
                  rows={3}
                  className="w-full bg-paper-alt border border-line rounded-xl px-4 py-2 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-warn hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Suspendre
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
