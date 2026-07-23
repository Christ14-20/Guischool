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
        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
      >
        Clôturer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-amber-400">Confirmer ?</span>
      <button
        onClick={handleClose}
        disabled={isPending}
        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Lock className="size-3" />}
        Oui
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
      >
        Non
      </button>
    </div>
  );
}
