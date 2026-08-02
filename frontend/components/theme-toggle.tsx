"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// Vit dans la sidebar (toujours sombre), pas dans le topbar de chaque page —
// cf. docs/design/eduguinee-superadmin-*.html (maquettes 2+), qui ont
// déplacé le toggle par rapport à la première maquette du dashboard.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      title="Changer de thème"
      aria-label="Changer de thème"
      className="size-7 rounded-full border border-sidebar-line bg-transparent text-sidebar-text-dim flex items-center justify-center cursor-pointer hover:text-sidebar-text hover:border-accent-line transition-colors shrink-0"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Moon className="size-3.5" />
      ) : (
        <Sun className="size-3.5" />
      )}
    </button>
  );
}
