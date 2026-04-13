'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BookOpen,
  CircleHelp,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ROLES, type Role } from '@/lib/constants';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  {
    label: 'Pedagogie',
    href: '/app/pedagogie',
    icon: GraduationCap,
    roles: [ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE, ROLES.ENSEIGNANT],
  },
  {
    label: 'Eleves',
    href: '/app/students',
    icon: UserRound,
    roles: [ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE, ROLES.ENSEIGNANT],
  },
  {
    label: 'Notes',
    href: '/app/grades',
    icon: BookOpen,
    roles: [ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE, ROLES.ENSEIGNANT],
  },
  {
    label: 'Finance',
    href: '/app/finance',
    icon: CreditCard,
    roles: [ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE],
  },
  { label: 'Support', href: '/app/support', icon: CircleHelp },
  {
    label: 'Parametres',
    href: '/app/settings',
    icon: Settings,
    roles: [ROLES.ADMIN_SCHOOL],
  },
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

  if (email) {
    return email[0]?.toUpperCase() ?? 'U';
  }

  return 'U';
}

function SidebarLinks({
  locale,
  pathname,
  role,
  onNavigate,
  compact,
}: {
  locale: string;
  pathname: string;
  role?: Role;
  onNavigate?: () => void;
  compact: boolean;
}) {
  const filteredItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || (role ? item.roles.includes(role) : false)),
    [role]
  );

  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, '');

  return (
    <nav className="space-y-1">
      {filteredItems.map((item) => {
        const localizedHref = `/${locale}${item.href}`;
        const isActive =
          pathWithoutLocale === item.href ||
          (pathWithoutLocale.startsWith(item.href) && item.href !== '/app/dashboard');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={localizedHref}
            title={compact ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              compact ? 'justify-center' : 'gap-3',
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

export function AppSidebar({ schoolName = 'Ecole connectee' }: { schoolName?: string }) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) ?? 'fr';
  const { data: session } = useSession();
  const [isMobileOpen, setMobileOpen] = useState(false);

  const userName = session?.user?.name ?? 'Utilisateur';
  const userRole = (session?.user?.role as Role | undefined) ?? undefined;

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <>
      <div className="border-b px-4 py-3 md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon" aria-label="Ouvrir la navigation" />}
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-80 border-none bg-primary p-0 text-primary-foreground">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation principale</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <div className="border-b border-primary-foreground/20 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Eduguinee</p>
                <p className="text-lg font-semibold">{schoolName}</p>
              </div>
              <div className="flex-1 p-3">
                <SidebarLinks
                  locale={locale}
                  pathname={pathname}
                  role={userRole}
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
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-primary-foreground/70">{userRole ?? 'Sans role'}</p>
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
          <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Eduguinee</p>
          <p className="mt-1 truncate text-sm font-semibold md:text-center lg:text-left">{schoolName}</p>
        </div>

        <div className="flex-1 p-2 lg:p-3">
          <SidebarLinks locale={locale} pathname={pathname} role={userRole} compact />
        </div>

        <div className="border-t border-primary-foreground/16 p-2 lg:p-3">
          <div className="mb-3 flex items-center gap-3 md:justify-center lg:justify-start">
            <Avatar>
              <AvatarFallback className="bg-primary-foreground/18 text-primary-foreground">
                {getInitials(session?.user?.name, session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-primary-foreground/70">{userRole ?? 'Sans role'}</p>
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
