"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// "sidebar" : vit dans le pied de la sidebar Super Admin (toujours sombre) —
// cf. docs/design/eduguinee-superadmin-*.html (maquettes 2+), qui ont
// déplacé le toggle par rapport à la première maquette du dashboard.
// "standalone" : pages sans sidebar (login, change-password) — le bouton
// lui-même doit s'adapter au thème courant plutôt que rester sombre.
export function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "standalone" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const className =
    variant === "sidebar"
      ? "size-7 rounded-full border border-sidebar-line bg-transparent text-sidebar-text-dim flex items-center justify-center cursor-pointer hover:text-sidebar-text hover:border-accent-line transition-colors shrink-0"
      : "size-9 rounded-full border border-line bg-card text-text-soft flex items-center justify-center cursor-pointer hover:text-text hover:border-accent-line transition-colors shrink-0";

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      title="Changer de thème"
      aria-label="Changer de thème"
      className={className}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Moon className="size-3.5" />
      ) : (
        <Sun className="size-3.5" />
      )}
    </button>
  );
}
