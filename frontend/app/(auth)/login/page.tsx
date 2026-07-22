"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
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
        // Vérifier si le changement de mot de passe est requis
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
    <div
      className="w-full rounded-[20px] p-12 shadow-2xl relative overflow-hidden group animate-[cardEnter_0.6s_ease-out]"
      style={{
        background: "rgba(21, 27, 43, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
      }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center font-bold text-white text-2xl relative animate-[logoPulse_3s_ease-in-out_infinite]"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            boxShadow: "0 0 32px rgba(99, 102, 241, 0.35)",
          }}
        >
          <span className="sr-only">EG</span>
          EG
          <div
            className="absolute inset-[-4px] rounded-[18px] border border-indigo-500/20 animate-[logoRing_3s_ease-in-out_infinite]"
          />
        </div>
      </div>

      {/* Branding */}
      <div className="text-center mb-8">
        <h1
          className="text-[26px] font-bold text-white mb-1.5"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Eduguinée 3.0
        </h1>
        <p className="text-sm text-[#94A3B8]">Portail d&apos;accès unique</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#94A3B8] block" htmlFor="email">
            Adresse email scolaire
          </label>
          <input
            id="email"
            type="email"
            placeholder="nom@ecole.gn"
            {...register("email")}
            className="w-full px-4 py-3 rounded-xl text-[15px] text-white placeholder-[#475569] outline-none transition-all duration-200"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.08)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            }}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs font-semibold text-rose-400 animate-fadeIn">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[#94A3B8] block" htmlFor="password">
              Mot de passe
            </label>
            <a href="#" className="text-[13px] text-[#818cf8] hover:text-[#a5b4fc] font-medium transition-colors">
              Mot de passe oublié ?
            </a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••••••"
            {...register("password")}
            className="w-full px-4 py-3 rounded-xl text-[15px] text-white placeholder-[#475569] outline-none transition-all duration-200"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.08)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            }}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-xs font-semibold text-rose-400 animate-fadeIn">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-[52px] text-[15px] font-semibold rounded-xl mt-2 relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 border-0"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
            color: "white",
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.08)" }} />
        <span className="text-xs text-[#64748B]">ou</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.08)" }} />
      </div>

      {/* SSO Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] text-[#94A3B8] font-sans cursor-pointer transition-all duration-150"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.color = "#F8FAFC";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "#94A3B8";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          Par téléphone
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] text-[#94A3B8] font-sans cursor-pointer transition-all duration-150"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.color = "#F8FAFC";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "#94A3B8";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Code école
        </button>
      </div>

      {/* Footer */}
      <p className="text-center mt-6 text-xs text-[#64748B]">
        Besoin d&apos;aide ? <a href="#" className="text-[#818cf8] no-underline hover:text-[#a5b4fc]">Contactez le support</a>
      </p>
    </div>
  );
}
