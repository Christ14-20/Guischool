"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit faire au moins 6 caractères"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

const fieldClass =
  "w-full bg-paper-alt border border-line rounded-xl px-4 py-3 text-[15px] text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginSchemaType) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("Compte suspendu")) {
          setErrorMessage("Compte suspendu. Veuillez contacter votre administration.");
        } else {
          setErrorMessage("Identifiants incorrects. Veuillez réessayer.");
        }
        setIsLoading(false);
      } else {
        try {
          const sessionResp = await fetch("/api/auth/session");
          const session = await sessionResp.json();
          if (session?.user?.mustChangePassword) {
            window.location.href = "/change-password";
          } else {
            window.location.href = "/dashboard";
          }
        } catch {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl p-10 border border-line bg-card shadow-[var(--shadow)]">
      {/* Brand */}
      <div className="flex justify-center mb-6">
        <div className="size-14 rounded-2xl bg-accent flex items-center justify-center font-serif font-semibold text-white text-xl">
          EG
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="font-serif text-2xl font-medium mb-1.5">Eduguinée 3.0</h1>
        <p className="text-sm text-text-soft">Portail d&apos;accès unique</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-wider block" htmlFor="email">
            Adresse email scolaire
          </label>
          <input
            id="email"
            type="email"
            placeholder="nom@ecole.gn"
            {...register("email")}
            className={fieldClass}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs font-semibold text-danger">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-wider" htmlFor="password">
              Mot de passe
            </label>
            <a href="#" className="text-[13px] text-accent hover:opacity-75 font-medium transition-opacity">
              Mot de passe oublié ?
            </a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••••••"
            {...register("password")}
            className={fieldClass}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-xs font-semibold text-danger">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-[48px] text-[15px] font-semibold rounded-xl mt-2 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Se connecter"}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs text-text-faint">ou</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* SSO Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] text-text-soft border border-line hover:border-accent-line hover:text-text transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          Par téléphone
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] text-text-soft border border-line hover:border-accent-line hover:text-text transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Code école
        </button>
      </div>

      {/* Footer */}
      <p className="text-center mt-6 text-xs text-text-faint">
        Besoin d&apos;aide ? <a href="#" className="text-accent no-underline hover:opacity-75">Contactez le support</a>
      </p>
    </div>
  );
}
