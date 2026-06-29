"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type ClassItem,
  type SchoolYearItem,
  type SubjectItem,
  type TeacherItem,
  type TimetableSlotItem,
  createTimetableSlot,
  deleteTimetableSlot,
  getClasses,
  getSchoolYears,
  getSubjects,
  getTeachers,
  getTimetableSlots,
  updateTimetableSlot,
} from "@/lib/api/pedagogy";

const DAYS = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
];

// Time slots from 07:00 to 18:00 by 30-min steps
const TIME_SLOTS = Array.from({ length: 23 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

// Palette for subject coloring
const SLOT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-red-100 text-red-800 border-red-200",
];

function getSubjectColor(subjectId: number) {
  return SLOT_COLORS[subjectId % SLOT_COLORS.length];
}

const slotSchema = z
  .object({
    day_of_week: z.string().min(1, "Le jour est requis."),
    start_time: z.string().min(1, "L'heure de début est requise."),
    end_time: z.string().min(1, "L'heure de fin est requise."),
    subject: z.string().min(1, "La matière est requise."),
    teacher: z.string().min(1, "L'enseignant est requis."),
    room: z.string().optional(),
    mixed_level: z.string().optional(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["end_time"],
  });

type SlotFormValues = z.infer<typeof slotSchema>;
type DialogMode =
  { type: "create"; day: string } | { type: "edit"; slot: TimetableSlotItem };

export default function TimetablePage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [slots, setSlots] = useState<TimetableSlotItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  const token = session?.accessToken ?? "";

  // Load classes and subjects once
  useEffect(() => {
    if (!token) return;
    Promise.all([
      getClasses(token),
      getSubjects(token),
      getSchoolYears(token),
      getTeachers(token),
    ])
      .then(([classRes, subjectRes, yearRes, teacherRes]) => {
        setClasses(classRes.results);
        setSubjects(subjectRes.results);
        setYears(yearRes.results);
        setTeachers(teacherRes.results);
        // Auto-select current year's first class
        const currentYear = yearRes.results.find((y) => y.is_current);
        if (currentYear) {
          const firstClass = classRes.results.find(
            (c) => c.school_year === currentYear.id,
          );
          if (firstClass) setSelectedClass(String(firstClass.id));
        } else if (classRes.results[0]) {
          setSelectedClass(String(classRes.results[0].id));
        }
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Erreur de chargement."),
      );
  }, [token]);

  // Load timetable slots when class changes
  useEffect(() => {
    if (!token || !selectedClass) return;
    let mounted = true;
    getTimetableSlots(token, Number(selectedClass))
      .then((res) => {
        if (mounted) setSlots(res);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur."))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, selectedClass, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const selectedClassInfo = useMemo(
    () => classes.find((c) => String(c.id) === selectedClass) ?? null,
    [classes, selectedClass],
  );

  const handleDelete = async (slot: TimetableSlotItem) => {
    try {
      await deleteTimetableSlot(token, slot.id);
      toast.success("Créneau supprimé.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  // Slots grouped by day
  const slotsByDay = DAYS.reduce<Record<string, TimetableSlotItem[]>>(
    (acc, d) => {
      acc[d.value] = slots
        .filter((s) => s.day_of_week === d.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      return acc;
    },
    {},
  );

  return (
    <section className="space-y-4">
      <PageHeader
        title="Emploi du temps"
        description="Consultez et gérez les créneaux horaires par classe."
      />

      {/* Class selector */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Select
          value={selectedClass}
          onValueChange={(v) => v && setSelectedClass(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => {
              const yearClasses = classes.filter((c) => c.school_year === y.id);
              if (!yearClasses.length) return null;
              return (
                <div key={y.id}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {y.label}
                    {y.is_current ? " (courante)" : ""}
                  </div>
                  {yearClasses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly grid */}
      {!selectedClass ? (
        <p className="py-8 text-center text-muted-foreground">
          Sélectionnez une classe pour afficher l&apos;emploi du temps.
        </p>
      ) : loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : (
        <ScrollArea className="w-full">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-6 gap-2">
              {DAYS.map((day) => (
                <div key={day.value} className="flex flex-col gap-2">
                  {/* Day header */}
                  <div className="rounded-md bg-muted px-3 py-2 text-center text-sm font-semibold">
                    {day.label}
                  </div>

                  {/* Slots */}
                  {slotsByDay[day.value].map((slot) => {
                    const subject = subjects.find((s) => s.id === slot.subject);
                    const colorClass = getSubjectColor(slot.subject);
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-md border p-2 text-xs ${colorClass}`}
                      >
                        <p className="font-semibold truncate">
                          {subject?.name ?? `Matière #${slot.subject}`}
                        </p>
                        <p className="mt-0.5">
                          {slot.start_time.slice(0, 5)} –{" "}
                          {slot.end_time.slice(0, 5)}
                        </p>
                        {slot.mixed_level_name && (
                          <p className="truncate text-[10px] font-semibold opacity-75">
                            {slot.mixed_level_name}
                          </p>
                        )}
                        {slot.room && (
                          <p className="truncate text-[10px] opacity-75">
                            {slot.room}
                          </p>
                        )}
                        {slot.teacher_name && (
                          <p className="mt-0.5 truncate text-[10px] opacity-60">
                            {slot.teacher_name}
                          </p>
                        )}
                        <div className="mt-1.5 flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={() =>
                              setDialogMode({ type: "edit", slot })
                            }
                          >
                            Modifier
                          </Button>
                          <ConfirmDialog
                            title="Supprimer ce créneau"
                            description="Confirmer la suppression ?"
                            variant="destructive"
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-5 px-1.5 text-[10px]"
                              >
                                ×
                              </Button>
                            }
                            confirmLabel="Supprimer"
                            loadingLabel="Suppression..."
                            onConfirm={() => handleDelete(slot)}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Add slot button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
                    onClick={() =>
                      setDialogMode({ type: "create", day: day.value })
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Ajouter
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {dialogMode && selectedClass && (
        <SlotFormDialog
          mode={dialogMode}
          token={token}
          classeId={Number(selectedClass)}
          subjects={subjects}
          teachers={teachers}
          isMixed={selectedClassInfo?.is_mixed ?? false}
          mixedLevels={selectedClassInfo?.mixed_levels ?? []}
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

// ─── SlotFormDialog ───────────────────────────────────────────────────────────

function SlotFormDialog({
  mode,
  token,
  classeId,
  subjects,
  teachers,
  isMixed,
  mixedLevels,
  onClose,
  onSuccess,
}: {
  mode: DialogMode;
  token: string;
  classeId: number;
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  isMixed: boolean;
  mixedLevels: ClassItem["mixed_levels"];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = mode.type === "edit";
  const slot = isEditing ? mode.slot : null;
  const defaultDay =
    mode.type === "create" ? mode.day : (slot?.day_of_week ?? "1");

  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      day_of_week: defaultDay,
      start_time: slot?.start_time.slice(0, 5) ?? "08:00",
      end_time: slot?.end_time.slice(0, 5) ?? "09:00",
      subject: slot?.subject ? String(slot.subject) : "",
      teacher: slot?.teacher ? String(slot.teacher) : "",
      room: slot?.room ?? "",
      mixed_level: slot?.mixed_level ? String(slot.mixed_level) : "",
    },
  });

  const onSubmit = async (values: SlotFormValues) => {
    try {
      const body: Record<string, unknown> = {
        classe: classeId,
        day_of_week: values.day_of_week,
        start_time: values.start_time,
        end_time: values.end_time,
        subject: Number(values.subject),
        teacher: Number(values.teacher),
        room: values.room ?? "",
      };
      if (isMixed && values.mixed_level) {
        body.mixed_level = Number(values.mixed_level);
      }
      if (isEditing && slot) {
        await updateTimetableSlot(token, slot.id, body);
        toast.success("Créneau modifié.");
      } else {
        await createTimetableSlot(token, body);
        toast.success("Créneau ajouté.");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le créneau" : "Ajouter un créneau"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="day_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jour</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_SLOTS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matière</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une matière" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isMixed && (
              <FormField
                control={form.control}
                name="mixed_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau (classe mixte)</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les niveaux" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Tous les niveaux</SelectItem>
                        {mixedLevels.map((ml) => (
                          <SelectItem key={ml.id} value={String(ml.level)}>
                            {ml.level_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="teacher"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enseignant *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un enseignant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.last_name} {t.first_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salle (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Salle A1" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
