"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePasswordAction } from "./actions";
import { Key, Lock, AlertTriangle, Loader2, Check, LogOut } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const newPass = formData.get("new_password") as string;
    const confirmPass = formData.get("new_password_confirm") as string;

    if (newPass !== confirmPass) {
      setErrorMsg("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (newPass.length < 12) {
      setErrorMsg("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    startTransition(async () => {
      const res = await changePasswordAction(formData);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  if (success) {
    return (
      <div className="space-y-6 animate-fade-in text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <Check className="size-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Mot de passe modifié</h2>
        <p className="text-slate-400 text-sm">
          Votre mot de passe a été changé avec succès. Vous allez être redirigé...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Key className="size-6 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Changement de mot de passe</h1>
        <p className="text-slate-400 text-sm">
          Vous devez définir un nouveau mot de passe avant de continuer.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Mot de passe actuel
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="password"
              name="old_password"
              required
              placeholder="Votre mot de passe actuel"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="password"
              name="new_password"
              required
              placeholder="Minimum 12 caractères"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="password"
              name="new_password_confirm"
              required
              placeholder="Ressaisir le nouveau mot de passe"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98] cursor-pointer"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "Changement en cours..." : "Changer le mot de passe"}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
