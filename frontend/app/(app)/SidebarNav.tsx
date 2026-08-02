"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserCog,
  BookMarked,
  CalendarCheck,
  FileSpreadsheet,
  ClipboardCheck,
  Library,
  Landmark,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, always: true },
  { href: "/pedagogy/school-years", label: "Pédagogie", icon: BookOpen, always: true },
  { href: "/students", label: "Élèves", icon: Users, always: true },
  { href: "/staff", label: "Personnel", icon: UserCog, roles: ["DIRECTOR", "STUDENT_STUDIES"] },
  { href: "/pedagogy/classes", label: "Classes", icon: BookMarked, always: true },
  { href: "/pedagogy/subjects", label: "Matières", icon: Library, always: true },
  { href: "/attendance", label: "Présences", icon: CalendarCheck, always: true },
  { href: "/grades", label: "Notes", icon: FileSpreadsheet, roles: ["DIRECTOR", "TEACHER", "STUDENT_STUDIES"] },
  { href: "/year-end-decisions", label: "Décisions", icon: ClipboardCheck, roles: ["DIRECTOR", "STUDENT_STUDIES"] },
  { href: "/finance/fees", label: "Frais", icon: Landmark, roles: ["DIRECTOR", "ACCOUNTANT"] },
  { href: "/finance/payments", label: "Paiements", icon: Landmark, roles: ["DIRECTOR", "ACCOUNTANT"] },
  { href: "/finance/invoices", label: "Factures", icon: Landmark, roles: ["DIRECTOR", "ACCOUNTANT"] },
];

export function SidebarNav({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-sidebar-text-dim px-3 pb-2.5">
        Menu principal
      </div>
      {NAV_ITEMS.map((item) => {
        if (!(item.always || (item.roles && role && item.roles.includes(role)))) return null;
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 mb-0.5 rounded-lg text-[13.5px] border-l-2 transition-colors ${
              active
                ? "bg-accent/15 text-white border-accent"
                : "text-sidebar-text border-transparent hover:bg-white/[0.04]"
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
