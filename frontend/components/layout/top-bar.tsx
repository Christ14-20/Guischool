'use client';

import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { useSchoolYear } from '@/components/layout/school-year-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TopBarProps = {
  onHamburgerClick?: () => void;
};

export function TopBar({ onHamburgerClick }: TopBarProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';

  const { schoolYear, setSchoolYear, availableYears } = useSchoolYear();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const switchLocale = (nextLocale: string | null) => {
    if (!nextLocale) return;
    const nextPath = pathname.replace(/^\/(fr|en)/, `/${nextLocale}`);
    router.replace(nextPath);
  };

  const handleSchoolYearChange = (value: string | null) => {
    if (!value) return;
    setSchoolYear(value);
  };

  return (
    <header className="sticky top-0 z-30 mt-2 mx-2 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_10px_28px_-22px_color-mix(in_oklab,var(--primary)_55%,black)] backdrop-blur md:mx-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onHamburgerClick}
          className="md:hidden"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="hidden min-w-0 sm:block">
          <BreadcrumbNav />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={schoolYear} onValueChange={handleSchoolYearChange}>
          <SelectTrigger
            className="w-[160px] border-border/70 bg-background/70"
            disabled={availableYears.length === 0}
          >
            <SelectValue placeholder="Année scolaire" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="relative border-border/70 bg-background/70" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full border border-background px-1 text-[10px]">3</Badge>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="border-border/70 bg-background/70"
          aria-label="Basculer le theme"
        >
          {isMounted && (resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
        </Button>

        <Select value={locale} onValueChange={switchLocale}>
          <SelectTrigger className="w-[90px] border-border/70 bg-background/70">
            <SelectValue placeholder="Langue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">FR</SelectItem>
            <SelectItem value="en">EN</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
