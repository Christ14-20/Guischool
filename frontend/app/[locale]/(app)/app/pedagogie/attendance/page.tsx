"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AttendanceItem,
  type ClassItem,
  type SchoolYearItem,
  type SubjectItem,
  bulkCreateAttendances,
  getAttendances,
  getClasses,
  getSchoolYears,
  getSubjects,
} from "@/lib/api/pedagogy";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCLUDED";

type StudentRow = {
  studentId: string;
  name: string;
  status: AttendanceStatus;
  existingId?: number;
};

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  color: string;
}[] = [
  { value: "PRESENT", label: "Présent", color: "bg-green-100 text-green-800" },
  { value: "ABSENT", label: "Absent", color: "bg-red-100 text-red-800" },
  { value: "LATE", label: "Retard", color: "bg-yellow-100 text-yellow-800" },
  { value: "EXCLUDED", label: "Exclu", color: "bg-orange-100 text-orange-800" },
];

const PIE_COLORS: Record<string, string> = {
  PRESENT: "#22c55e",
  ABSENT: "#ef4444",
  LATE: "#eab308",
  EXCLUDED: "#f97316",
};

function toYYYYMMDD(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    toYYYYMMDD(new Date()),
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<AttendanceItem[]>(
    [],
  );
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = session?.accessToken ?? "";
  const today = toYYYYMMDD(new Date());
  const isReadOnly = selectedDate < today;

  // Load metadata once
  useEffect(() => {
    if (!token) return;
    Promise.all([getClasses(token), getSchoolYears(token), getSubjects(token)])
      .then(([classRes, yearRes, subjectRes]) => {
        setClasses(classRes.results);
        setYears(yearRes.results);
        setSubjects(subjectRes.results);
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
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur."))
      .finally(() => setLoadingMeta(false));
  }, [token]);

  // Load attendance records when filters change
  useEffect(() => {
    if (!token || !selectedClass || !selectedDate) return;
    let mounted = true;

    const query: Record<string, string | number | undefined> = {
      classe: Number(selectedClass),
      date: selectedDate,
    };
    if (selectedSubject) query.subject = Number(selectedSubject);

    getAttendances(token, query)
      .then((res) => {
        if (!mounted) return;
        setHistoricalRecords(res.results);

        // Build rows from existing records (no student endpoint here — derive from attendance)
        const rowMap = new Map<string, StudentRow>();
        res.results.forEach((a) => {
          rowMap.set(a.student, {
            studentId: a.student,
            name: a.student, // will be replaced when student detail is available
            status: a.status as AttendanceStatus,
            existingId: a.id,
          });
        });
        setRows(Array.from(rowMap.values()));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur."))
      .finally(() => {
        if (mounted) setLoadingHistory(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, selectedClass, selectedDate, selectedSubject, refreshKey]);

  const setAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: "PRESENT" })));
  };

  const setRowStatus = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    );
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedDate || rows.length === 0) return;
    setSubmitting(true);
    try {
      const records = rows.map((r) => ({
        student: r.studentId,
        classe: Number(selectedClass),
        date: selectedDate,
        status: r.status,
        subject: selectedSubject ? Number(selectedSubject) : null,
      }));
      await bulkCreateAttendances(token, records);
      toast.success("Présences enregistrées avec succès.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'enregistrement.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Stats for PieChart
  const stats = useMemo(() => {
    const counts = historicalRecords.reduce<Record<string, number>>(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [historicalRecords]);

  const classOptions = years.flatMap((y) =>
    classes
      .filter((c) => c.school_year === y.id)
      .map((c) => ({ ...c, yearLabel: y.label, isCurrent: y.is_current })),
  );

  return (
    <section className="space-y-4">
      <PageHeader
        title="Gestion des présences"
        description="Enregistrez et consultez les présences des élèves."
      />

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Classe</Label>
          <Select
            value={selectedClass}
            onValueChange={(v) => v && setSelectedClass(v)}
            disabled={loadingMeta}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} — {c.yearLabel}
                  {c.isCurrent ? " ★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            Matière (optionnel)
          </Label>
          <Select
            value={selectedSubject}
            onValueChange={(v) => setSelectedSubject(v ?? "")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les matières" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les matières</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance table */}
        <div className="lg:col-span-2 rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-medium">
              {isReadOnly
                ? "Présences (lecture seule)"
                : "Saisie des présences"}
            </p>
            {!isReadOnly && rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={setAllPresent}>
                Tous présents
              </Button>
            )}
          </div>

          {loadingHistory ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {selectedClass
                ? "Aucune présence enregistrée pour ce créneau. Sélectionnez les élèves via le module Élèves."
                : "Sélectionnez une classe pour afficher les présences."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_OPTIONS.find((s) => s.value === row.status)
                              ?.color ?? ""
                          }`}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === row.status)
                            ?.label ?? row.status}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setRowStatus(row.studentId, opt.value)
                              }
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border transition-all ${
                                row.status === opt.value
                                  ? `${opt.color} border-current ring-1 ring-current`
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isReadOnly && rows.length > 0 && (
            <div className="flex justify-end border-t px-4 py-3">
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer tout"}
              </Button>
            </div>
          )}
        </div>

        {/* Stats chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Statistiques d&apos;assiduité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune donnée disponible.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${STATUS_OPTIONS.find((s) => s.value === name)?.label ?? name} ${Math.round((percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {stats.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[entry.name] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      STATUS_OPTIONS.find((s) => s.value === name)?.label ??
                        name,
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      STATUS_OPTIONS.find((s) => s.value === value)?.label ??
                      value
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
