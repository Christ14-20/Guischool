import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace(/\s/g, " ") + " GNF"
  );
}

export function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}
