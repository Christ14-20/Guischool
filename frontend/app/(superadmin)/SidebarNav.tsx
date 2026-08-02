"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CreditCard } from "lucide-react";

const SUPERADMIN_NAV = [
  { href: "/superadmin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/superadmin/schools", label: "Établissements", icon: Building2 },
  { href: "/superadmin/plans", label: "Plans & Quotas", icon: CreditCard },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-sidebar-text-dim px-3 pb-2.5">
        Gestion
      </div>
      {SUPERADMIN_NAV.map((item) => {
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
