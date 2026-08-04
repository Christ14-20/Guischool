import React from "react";
import { ShieldAlert } from "lucide-react";

interface AccessDeniedProps {
  message?: string;
}

/**
 * Garde de page RBAC — affichée à la place du contenu quand l'utilisateur
 * connecté n'a pas la permission de lecture requise pour cette section.
 * Remplace le message d'erreur générique de fetch (qui s'affichait
 * auparavant même en cas de 403, sans distinction avec une vraie panne).
 */
export default function AccessDenied({
  message = "Vous n'avez pas la permission d'accéder à cette section.",
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen bg-paper text-text flex items-center justify-center px-11">
      <div className="max-w-sm text-center border border-line bg-card rounded-2xl p-8 shadow-[var(--shadow)]">
        <div className="size-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="font-serif text-lg font-medium mb-1.5">Accès refusé</h1>
        <p className="text-text-soft text-[13.5px]">{message}</p>
      </div>
    </div>
  );
}
