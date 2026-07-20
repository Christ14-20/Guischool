"use client";

import { useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { setCurrentSchoolYearAction } from "./actions";

interface Props {
  schoolYearId: string;
}

export default function SetCurrentButton({ schoolYearId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await setCurrentSchoolYearAction(schoolYearId);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Star className="size-3" />
      )}
      Définir courante
    </button>
  );
}
