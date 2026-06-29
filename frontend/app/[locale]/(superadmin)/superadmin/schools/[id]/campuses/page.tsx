"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type CampusCreateBody,
  type CampusItem,
  createCampus,
  getCampuses,
  updateCampus,
} from "@/lib/api/superadmin";

// ── Cycles disponibles ───────────────────────────────────────────────────────

const AVAILABLE_CYCLES = [
  { value: "MATERNELLE", label: "Maternelle" },
  { value: "PRIMAIRE", label: "Primaire" },
  { value: "CQP", label: "CQP" },
  { value: "COLLEGE", label: "Collège" },
  { value: "LYCEE_GEN", label: "Lycée Général" },
  { value: "LYCEE_TECH", label: "Lycée Technique" },
  { value: "ETFP_A", label: "ETFP A" },
  { value: "ETFP_B", label: "ETFP B" },
  { value: "SUPERIEUR", label: "Supérieur" },
] as const;

// ── Campus Form Dialog ────────────────────────────────────────────────────────

type CampusFormState = {
  name: string;
  address: string;
  city: string;
  prefecture: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  active_levels: string[];
  is_main: boolean;
  is_active: boolean;
};

const EMPTY_FORM: CampusFormState = {
  name: "",
  address: "",
  city: "",
  prefecture: "",
  phone: "",
  email: "",
  latitude: "",
  longitude: "",
  active_levels: [],
  is_main: false,
  is_active: true,
};

function campusToForm(campus: CampusItem): CampusFormState {
  return {
    name: campus.name,
    address: campus.address,
    city: campus.city,
    prefecture: campus.prefecture,
    phone: campus.phone,
    email: campus.email,
    latitude: campus.latitude ?? "",
    longitude: campus.longitude ?? "",
    active_levels: campus.active_levels,
    is_main: campus.is_main,
    is_active: campus.is_active,
  };
}

function CampusFormDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData: CampusFormState;
  onSave: (data: CampusCreateBody) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CampusFormState>(initialData);

  const toggleCycle = (cycle: string) => {
    setForm((prev) => ({
      ...prev,
      active_levels: prev.active_levels.includes(cycle)
        ? prev.active_levels.filter((c) => c !== cycle)
        : [...prev.active_levels, cycle],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: CampusCreateBody = {
      name: form.name,
      address: form.address || undefined,
      city: form.city || undefined,
      prefecture: form.prefecture || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      active_levels: form.active_levels,
      is_main: form.is_main,
      is_active: form.is_active,
    };
    await onSave(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {initialData === EMPTY_FORM
              ? "Nouveau campus"
              : "Modifier le campus"}
          </DialogTitle>
        </DialogHeader>
        <form
          id="campus-form"
          onSubmit={handleSubmit}
          className="space-y-4 py-2"
        >
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="campus-name">Nom du campus *</Label>
            <Input
              id="campus-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Campus Principal, Campus Nord…"
              required
            />
          </div>

          {/* Adresse */}
          <div className="space-y-1.5">
            <Label htmlFor="campus-address">Adresse</Label>
            <Input
              id="campus-address"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Quartier, rue…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campus-city">Ville</Label>
              <Input
                id="campus-city"
                value={form.city}
                onChange={(e) =>
                  setForm((p) => ({ ...p, city: e.target.value }))
                }
                placeholder="Conakry"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-pref">Préfecture</Label>
              <Input
                id="campus-pref"
                value={form.prefecture}
                onChange={(e) =>
                  setForm((p) => ({ ...p, prefecture: e.target.value }))
                }
                placeholder="Coyah"
              />
            </div>
          </div>

          {/* Coordonnées GPS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campus-lat">Latitude GPS</Label>
              <Input
                id="campus-lat"
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(e) =>
                  setForm((p) => ({ ...p, latitude: e.target.value }))
                }
                placeholder="9.537500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-lng">Longitude GPS</Label>
              <Input
                id="campus-lng"
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(e) =>
                  setForm((p) => ({ ...p, longitude: e.target.value }))
                }
                placeholder="-13.677330"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campus-phone">Téléphone</Label>
              <Input
                id="campus-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+224 XXX XXX XXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-email">Email</Label>
              <Input
                id="campus-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="campus@ecole.gn"
              />
            </div>
          </div>

          {/* Niveaux activés */}
          <div className="space-y-2">
            <Label>Cycles actifs sur ce campus</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CYCLES.map((c) => {
                const active = form.active_levels.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCycle(c.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {active && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Campus principal</p>
                <p className="text-xs text-muted-foreground">
                  Siège de l&apos;établissement
                </p>
              </div>
              <Switch
                id="campus-main"
                checked={form.is_main}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_main: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Campus actif</p>
                <p className="text-xs text-muted-foreground">
                  Visible et opérationnel
                </p>
              </div>
              <Switch
                id="campus-active"
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, is_active: v }))
                }
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button form="campus-form" type="submit" disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Campus Card ───────────────────────────────────────────────────────────────

function CampusCard({
  campus,
  onEdit,
}: {
  campus: CampusItem;
  onEdit: (campus: CampusItem) => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden transition-shadow hover:shadow-md ${
        !campus.is_active ? "opacity-60" : ""
      }`}
    >
      {/* Bande colorée campus principal */}
      {campus.is_main && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-primary" />
            <CardTitle className="text-base">{campus.name}</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {campus.is_main && (
              <Badge variant="default" className="gap-1 text-xs">
                <Star className="h-3 w-3" />
                Principal
              </Badge>
            )}
            <Badge
              variant={campus.is_active ? "outline" : "secondary"}
              className="text-xs"
            >
              {campus.is_active ? "Actif" : "Inactif"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(campus)}
              aria-label={`Modifier ${campus.name}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Localisation */}
        {(campus.city || campus.address) && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">
              {[campus.address, campus.city, campus.prefecture]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {/* GPS */}
        {campus.latitude && campus.longitude && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              {parseFloat(campus.latitude).toFixed(4)},{" "}
              {parseFloat(campus.longitude).toFixed(4)}
            </span>
          </div>
        )}

        {/* Contact */}
        <div className="flex flex-wrap gap-3">
          {campus.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {campus.phone}
            </div>
          )}
          {campus.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {campus.email}
            </div>
          )}
        </div>

        {/* Niveaux activés */}
        {campus.active_levels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {campus.active_levels.map((level) => (
              <span
                key={level}
                className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {AVAILABLE_CYCLES.find((c) => c.value === level)?.label ??
                  level}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              <strong className="text-foreground">
                {campus.students_count}
              </strong>{" "}
              élève
              {campus.students_count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>
              <strong className="text-foreground">
                {campus.classes_count}
              </strong>{" "}
              classe
              {campus.classes_count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CampusesPage() {
  const params = useParams();
  const schoolId = params?.id as string;
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<CampusItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formInitialData: CampusFormState = editingCampus
    ? campusToForm(editingCampus)
    : EMPTY_FORM;

  useEffect(() => {
    if (!token || !schoolId) return;
    getCampuses(token, schoolId)
      .then((data) => {
        setCampuses(data);
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erreur lors de l'enregistrement.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, schoolId]);

  const openCreate = () => {
    setEditingCampus(null);
    setDialogOpen(true);
  };

  const openEdit = (campus: CampusItem) => {
    setEditingCampus(campus);
    setDialogOpen(true);
  };

  const handleSave = async (body: CampusCreateBody) => {
    if (!token || !schoolId) return;
    setIsSaving(true);
    try {
      if (editingCampus) {
        const updated = await updateCampus(
          token,
          schoolId,
          editingCampus.id,
          body,
        );
        setCampuses((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        toast.success(`Campus "${updated.name}" mis à jour.`);
      } else {
        const created = await createCampus(token, schoolId, body);
        setCampuses((prev) => [...prev, created]);
        toast.success(`Campus "${created.name}" créé avec succès.`);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus"
        description={`${campuses.length} campus configuré${campuses.length !== 1 ? "s" : ""} pour cet établissement`}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau campus
          </Button>
        }
      />

      {/* Liste */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium">Aucun campus configuré</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez le premier campus de cet établissement.
          </p>
          <Button onClick={openCreate} className="mt-6 gap-2">
            <Plus className="h-4 w-4" />
            Créer un campus
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campuses.map((campus) => (
            <CampusCard key={campus.id} campus={campus} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Dialog création / édition */}
      <CampusFormDialog
        key={editingCampus?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={formInitialData}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
