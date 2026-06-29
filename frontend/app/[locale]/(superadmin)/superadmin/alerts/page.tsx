"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSystemAlerts,
  resolveSystemAlert,
  type SystemAlertItem,
} from "@/lib/api/superadmin";

export default function SuperadminAlertsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  const [alerts, setAlerts] = useState<SystemAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return;

    async function loadAlerts() {
      try {
        const data = await getSystemAlerts(token);
        setAlerts(data.results);
      } catch {
        toast.error("Impossible de charger les alertes système.");
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [token, refreshKey]);

  const handleResolve = async (id: string) => {
    try {
      await resolveSystemAlert(token, id);
      toast.success("Alerte marquée comme résolue.");
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Échec de la résolution.");
    }
  };

  const columns: DataTableColumn<SystemAlertItem>[] = [
    {
      key: "level",
      header: "Niveau",
      accessor: (alert) => <StatusBadge status={alert.level} />,
    },
    {
      key: "message",
      header: "Message",
      accessor: (alert) => (
        <div className="flex items-start gap-2 py-1">
          {alert.level === "CRITICAL" && (
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{alert.message}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (alert) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResolve(alert.id)}
          className="h-8 gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Résoudre
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertes Système"
        description="Surveillez l'état de santé de la plateforme et réagissez aux incidents."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">
                  Critiques
                </p>
                <p className="text-2xl font-bold">
                  {alerts.filter((a) => a.level === "CRITICAL").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Avertissements
                </p>
                <p className="text-2xl font-bold">
                  {alerts.filter((a) => a.level === "WARNING").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sky-500/5 border-sky-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-sky-600">Informations</p>
                <p className="text-2xl font-bold">
                  {alerts.filter((a) => a.level === "INFO").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertes actives</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={alerts}
            rowKey={(a) => a.id}
            loading={loading}
            emptyTitle="Tout va bien !"
            emptyDescription="Aucune alerte système active pour le moment."
          />
        </CardContent>
      </Card>
    </div>
  );
}
