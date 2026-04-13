'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type AdminNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
  { label: 'Onboarding', href: '/superadmin/onboarding', icon: ClipboardCheck },
  { label: 'Ecoles', href: '/superadmin/schools', icon: Building2 },
  { label: 'Plans', href: '/superadmin/plans', icon: ListChecks },
  { label: 'Utilisateurs', href: '/superadmin/users', icon: UserCog },
  { label: 'Logs', href: '/superadmin/logs', icon: ShieldCheck },
  { label: 'Alertes', href: '/superadmin/alerts', icon: AlertTriangle },
];

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join('');
  }

  if (email) return email[0]?.toUpperCase() ?? 'A';
  return 'A';
}

function SuperadminLinks({
  locale,
  pathname,
  compact,
  onNavigate,
}: {
  locale: string;
  pathname: string;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, '');
  const links = useMemo(() => ADMIN_NAV_ITEMS, []);

  return (
    <nav className="space-y-1">
      {links.map((item) => {
        const localizedHref = `/${locale}${item.href}`;
        const isActive =
          pathWithoutLocale === item.href ||
          (pathWithoutLocale.startsWith(item.href) && item.href !== '/superadmin/dashboard');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={localizedHref}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={cn(
              'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              compact ? 'justify-center gap-3 lg:justify-start' : 'gap-3',
              isActive
                ? 'bg-background text-primary shadow-none'
                : 'text-primary-foreground/82 hover:bg-primary-foreground/12 hover:text-primary-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn(compact && 'hidden lg:inline')}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SuperadminSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) ?? 'fr';
  const { data: session } = useSession();
  const [isMobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <>
      <div className="border-b px-4 py-3 md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon" aria-label="Ouvrir la navigation Super Admin" />}
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-80 border-none bg-primary p-0 text-primary-foreground">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Super Admin</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <div className="border-b border-primary-foreground/20 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Eduguinee Admin</p>
                <p className="text-lg font-semibold">Console centrale</p>
                <p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  Super Admin
                </p>
              </div>
              <div className="flex-1 p-3">
                <SuperadminLinks
                  locale={locale}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  compact={false}
                />
              </div>
              <div className="border-t border-primary-foreground/20 p-3">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(session?.user?.name, session?.user?.email)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{session?.user?.name ?? 'Super Admin'}</p>
                    <p className="text-xs text-primary-foreground/70">SUPER_ADMIN</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Deconnexion
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden border-r border-primary-foreground/18 bg-primary text-primary-foreground md:flex md:w-20 md:flex-col lg:w-72">
        <div className="border-b border-primary-foreground/16 px-3 py-4 lg:px-4">
          <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Eduguinee Admin</p>
          <p className="mt-1 truncate text-sm font-semibold md:text-center lg:text-left">Console centrale</p>
          <p className="mt-2 hidden rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs font-medium text-primary-foreground md:inline-flex lg:ml-0">
            Super Admin
          </p>
        </div>

        <div className="flex-1 p-2 lg:p-3">
          <SuperadminLinks locale={locale} pathname={pathname} compact />
        </div>

        <div className="border-t border-primary-foreground/16 p-2 lg:p-3">
          <div className="mb-3 flex items-center gap-3 md:justify-center lg:justify-start">
            <Avatar>
              <AvatarFallback className="bg-primary-foreground/18 text-primary-foreground">
                {getInitials(session?.user?.name, session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-medium">{session?.user?.name ?? 'Super Admin'}</p>
              <p className="truncate text-xs text-primary-foreground/70">SUPER_ADMIN</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full gap-2 text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground md:justify-center lg:justify-start"
            title="Deconnexion"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Deconnexion</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
