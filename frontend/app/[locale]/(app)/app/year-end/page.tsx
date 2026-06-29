"use client";

import { AlertCircle, Loader2, Save, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  getClasses,
  getSchoolYears,
  getClassRanking,
  getYearEndDecisions,
  createYearEndDecision,
  type ClassItem,
  type SchoolYearItem,
} from "@/lib/api/pedagogy";
import { PERMISSIONS } from "@/lib/constants";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type RankingStudent = Record<string, unknown> & {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  moyenne: number;
};

const DECISIONS = [
  { value: "ADMIS", label: "Admis" },
  { value: "REDOUBLE", label: "Redoublant" },
  { value: "ORIENTE", label: "Orienté" },
  { value: "TRANSFERE", label: "Transféré" },
  { value: "EXCLU", label: "Exclu" },
];

export default function YearEndPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [threshold, setThreshold] = useState("10");

  const [students, setStudents] = useState<RankingStudent[]>([]);
  const [decisions, setDecisions] = useState<
    Record<string, { decision: string; comment: string }>
  >({});

  const [, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentYear = useMemo(
    () => years.find((y) => String(y.id) === yearId),
    [years, yearId],
  );
  const isClosing = currentYear?.status === "CLOTURE_EN_COURS";

  useEffect(() => {
    if (!token) return;
    Promise.all([getSchoolYears(token), getClasses(token)])
      .then(([yearRes, classRes]) => {
        setYears(yearRes.results);
        setClasses(classRes.results);
        if (yearRes.results.length > 0) {
          const closing = yearRes.results.find(
            (y) => y.status === "CLOTURE_EN_COURS",
          );
          if (closing) setYearId(String(closing.id));
        }
      })
      .finally(() => setLoadingFilters(false));
  }, [token]);

  useEffect(() => {
    if (!token || !yearId || !classId) return;

    // On récupère le classement annuel (sans période)
    Promise.all([
      getClassRanking(token, classId, yearId),
      getYearEndDecisions(token, { annee: yearId, classe: classId }),
    ])
      .then(([ranking, existingDecisions]) => {
        setStudents(ranking as RankingStudent[]);

        const initialDecisions: Record<
          string,
          { decision: string; comment: string }
        > = {};
        (ranking as RankingStudent[]).forEach((s) => {
          const existing = (
            existingDecisions.results as Array<Record<string, unknown>>
          )?.find((d) => d.eleve === s.eleve_id);
          if (existing) {
            initialDecisions[s.eleve_id] = {
              decision: String(existing.decision ?? ""),
              comment: String(existing.commentaire ?? ""),
            };
          } else {
            // Pre-fill based on threshold
            const autoDecision =
              (s.moyenne || 0) >= Number(threshold) ? "ADMIS" : "REDOUBLE";
            initialDecisions[s.eleve_id] = {
              decision: autoDecision,
              comment: "",
            };
          }
        });
        setDecisions(initialDecisions);
      })
      .catch(() => toast.error("Erreur chargement des données."))
      .finally(() => setLoadingData(false));
  }, [token, yearId, classId, threshold]);

  const handleDecisionChange = (studentId: string, value: string) => {
    setDecisions((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], decision: value },
    }));
  };

  const handleSaveAll = async () => {
    if (!token || !yearId || !classId) return;

    setSaving(true);
    try {
      const promises = Object.entries(decisions).map(([studentId, data]) =>
        createYearEndDecision(token, {
          eleve: studentId,
          annee_scolaire: yearId,
          classe_origine: classId,
          decision: data.decision,
          commentaire: data.comment,
        }),
      );
      await Promise.all(promises);
      toast.success("Toutes les décisions ont été enregistrées.");
    } catch {
      toast.error("Erreur lors de l'enregistrement groupé.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Décisions de Fin d'Année"
        description="Validez le passage, le redoublement ou l'orientation des élèves en fin d'exercice."
      />

      {!isClosing && yearId && (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Restreinte</AlertTitle>
          <AlertDescription>
            Les décisions de fin d&apos;année ne sont activables que lorsque
            l&apos;année scolaire est en statut
            <strong> &quot;Clôture en cours&quot;</strong>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Session de Clôture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Année Scolaire
              </label>
              <Select
                value={yearId}
                onValueChange={(val) => setYearId(val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={String(y.id)}>
                      {y.label} ({y.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Classe
              </label>
              <Select
                value={classId}
                onValueChange={(val) => setClassId(val ?? "")}
                disabled={!isClosing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Seuil de passage
              </label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={!isClosing}
              />
              <p className="text-[10px] text-muted-foreground italic">
                Les élèves avec une moyenne ≥ {threshold} seront marqués
                &quot;ADMIS&quot; par défaut.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Résultats & Décisions</CardTitle>
            {isClosing && students.length > 0 && (
              <PermissionGate permission={PERMISSIONS.YEAR_END_MANAGE}>
                <Button onClick={handleSaveAll} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Tout Enregistrer
                </Button>
              </PermissionGate>
            )}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p>Analyse des résultats annuels...</p>
              </div>
            ) : students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                    <TableHead className="text-center w-48">
                      Décision Finale
                    </TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const currentDecision = decisions[s.eleve_id]?.decision;
                    const isAdmitted = currentDecision === "ADMIS";

                    return (
                      <TableRow
                        key={s.eleve_id}
                        className={cn(!isAdmitted && "bg-destructive/5")}
                      >
                        <TableCell>
                          <div className="font-medium">
                            {s.nom} {s.prenom}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Matricule: {s.matricule}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className={cn(
                              "text-base font-bold",
                              (s.moyenne || 0) < 10
                                ? "text-destructive"
                                : "text-foreground",
                            )}
                          >
                            {s.moyenne?.toFixed(2) || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentDecision}
                            onValueChange={(val) =>
                              handleDecisionChange(s.eleve_id, val ?? "")
                            }
                            disabled={!isClosing}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 text-xs font-bold",
                                isAdmitted
                                  ? "text-green-600 border-green-200"
                                  : "text-destructive border-destructive/20",
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DECISIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Observations..."
                            className="h-8 text-xs"
                            value={decisions[s.eleve_id]?.comment || ""}
                            onChange={(e) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [s.eleve_id]: {
                                  ...prev[s.eleve_id],
                                  comment: e.target.value,
                                },
                              }))
                            }
                            disabled={!isClosing}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-20 text-center space-y-3 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto opacity-10" />
                <p>Sélectionnez une classe pour traiter les décisions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
