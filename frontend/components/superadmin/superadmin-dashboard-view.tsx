"use client";

import { Building2, CircleDollarSign, School, ShieldAlert } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SuperadminKpi = {
  label: string;
  value: string;
  icon: "schools" | "active" | "suspended" | "mrr";
};

export type SuperadminSchool = {
  id: string;
  name: string;
  plan: string;
  status: string;
};

export type SuperadminAlert = {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO";
  message: string;
};

export type SuperadminGrowthPoint = {
  month: string;
  schools: number;
};

function iconForKpi(icon: SuperadminKpi["icon"]) {
  switch (icon) {
    case "schools":
      return Building2;
    case "active":
      return School;
    case "suspended":
      return ShieldAlert;
    case "mrr":
      return CircleDollarSign;
    default:
      return Building2;
  }
}

function alertTone(level: SuperadminAlert["level"]) {
  if (level === "CRITICAL")
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  if (level === "WARNING")
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
}

type SuperadminDashboardViewProps = {
  kpis: SuperadminKpi[];
  growthData: SuperadminGrowthPoint[];
  latestSchools: SuperadminSchool[];
  alerts: SuperadminAlert[];
};

export function SuperadminDashboardView({
  kpis,
  growthData,
  latestSchools,
  alerts,
}: SuperadminDashboardViewProps) {
  const columns: DataTableColumn<SuperadminSchool>[] = [
    {
      key: "name",
      header: "Ecole",
      sortable: true,
      accessor: (row) => row.name,
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      accessor: (row) => row.plan,
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <ConfirmDialog
          title="Suspendre l'ecole"
          description={`Voulez-vous vraiment suspendre ${row.name} ?`}
          variant="destructive"
          confirmLabel="Suspendre"
          loadingLabel="Suspension..."
          trigger={
            <Button variant="outline" size="sm">
              Suspendre
            </Button>
          }
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }}
        />
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Dashboard Super Admin"
        description="Pilotage global de la plateforme, des ecoles et des operations critiques."
        actions={<Button>Nouvelle alerte</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = iconForKpi(kpi.icon);
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Evolution des inscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={growthData}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="schools"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes systeme actives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <Alert>
                <AlertTitle>Aucune alerte</AlertTitle>
                <AlertDescription>Le systeme est stable.</AlertDescription>
              </Alert>
            ) : (
              alerts.map((item) => (
                <Alert key={item.id}>
                  <AlertTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">Alerte</span>
                    <Badge className={alertTone(item.level)}>
                      {item.level}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>{item.message}</AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernieres ecoles creees</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={latestSchools}
            rowKey={(row) => row.id}
            total={latestSchools.length}
            page={1}
            pageSize={5}
            searchPlaceholder="Rechercher une ecole..."
            emptyTitle="Aucune ecole"
            emptyDescription="Aucune ecole recente a afficher."
          />
        </CardContent>
      </Card>
    </section>
  );
}
