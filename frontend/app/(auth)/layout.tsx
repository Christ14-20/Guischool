import React from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper text-text relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle variant="standalone" />
      </div>
      <div className="relative w-full max-w-md p-2">{children}</div>
    </div>
  );
}
