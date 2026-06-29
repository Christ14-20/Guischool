"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getPlans, type PlanItem, updatePlan } from "@/lib/api/superadmin";

type Plan = {
  id: number;
  name: "STARTER" | "PRO" | "ENTERPRISE";
  maxStudents: number;
  maxStaff: number;
  storageGb: number;
  modules: string[];
  monthlyPrice: number;
  yearlyPrice: number;
};

const AVAILABLE_MODULES = [
  "pedagogy",
  "students",
  "grades",
  "finance",
  "support",
  "monitoring",
];

const planSchema = z.object({
  name: z.enum(["STARTER", "PRO", "ENTERPRISE"]),
  maxStudents: z.coerce.number().int().min(1, "Min 1 eleve."),
  maxStaff: z.coerce.number().int().min(1, "Min 1 staff."),
  storageGb: z.coerce.number().int().min(1, "Min 1 Go."),
  modules: z.array(z.string()).min(1, "Selectionnez au moins un module."),
  monthlyPrice: z.coerce.number().min(0, "Prix mensuel invalide."),
  yearlyPrice: z.coerce.number().min(0, "Prix annuel invalide."),
});

type FormState = {
  name: "STARTER" | "PRO" | "ENTERPRISE";
  maxStudents: string;
  maxStaff: string;
  storageGb: string;
  modules: string[];
  monthlyPrice: string;
  yearlyPrice: string;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-FR")} GNF`;
}

function formatPlanName(name: Plan["name"]) {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

function apiPlanToUi(plan: PlanItem): Plan {
  return {
    id: plan.id,
    name: plan.name,
    maxStudents: Number(plan.max_students),
    maxStaff: Number(plan.max_staff),
    storageGb: Number(plan.storage_max_gb),
    modules: Array.isArray(plan.modules_activated)
      ? plan.modules_activated
      : [],
    monthlyPrice: Number(plan.price_monthly),
    yearlyPrice: Number(plan.price_annual),
  };
}

function planToFormState(plan: Plan): FormState {
  return {
    name: plan.name,
    maxStudents: String(plan.maxStudents),
    maxStaff: String(plan.maxStaff),
    storageGb: String(plan.storageGb),
    modules: [...plan.modules],
    monthlyPrice: String(plan.monthlyPrice),
    yearlyPrice: String(plan.yearlyPrice),
  };
}

export default function SuperadminPlansPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    let isMounted = true;

    getPlans(accessToken)
      .then((items) => {
        if (!isMounted) return;
        setPlans(items.map(apiPlanToUi));
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger les plans.";
        toast.error(message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const openEditDialog = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setFormState(planToFormState(plan));
    setFormError(null);
    setDialogOpen(true);
  };

  const toggleModule = (moduleName: string, checked: boolean) => {
    if (!formState) return;

    const nextModules = checked
      ? Array.from(new Set([...formState.modules, moduleName]))
      : formState.modules.filter((module) => module !== moduleName);

    setFormState({
      ...formState,
      modules: nextModules,
    });
  };

  const savePlan = async () => {
    const accessToken = session?.accessToken;
    if (!accessToken || !selectedPlan || !formState) return;

    const validation = planSchema.safeParse(formState);
    if (!validation.success) {
      setFormError(
        validation.error.issues[0]?.message ?? "Formulaire invalide.",
      );
      toast.error("Veuillez corriger le formulaire.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = validation.data;

    try {
      const updated = await updatePlan(accessToken, selectedPlan.id, {
        name: payload.name,
        max_students: payload.maxStudents,
        max_staff: payload.maxStaff,
        modules_activated: payload.modules,
        storage_max_gb: payload.storageGb,
        price_monthly: payload.monthlyPrice,
        price_annual: payload.yearlyPrice,
      });

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === selectedPlan.id ? apiPlanToUi(updated as PlanItem) : plan,
        ),
      );
      toast.success("Plan mis a jour avec succes.");
      setDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inattendue.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Plans d'abonnement"
        description="Gestion des limites, modules et tarifs Starter, Pro et Enterprise."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement des plans...</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="border border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{formatPlanName(plan.name)}</CardTitle>
                <StatusBadge status="active" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Max eleves</p>
                  <p className="font-medium">
                    {plan.maxStudents.toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Max staff</p>
                  <p className="font-medium">
                    {plan.maxStaff.toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="col-span-2 rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Stockage</p>
                  <p className="font-medium">{plan.storageGb} Go</p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Modules actives
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.modules.map((moduleName) => (
                    <span
                      key={moduleName}
                      className="rounded-full border px-2 py-0.5 text-xs capitalize"
                    >
                      {moduleName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-0.5 rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Tarifs</p>
                <p className="text-sm font-medium">
                  Mensuel: {formatMoney(plan.monthlyPrice)}
                </p>
                <p className="text-sm font-medium">
                  Annuel: {formatMoney(plan.yearlyPrice)}
                </p>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => openEditDialog(plan)}
              >
                Modifier
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier le plan</DialogTitle>
            <DialogDescription>
              Mettre a jour limites, modules et tarification du plan.
            </DialogDescription>
          </DialogHeader>

          {formState ? (
            <div className="grid gap-3 py-1 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Nom du plan</label>
                <Input value={formatPlanName(formState.name)} disabled />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Max eleves</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.maxStudents}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      maxStudents: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Max staff</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.maxStaff}
                  onChange={(event) =>
                    setFormState({ ...formState, maxStaff: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Stockage (Go)</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.storageGb}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      storageGb: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tarif mensuel (GNF)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={formState.monthlyPrice}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      monthlyPrice: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tarif annuel (GNF)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={formState.yearlyPrice}
                  onChange={(event) =>
                    setFormState({
                      ...formState,
                      yearlyPrice: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Modules actives</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_MODULES.map((moduleName) => {
                    const checked = formState.modules.includes(moduleName);
                    return (
                      <label
                        key={moduleName}
                        className="flex items-center gap-2 rounded-md border p-2 text-sm capitalize"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleModule(moduleName, Boolean(value))
                          }
                        />
                        {moduleName}
                      </label>
                    );
                  })}
                </div>
              </div>

              {formError ? (
                <p className="text-sm text-destructive sm:col-span-2">
                  {formError}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button onClick={savePlan} disabled={submitting || !formState}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
