'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Layout, ListTree } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MODULES = [
  {
    title: 'Années scolaires',
    description: 'Gérez les années scolaires, activez ou clôturez une année.',
    href: '/app/pedagogie/school-years',
    icon: CalendarDays,
  },
  {
    title: 'Niveaux',
    description: 'Catalogue des niveaux du système éducatif guinéen.',
    href: '/app/pedagogie/levels',
    icon: GraduationCap,
  },
  {
    title: 'Filières',
    description: 'Gérez les filières d\'études (Scientifique, Littéraire, Technique...).',
    href: '/app/pedagogie/filieres',
    icon: ListTree,
  },
  {
    title: 'Classes',
    description: 'Créez et gérez les classes par cycle et niveau.',
    href: '/app/pedagogie/classes',
    icon: BookOpen,
  },
  {
    title: 'Matières',
    description: 'Définissez les matières et leur catégorie.',
    href: '/app/pedagogie/subjects',
    icon: BookOpen,
  },
  {
    title: 'Emploi du temps',
    description: 'Consultez et modifiez les créneaux hebdomadaires.',
    href: '/app/pedagogie/timetable',
    icon: Layout,
  },
  {
    title: 'Présences',
    description: 'Enregistrez les présences et consultez les statistiques.',
    href: '/app/pedagogie/attendance',
    icon: ClipboardList,
  },
];

export default function PedagogiePage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';

  return (
    <section className="space-y-6">
      <PageHeader
        title="Pédagogie"
        description="Gérez l'organisation pédagogique de votre établissement."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={`/${locale}${mod.href}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
