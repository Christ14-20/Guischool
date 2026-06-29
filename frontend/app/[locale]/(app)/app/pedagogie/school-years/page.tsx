"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type SchoolYearItem,
  createSchoolYear,
  getSchoolYears,
  updateSchoolYear,
} from "@/lib/api/pedagogy";

const STATUS_LABELS: Record<SchoolYearItem["status"], string> = {
  PREPARATION: "Préparation",
  OUVERTE: "Ouverte",
  EN_COURS: "En cours",
  CLOTURE_EN_COURS: "Clôture en cours",
  CLOTUREE: "Clôturée",
};

const schema = z.object({
  label: z
    .string()
    .min(4, "Le libellé est requis.")
    .regex(/^\d{4}-\d{4}$/, "Format requis : AAAA-AAAA (ex: 2025-2026)"),
  start_date: z.string().min(1, "La date de début est requise."),
  end_date: z.string().min(1, "La date de fin est requise."),
  status: z.enum([
    "PREPARATION",
    "OUVERTE",
    "EN_COURS",
    "CLOTURE_EN_COURS",
    "CLOTUREE",
  ]),
  is_current: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type DialogMode = { type: "create" } | { type: "edit"; year: SchoolYearItem };

export default function SchoolYearsPage() {
  const { data: session } = useSession();
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  const token = session?.accessToken ?? "";

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    getSchoolYears(token)
      .then((res) => {
        if (mounted) {
          setYears(res.results);
          setTotal(res.count);
        }
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Erreur de chargement."),
      )
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const hasActiveYear = years.some((y) => y.is_current);

  const openCreate = () => setDialogMode({ type: "create" });
  const openEdit = (year: SchoolYearItem) =>
    setDialogMode({ type: "edit", year });

  const handleActivate = async (year: SchoolYearItem) => {
    try {
      await updateSchoolYear(token, year.id, {
        is_current: true,
        status: "EN_COURS",
      });
      toast.success(`${year.label} définie comme année courante.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const handleClose = async (year: SchoolYearItem) => {
    try {
      await updateSchoolYear(token, year.id, {
        status: "CLOTUREE",
        is_current: false,
      });
      toast.success(`${year.label} clôturée.`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Années scolaires"
        description="Gérez les années scolaires de l'établissement."
        actions={<Button onClick={openCreate}>Créer une année scolaire</Button>}
      />

      {!loading && !hasActiveYear && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune année scolaire active. Veuillez en activer une pour utiliser
            les autres modules.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Libellé</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Courante</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Chargement...
                </TableCell>
              </TableRow>
            ) : years.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Aucune année scolaire trouvée.
                </TableCell>
              </TableRow>
            ) : (
              years.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">
                    {year.label}
                    {year.is_current && (
                      <Badge
                        variant="default"
                        className="ml-2 bg-green-600 text-white text-xs"
                      >
                        Courante
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(year.start_date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {new Date(year.end_date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={STATUS_LABELS[year.status]} />
                  </TableCell>
                  <TableCell>{year.is_current ? "Oui" : "Non"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(year)}
                      >
                        Modifier
                      </Button>
                      {!year.is_current && year.status !== "CLOTUREE" && (
                        <ConfirmDialog
                          title="Activer cette année"
                          description={`Définir "${year.label}" comme année courante ? L'année actuellement active sera désactivée.`}
                          trigger={<Button size="sm">Activer</Button>}
                          confirmLabel="Activer"
                          loadingLabel="Activation..."
                          onConfirm={() => handleActivate(year)}
                        />
                      )}
                      {year.status === "EN_COURS" && (
                        <ConfirmDialog
                          title="Clôturer cette année"
                          description={`Clôturer "${year.label}" ? Cette action est irréversible.`}
                          variant="destructive"
                          trigger={
                            <Button variant="destructive" size="sm">
                              Clôturer
                            </Button>
                          }
                          confirmLabel="Clôturer"
                          loadingLabel="Clôture..."
                          onConfirm={() => handleClose(year)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && total > 0 && (
          <p className="px-4 py-2 text-sm text-muted-foreground">
            {total} année(s) au total
          </p>
        )}
      </div>

      {dialogMode && (
        <SchoolYearDialog
          mode={dialogMode}
          token={token}
          onClose={() => setDialogMode(null)}
          onSuccess={() => {
            setDialogMode(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

// ─── SchoolYearDialog ────────────────────────────────────────────────────────

function SchoolYearDialog({
  mode,
  token,
  onClose,
  onSuccess,
}: {
  mode: DialogMode;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = mode.type === "edit";
  const year = isEditing ? mode.year : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: year?.label ?? "",
      start_date: year?.start_date ?? "",
      end_date: year?.end_date ?? "",
      status: year?.status ?? "PREPARATION",
      is_current: year?.is_current ?? false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && year) {
        await updateSchoolYear(token, year.id, values);
        toast.success("Année scolaire modifiée.");
      } else {
        await createSchoolYear(token, values);
        toast.success("Année scolaire créée.");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Modifier l'année scolaire"
              : "Nouvelle année scolaire"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="2025-2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PREPARATION">
                        En préparation
                      </SelectItem>
                      <SelectItem value="OUVERTE">
                        Ouverte aux inscriptions
                      </SelectItem>
                      <SelectItem value="EN_COURS">En cours</SelectItem>
                      <SelectItem value="CLOTURE_EN_COURS">
                        Clôture en cours
                      </SelectItem>
                      <SelectItem value="CLOTUREE">Clôturée</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_current"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Définir comme année courante
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Enregistrement..."
                  : isEditing
                    ? "Modifier"
                    : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
