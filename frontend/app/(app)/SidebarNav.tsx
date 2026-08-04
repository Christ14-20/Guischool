"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, UserCog, BookMarked, CalendarCheck, FileSpreadsheet, ClipboardCheck, Library, Landmark } from "lucide-react";
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, always: true },
  // Lecture ouverte côté backend (IsAuthenticated seul) — visible à tout le
  // personnel du tenant, quel que soit son rôle.
  { href: "/pedagogy/school-years", label: "Pédagogie", icon: BookOpen, always: true },
  { href: "/pedagogy/classes", label: "Classes", icon: BookMarked, always: true },
  { href: "/pedagogy/subjects", label: "Matières", icon: Library, always: true },
  { href: "/attendance", label: "Présences", icon: CalendarCheck, always: true },
  { href: "/students", label: "Élèves", icon: Users, permissions: [PERMISSIONS.ELEVES_READ] },
  { href: "/staff", label: "Personnel", icon: UserCog, permissions: [PERMISSIONS.STAFF_READ] },
  {
    href: "/grades",
    label: "Notes",
    icon: FileSpreadsheet,
    permissions: [
      PERMISSIONS.NOTES_READ,
      PERMISSIONS.NOTES_CREATE_EVALUATION,
      PERMISSIONS.NOTES_LOCK,
      PERMISSIONS.NOTES_VALIDATE,
    ],
  },
  { href: "/year-end-decisions", label: "Décisions", icon: ClipboardCheck, permissions: [PERMISSIONS.NOTES_READ] },
  { href: "/finance/fees", label: "Frais", icon: Landmark, permissions: [PERMISSIONS.FINANCE_READ] },
  { href: "/finance/payments", label: "Paiements", icon: Landmark, permissions: [PERMISSIONS.FINANCE_READ] },
  { href: "/finance/invoices", label: "Factures", icon: Landmark, permissions: [PERMISSIONS.FINANCE_READ] },
];

export function SidebarNav({ permissions }: { permissions?: string[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-sidebar-text-dim px-3 pb-2.5">
        Menu principal
      </div>
      {NAV_ITEMS.map((item) => {
        const visible = item.always || hasAnyPermission(permissions, item.permissions ?? []);
        if (!visible) return null;
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 mb-0.5 rounded-lg text-[13.5px] border-l-2 transition-colors ${
              active ? "bg-accent/15 text-white border-accent" : "text-sidebar-text border-transparent hover:bg-white/[0.04]"
            }`}
          >
            <item.icon className="size-4 opacity-85" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
