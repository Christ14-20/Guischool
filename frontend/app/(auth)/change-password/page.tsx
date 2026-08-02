"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePasswordAction } from "./actions";
import { Key, Lock, AlertTriangle, Loader2, Check, LogOut } from "lucide-react";

const fieldClass =
  "w-full bg-paper-alt border border-line rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

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
      <div className="rounded-2xl p-10 border border-line bg-card shadow-[var(--shadow)] text-center space-y-4">
        <div className="size-14 rounded-full bg-ok/10 flex items-center justify-center mx-auto">
          <Check className="size-7 text-ok" />
        </div>
        <h2 className="font-serif text-xl font-medium">Mot de passe modifié</h2>
        <p className="text-text-soft text-sm">
          Votre mot de passe a été changé avec succès. Vous allez être redirigé...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-10 border border-line bg-card shadow-[var(--shadow)] space-y-6">
      <div className="text-center space-y-2">
        <div className="size-12 rounded-full bg-warn/10 flex items-center justify-center mx-auto">
          <Key className="size-6 text-warn" />
        </div>
        <h1 className="font-serif text-xl font-medium">Changement de mot de passe</h1>
        <p className="text-text-soft text-sm">
          Vous devez définir un nouveau mot de passe avant de continuer.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
            Mot de passe actuel
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
            <input
              type="password"
              name="old_password"
              required
              placeholder="Votre mot de passe actuel"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
            <input
              type="password"
              name="new_password"
              required
              placeholder="Minimum 12 caractères"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-wider">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint" />
            <input
              type="password"
              name="new_password_confirm"
              required
              placeholder="Ressaisir le nouveau mot de passe"
              className={fieldClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-opacity flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "Changement en cours..." : "Changer le mot de passe"}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text-soft transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
