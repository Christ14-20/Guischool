"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { closePeriodAction } from "./actions";

interface Props {
  periodId: string;
  schoolYearId: string;
}

export default function ClosePeriodButton({ periodId, schoolYearId }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      await closePeriodAction(periodId, schoolYearId);
      setConfirm(false);
    });
  };

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        style={{ color: "var(--warn)", boxShadow: "inset 0 0 0 1px var(--warn)" }}
      >
        Clôturer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs" style={{ color: "var(--warn)" }}>Confirmer ?</span>
      <button
        onClick={handleClose}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
        style={{ background: "var(--warn)" }}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Lock className="size-3" />}
        Oui
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="px-3 py-1.5 rounded-lg border border-line text-text-soft text-xs font-medium hover:text-text transition-colors cursor-pointer"
      >
        Non
      </button>
    </div>
  );
}
