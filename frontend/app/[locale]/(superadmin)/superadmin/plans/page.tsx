'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Plan = {
  id: string;
  name: 'Starter' | 'Pro' | 'Enterprise';
  maxStudents: number;
  maxStaff: number;
  storageGb: number;
  modules: string[];
  monthlyPrice: number;
  yearlyPrice: number;
};

const AVAILABLE_MODULES = ['pedagogy', 'students', 'grades', 'finance', 'support', 'monitoring'];

const planSchema = z.object({
  name: z.string().min(2, 'Nom invalide.'),
  maxStudents: z.coerce.number().int().min(1, 'Min 1 eleve.'),
  maxStaff: z.coerce.number().int().min(1, 'Min 1 staff.'),
  storageGb: z.coerce.number().int().min(1, 'Min 1 Go.'),
  modules: z.array(z.string()).min(1, 'Selectionnez au moins un module.'),
  monthlyPrice: z.coerce.number().min(0, 'Prix mensuel invalide.'),
  yearlyPrice: z.coerce.number().min(0, 'Prix annuel invalide.'),
});

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    maxStudents: 500,
    maxStaff: 40,
    storageGb: 20,
    modules: ['pedagogy', 'students', 'grades'],
    monthlyPrice: 400000,
    yearlyPrice: 4200000,
  },
  {
    id: 'pro',
    name: 'Pro',
    maxStudents: 2500,
    maxStaff: 180,
    storageGb: 80,
    modules: ['pedagogy', 'students', 'grades', 'finance', 'support'],
    monthlyPrice: 900000,
    yearlyPrice: 9600000,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    maxStudents: 10000,
    maxStaff: 800,
    storageGb: 300,
    modules: AVAILABLE_MODULES,
    monthlyPrice: 2200000,
    yearlyPrice: 24000000,
  },
];

type FormState = {
  name: string;
  maxStudents: string;
  maxStaff: string;
  storageGb: string;
  modules: string[];
  monthlyPrice: string;
  yearlyPrice: string;
};

function formatMoney(value: number) {
  return `${value.toLocaleString('fr-FR')} GNF`;
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
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

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
    if (!selectedPlan || !formState) return;

    const validation = planSchema.safeParse(formState);
    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message ?? 'Formulaire invalide.');
      toast.error('Veuillez corriger le formulaire.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = validation.data;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${base}/superadmin/plans/${selectedPlan.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          max_students: payload.maxStudents,
          max_staff: payload.maxStaff,
          storage_gb: payload.storageGb,
          modules: payload.modules,
          monthly_price: payload.monthlyPrice,
          yearly_price: payload.yearlyPrice,
        }),
      });

      if (!response.ok) throw new Error('Mise a jour impossible pour le moment.');

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === selectedPlan.id
            ? {
                ...plan,
                name: payload.name as Plan['name'],
                maxStudents: payload.maxStudents,
                maxStaff: payload.maxStaff,
                storageGb: payload.storageGb,
                modules: payload.modules,
                monthlyPrice: payload.monthlyPrice,
                yearlyPrice: payload.yearlyPrice,
              }
            : plan
        )
      );

      toast.success('Plan mis a jour avec succes.');
      setDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inattendue.';
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

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="border border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <StatusBadge status="active" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Max eleves</p>
                  <p className="font-medium">{plan.maxStudents.toLocaleString('fr-FR')}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Max staff</p>
                  <p className="font-medium">{plan.maxStaff.toLocaleString('fr-FR')}</p>
                </div>
                <div className="rounded-md border p-2 col-span-2">
                  <p className="text-xs text-muted-foreground">Stockage</p>
                  <p className="font-medium">{plan.storageGb} Go</p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Modules actives</p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.modules.map((moduleName) => (
                    <span key={moduleName} className="rounded-full border px-2 py-0.5 text-xs capitalize">
                      {moduleName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-0.5 rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Tarifs</p>
                <p className="text-sm font-medium">Mensuel: {formatMoney(plan.monthlyPrice)}</p>
                <p className="text-sm font-medium">Annuel: {formatMoney(plan.yearlyPrice)}</p>
              </div>

              <Button className="w-full" variant="outline" onClick={() => openEditDialog(plan)}>
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
            <DialogDescription>Mettre a jour limites, modules et tarification du plan.</DialogDescription>
          </DialogHeader>

          {formState ? (
            <div className="grid gap-3 py-1 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Nom du plan</label>
                <Input
                  value={formState.name}
                  onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Max eleves</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.maxStudents}
                  onChange={(event) => setFormState({ ...formState, maxStudents: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Max staff</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.maxStaff}
                  onChange={(event) => setFormState({ ...formState, maxStaff: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Stockage (Go)</label>
                <Input
                  type="number"
                  min={1}
                  value={formState.storageGb}
                  onChange={(event) => setFormState({ ...formState, storageGb: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Tarif mensuel (GNF)</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.monthlyPrice}
                  onChange={(event) => setFormState({ ...formState, monthlyPrice: event.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Tarif annuel (GNF)</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.yearlyPrice}
                  onChange={(event) => setFormState({ ...formState, yearlyPrice: event.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Modules actives</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_MODULES.map((moduleName) => {
                    const checked = formState.modules.includes(moduleName);

                    return (
                      <label key={moduleName} className="flex items-center gap-2 rounded-md border p-2 text-sm capitalize">
                        <Checkbox checked={checked} onCheckedChange={(value) => toggleModule(moduleName, Boolean(value))} />
                        {moduleName}
                      </label>
                    );
                  })}
                </div>
              </div>

              {formError ? <p className="text-sm text-destructive sm:col-span-2">{formError}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={savePlan} disabled={submitting || !formState}>
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}