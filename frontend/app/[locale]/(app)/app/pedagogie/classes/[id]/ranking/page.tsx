"use client";

import { ArrowLeft, FileText, Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

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
import {
  getClassRanking,
  type SchoolYearItem,
  getSchoolYears,
} from "@/lib/api/pedagogy";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";

type RankingItem = {
  eleve_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  moyenne: number | null;
  nb_matieres: number;
  total_coeff: number;
  rang: number | null;
};

const PERIODS = [
  { value: "TRIMESTRE_1", label: "Trimestre 1" },
  { value: "TRIMESTRE_2", label: "Trimestre 2" },
  { value: "TRIMESTRE_3", label: "Trimestre 3" },
  { value: "SEMESTRE_1", label: "Semestre 1" },
  { value: "SEMESTRE_2", label: "Semestre 2" },
];

function getMention(moyenne: number | null) {
  if (moyenne === null) return { label: "N/A", color: "slate" as const };
  if (moyenne >= 18) return { label: "Excellent", color: "green" as const };
  if (moyenne >= 16) return { label: "Très Bien", color: "green" as const };
  if (moyenne >= 14) return { label: "Bien", color: "blue" as const };
  if (moyenne >= 12) return { label: "Assez Bien", color: "yellow" as const };
  if (moyenne >= 10) return { label: "Passable", color: "orange" as const };
  return { label: "Insuffisant", color: "red" as const };
}

// PDF Template
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  subtitle: { fontSize: 12, color: "#666" },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: {
    width: "15%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#f3f4f6",
    padding: 5,
    fontWeight: "bold",
  },
  tableCol: {
    width: "15%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableColName: {
    width: "40%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  footer: { marginTop: 30, textAlign: "right", fontSize: 10, color: "#999" },
});

const RankingPDF = ({
  data,
  className,
  periodLabel,
  schoolYear,
}: {
  data: RankingItem[];
  className: string;
  periodLabel: string;
  schoolYear: string;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bulletin de Classement</Text>
          <Text style={styles.subtitle}>
            {className} - {schoolYear}
          </Text>
          <Text style={styles.subtitle}>Période : {periodLabel}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableColHeader, { width: "10%" }]}>
            <Text>Rang</Text>
          </View>
          <View style={[styles.tableColHeader, { width: "20%" }]}>
            <Text>Matricule</Text>
          </View>
          <View style={styles.tableColName}>
            <Text>Nom & Prénoms</Text>
          </View>
          <View style={[styles.tableColHeader, { width: "15%" }]}>
            <Text>Moyenne</Text>
          </View>
          <View style={[styles.tableColHeader, { width: "15%" }]}>
            <Text>Mention</Text>
          </View>
        </View>
        {data.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={[styles.tableCol, { width: "10%" }]}>
              <Text>{item.rang || "-"}</Text>
            </View>
            <View style={[styles.tableCol, { width: "20%" }]}>
              <Text>{item.matricule}</Text>
            </View>
            <View style={styles.tableColName}>
              <Text>
                {item.nom} {item.prenom}
              </Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text>{item.moyenne?.toFixed(2) || "-"}</Text>
            </View>
            <View style={[styles.tableCol, { width: "15%" }]}>
              <Text>{getMention(item.moyenne).label}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Document généré le {new Date().toLocaleDateString()} - Eduguinée 3.0
      </Text>
    </Page>
  </Document>
);

export default function ClassRankingPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";
  const params = useParams();
  const classId = params.id as string;
  const locale = (params?.locale as string) ?? "fr";

  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [yearId, setYearId] = useState("");
  const [period, setPeriod] = useState("TRIMESTRE_1");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getSchoolYears(token).then((res) => {
      setYears(res.results);
      if (res.results.length > 0) {
        const current = res.results.find((y) => y.is_current) || res.results[0];
        setYearId(String(current.id));
      }
    });
  }, [token]);

  useEffect(() => {
    if (!token || !yearId || !classId) return;

    getClassRanking(token, classId, yearId, period)
      .then((data) => setRankings(data as RankingItem[]))
      .catch(() => toast.error("Erreur chargement classement."))
      .finally(() => setLoading(false));
  }, [token, classId, yearId, period]);

  const selectedYearLabel =
    years.find((y) => String(y.id) === yearId)?.label || "";
  const selectedPeriodLabel =
    PERIODS.find((p) => p.value === period)?.label || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/${locale}/app/pedagogie/classes`}
          className="flex items-center hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour aux classes
        </Link>
      </div>

      <PageHeader
        title="Classement de la classe"
        description="Consultez les moyennes et le rang des élèves pour la période sélectionnée."
        actions={
          <div className="flex gap-2">
            <PDFDownloadLink
              document={
                <RankingPDF
                  data={rankings}
                  className="Classe sélectionnée" // On pourrait charger le nom de la classe
                  periodLabel={selectedPeriodLabel}
                  schoolYear={selectedYearLabel}
                />
              }
              fileName={`classement_${classId}_${period}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button
                  variant="outline"
                  disabled={rankings.length === 0 || pdfLoading}
                >
                  {pdfLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Exporter PDF
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Année
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
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Période
              </label>
              <Select
                value={period}
                onValueChange={(val) => setPeriod(val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              Tableau d&apos;Excellence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                <p>Calcul du classement en cours...</p>
              </div>
            ) : rankings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rang</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead className="text-center">Matricule</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                    <TableHead className="text-center">Mention</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((item) => {
                    const mention = getMention(item.moyenne);
                    return (
                      <TableRow key={item.eleve_id}>
                        <TableCell>
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs",
                              item.rang === 1
                                ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400"
                                : item.rang === 2
                                  ? "bg-slate-100 text-slate-700 ring-2 ring-slate-300"
                                  : item.rang === 3
                                    ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300"
                                    : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.rang || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.nom} {item.prenom}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.nb_matieres} matières évaluées
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {item.matricule}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              "text-base font-bold",
                              (item.moyenne || 0) < 10
                                ? "text-destructive"
                                : "text-foreground",
                            )}
                          >
                            {item.moyenne?.toFixed(2) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge
                            variant={
                              mention.color === "green"
                                ? "success"
                                : mention.color === "red"
                                  ? "danger"
                                  : mention.color === "yellow" ||
                                      mention.color === "orange"
                                    ? "warning"
                                    : "neutral"
                            }
                            status={mention.label}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-20 text-center space-y-3 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto opacity-10" />
                <p>Aucune note validée pour cette période.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
