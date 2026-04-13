import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Users,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const KPI_ITEMS = [
  {
    title: 'Eleves actifs',
    value: '1 284',
    delta: '+4.2% ce mois',
    icon: Users,
  },
  {
    title: 'Enseignants',
    value: '68',
    delta: '2 recrutements',
    icon: GraduationCap,
  },
  {
    title: 'Recouvrement',
    value: '78%',
    delta: 'Objectif 85%',
    icon: CircleDollarSign,
  },
  {
    title: 'Presences du jour',
    value: '92%',
    delta: 'Excellent suivi',
    icon: CalendarCheck2,
  },
];

const WEEK_PROGRESS = [
  { label: 'Saisie des presences', value: 92 },
  { label: 'Saisie des notes', value: 67 },
  { label: 'Paiements confirms', value: 78 },
];

const QUICK_ACTIONS = [
  { label: 'Ajouter un eleve', href: '/app/students' },
  { label: 'Creer une classe', href: '/app/pedagogie/classes' },
  { label: 'Configurer emploi du temps', href: '/app/pedagogie/timetable' },
  { label: 'Enregistrer un paiement', href: '/app/finance' },
];

const RECENT_ACTIVITY = [
  {
    actor: 'Secretariat',
    action: 'Nouvel eleve inscrit en 7e A',
    module: 'Eleves',
    status: 'Termine',
    time: 'Il y a 12 min',
  },
  {
    actor: 'Direction',
    action: 'Validation de l emploi du temps S2',
    module: 'Pedagogie',
    status: 'Termine',
    time: 'Il y a 38 min',
  },
  {
    actor: 'Comptabilite',
    action: 'Relance paiement classe Terminale',
    module: 'Finance',
    status: 'En cours',
    time: 'Il y a 1 h',
  },
  {
    actor: 'Enseignant',
    action: 'Saisie des notes de mathematiques',
    module: 'Pedagogie',
    status: 'En cours',
    time: 'Il y a 2 h',
  },
];

export default function AppDashboardPage() {
  return (
    <section className="space-y-5">
      <PageHeader
        title="Dashboard administration ecole"
        description="Suivi des indicateurs cle, operations quotidiennes et activites recentes de l etablissement."
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href="/app/pedagogie" />}>
              <BookOpen className="mr-2 h-4 w-4" />
              Ouvrir pedagogie
            </Button>
            <Button nativeButton={false} render={<Link href="/app/finance" />}>
              <CreditCard className="mr-2 h-4 w-4" />
              Aller en finance
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPI_ITEMS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-border/70 bg-card/90">
              <CardHeader className="pb-1">
                <CardDescription>{kpi.title}</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-semibold tracking-tight">{kpi.value}</CardTitle>
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{kpi.delta}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>Performance de la semaine</CardTitle>
            <CardDescription>Progression des operations critiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {WEEK_PROGRESS.map((item) => (
              <Progress key={item.label} value={item.value}>
                <ProgressLabel>{item.label}</ProgressLabel>
                <ProgressValue>{item.value}%</ProgressValue>
              </Progress>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>Raccourcis utiles pour l administration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="w-full justify-between border-border/70"
                nativeButton={false}
                render={<Link href={action.href} />}
              >
                <span>{action.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Activite recente</CardTitle>
          <CardDescription>Dernieres operations enregistrees dans la plateforme</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Heure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_ACTIVITY.map((item) => (
                <TableRow key={`${item.actor}-${item.action}`}>
                  <TableCell className="font-medium">{item.actor}</TableCell>
                  <TableCell>{item.action}</TableCell>
                  <TableCell>{item.module}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'Termine' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
