'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
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
  children?: Array<{
    label: string;
    href: string;
    roles?: Role[];
  }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  {
    label: 'Pedagogie',
    href: '/app/pedagogie',
    icon: GraduationCap,
    roles: [ROLES.ADMIN_SCHOOL, ROLES.SECRETAIRE, ROLES.ENSEIGNANT],
children: [
        { label: 'Annees scolaires', href: '/app/pedagogie/school-years' },
        { label: 'Niveaux', href: '/app/pedagogie/levels' },
        { label: 'Filières', href: '/app/pedagogie/filieres' },
        { label: 'Classes', href: '/app/pedagogie/classes' },
        { label: 'Matieres', href: '/app/pedagogie/subjects' },
        { label: 'Emploi du temps', href: '/app/pedagogie/timetable' },
        { label: 'Presences', href: '/app/pedagogie/attendance' },
        { label: 'Fin d\'annee', href: '/app/year-end', roles: [ROLES.ADMIN_SCHOOL] },
      ],
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
    children: [
      { label: 'Paiements', href: '/app/finance/payments' },
      { label: 'Factures', href: '/app/finance/invoices' },
      { label: 'Frais Scolaires', href: '/app/finance/fees' },
    ],
  },
  {
    label: 'Support',
    href: '/app/support',
    icon: CircleHelp,
    children: [
      { label: 'Tickets', href: '/app/support/tickets' },
    ],
  },
  {
    label: 'Parametres',
    href: '/app/settings',
    icon: Settings,
    roles: [ROLES.ADMIN_SCHOOL],
    children: [
      { label: 'General', href: '/app/settings' },
      { label: 'Configuration ecole', href: '/app/settings/tenant' },
    ],
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
  const normalizedRole = role?.trim().toUpperCase() as Role | undefined;

  const filteredItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => !item.roles || (normalizedRole ? item.roles.includes(normalizedRole) : false)).map(
        (item) => ({
          ...item,
          children: item.children?.filter((child) => !child.roles || (normalizedRole ? child.roles.includes(normalizedRole) : false)),
        })
      ),
    [normalizedRole]
  );

  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, '');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};

    for (const item of filteredItems) {
      if (item.children && item.children.length > 0) {
        initial[item.href] =
          pathWithoutLocale === item.href || pathWithoutLocale.startsWith(`${item.href}/`);
      }
    }

    return initial;
  });

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const item of filteredItems) {
        if (!item.children || item.children.length === 0) {
          continue;
        }

        const hasStoredValue = Object.prototype.hasOwnProperty.call(next, item.href);
        const shouldOpenByPath =
          pathWithoutLocale === item.href || pathWithoutLocale.startsWith(`${item.href}/`);

        if (!hasStoredValue) {
          next[item.href] = shouldOpenByPath;
          changed = true;
        } else if (shouldOpenByPath && !next[item.href]) {
          next[item.href] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [filteredItems, pathWithoutLocale]);

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <nav className="space-y-1">
      {filteredItems.map((item) => {
        const localizedHref = `/${locale}${item.href}`;
        const isActive =
          pathWithoutLocale === item.href ||
          (pathWithoutLocale.startsWith(item.href) && item.href !== '/app/dashboard');
        const Icon = item.icon;

        return (
          <div key={item.href} className="space-y-1">
            {item.children && item.children.length > 0 ? (
              <div
                className={cn(
                  'flex items-center rounded-xl pr-2',
                  isActive
                    ? 'bg-background text-primary shadow-none'
                    : 'text-primary-foreground/82 hover:bg-primary-foreground/12 hover:text-primary-foreground'
                )}
              >
                <Link
                  href={localizedHref}
                  title={compact ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-w-0 flex-1 items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    compact ? 'justify-center gap-3 lg:justify-start' : 'gap-3'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn(compact && 'hidden lg:inline')}>{item.label}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => toggleSection(item.href)}
                  aria-label={expandedSections[item.href] ? 'Replier le sous-menu' : 'Deplier le sous-menu'}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary/90 transition hover:bg-primary/10',
                    compact && 'hidden lg:inline-flex'
                  )}
                >
                  {expandedSections[item.href] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <Link
                href={localizedHref}
                title={compact ? item.label : undefined}
                onClick={onNavigate}
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
            )}

            {item.children && item.children.length > 0 && expandedSections[item.href] ? (
              <div className={cn('space-y-1 pl-10', compact && 'hidden lg:block')}>
                {item.children.map((child) => {
                  const childHref = `/${locale}${child.href}`;
                  const isChildActive = pathWithoutLocale === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={childHref}
                      onClick={onNavigate}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-xs font-medium transition-all',
                        isChildActive
                          ? 'bg-primary-foreground/16 text-primary-foreground'
                          : 'text-primary-foreground/72 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ schoolName = 'Ecole connectee' }: { schoolName?: string }) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) ?? 'fr';
  const { data: session, status } = useSession();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [stableRole, setStableRole] = useState<Role | undefined>(undefined);

  const userName = session?.user?.name ?? 'Utilisateur';
  const userRoleRaw = session?.user?.role;

  useEffect(() => {
    const role = userRoleRaw?.trim().toUpperCase();
    if (role && Object.values(ROLES).includes(role as Role)) {
      setStableRole(role as Role);
      return;
    }

    if (status === 'unauthenticated') {
      setStableRole(undefined);
    }
  }, [userRoleRaw, status]);

  const userRole = stableRole;

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
