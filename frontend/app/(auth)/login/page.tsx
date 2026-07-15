"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Schéma de validation Zod pour le login
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

export default function LoginPage() {
  const router = useRouter();
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
        redirect: false, // On gère la redirection manuellement pour intercepter les erreurs
      });

      if (result?.error) {
        // Gestion des messages d'erreurs précis (401/403)
        if (result.error.includes("Compte suspendu")) {
          setErrorMessage("Compte suspendu. Veuillez contacter votre administration.");
        } else {
          setErrorMessage("Identifiants incorrects. Veuillez réessayer.");
        }
        setIsLoading(false);
      } else {
        // Redirection après succès (le middleware va rediriger au bon endroit,
        // mais on force une redirection vers /dashboard par défaut)
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
      {/* Effet lumineux subtil au survol */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex flex-col items-center space-y-2 mb-8 relative z-10">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
          <span className="text-white font-extrabold text-2xl tracking-tighter">EG</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-2">Eduguinée 3.0</h1>
        <p className="text-slate-400 text-sm">Portail d’accès unique</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 block" htmlFor="email">
            Adresse email scolaire
          </label>
          <input
            id="email"
            type="email"
            placeholder="nom@ecole.gn"
            {...register("email")}
            className="w-full h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs font-semibold text-red-400 animate-fadeIn">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300 block" htmlFor="password">
              Mot de passe
            </label>
            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
              Mot de passe oublié ?
            </a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••••••"
            {...register("password")}
            className="w-full h-11 px-4 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-xs font-semibold text-red-400 animate-fadeIn">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>
    </div>
  );
}
