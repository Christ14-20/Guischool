"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Download,
  FileText,
  TrendingUp,
  Users,
  Award,
  BarChart3
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { GradesEntryDialog } from "@/components/results/grades-entry-dialog"

interface StudentResult {
  id: string
  rank: number
  name: string
  average: number
  mention: string
  subjects: {
    maths: number
    francais: number
    physique: number
    svt: number
    anglais: number
    histoire: number
  }
}

const results: StudentResult[] = [
  {
    id: "1",
    rank: 1,
    name: "Mariama Bah",
    average: 16.5,
    mention: "Tres Bien",
    subjects: { maths: 18, francais: 15, physique: 17, svt: 16, anglais: 14, histoire: 15 }
  },
  {
    id: "2",
    rank: 2,
    name: "Alpha Sow",
    average: 15.2,
    mention: "Bien",
    subjects: { maths: 16, francais: 14, physique: 15, svt: 15, anglais: 16, histoire: 14 }
  },
  {
    id: "3",
    rank: 3,
    name: "Ibrahima Conde",
    average: 14.8,
    mention: "Bien",
    subjects: { maths: 14, francais: 16, physique: 14, svt: 15, anglais: 15, histoire: 13 }
  },
  {
    id: "4",
    rank: 4,
    name: "Fatoumata Camara",
    average: 13.5,
    mention: "Assez Bien",
    subjects: { maths: 12, francais: 15, physique: 13, svt: 14, anglais: 13, histoire: 14 }
  },
  {
    id: "5",
    rank: 5,
    name: "Kadiatou Sylla",
    average: 12.8,
    mention: "Assez Bien",
    subjects: { maths: 11, francais: 14, physique: 12, svt: 13, anglais: 14, histoire: 12 }
  },
  {
    id: "6",
    rank: 6,
    name: "Mamadou Barry",
    average: 11.2,
    mention: "Passable",
    subjects: { maths: 10, francais: 12, physique: 11, svt: 11, anglais: 12, histoire: 11 }
  },
  {
    id: "7",
    rank: 7,
    name: "Ousmane Diallo",
    average: 9.5,
    mention: "Insuffisant",
    subjects: { maths: 8, francais: 10, physique: 9, svt: 10, anglais: 11, histoire: 9 }
  },
]

const mentionConfig: Record<string, { className: string }> = {
  "Tres Bien": { className: "bg-primary/10 text-primary border-primary/20" },
  "Bien": { className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  "Assez Bien": { className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  "Passable": { className: "bg-secondary text-secondary-foreground" },
  "Insuffisant": { className: "bg-destructive/10 text-destructive border-destructive/20" },
}

function getScoreColor(score: number) {
  if (score >= 16) return "text-primary"
  if (score >= 14) return "text-chart-2"
  if (score >= 12) return "text-chart-3"
  if (score >= 10) return "text-foreground"
  return "text-destructive"
}

export default function ResultatsPage() {
  const [selectedClass, setSelectedClass] = useState("terminale-s1")
  const [selectedTrimester, setSelectedTrimester] = useState("t1")
  const [dialogOpen, setDialogOpen] = useState(false)

  const classAverage = (results.reduce((sum, r) => sum + r.average, 0) / results.length).toFixed(1)
  const successRate = Math.round((results.filter(r => r.average >= 10).length / results.length) * 100)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resultats academiques</h1>
          <p className="text-sm text-muted-foreground">
            Suivi des notes et performances des eleves
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Bulletins
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <FileText className="h-4 w-4" />
            Saisir notes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Moyenne de classe"
          value={`${classAverage}/20`}
          subtitle="Terminale S1"
          icon={BarChart3}
          variant="info"
        />
        <StatCard
          title="Taux de reussite"
          value={`${successRate}%`}
          subtitle="Moyenne >= 10"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Effectif"
          value={results.length}
          subtitle="Eleves evalues"
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Mentions TB"
          value={results.filter(r => r.mention === "Tres Bien").length}
          subtitle="Moyenne >= 16"
          icon={Award}
          variant="success"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6eme-a">6eme A</SelectItem>
            <SelectItem value="6eme-b">6eme B</SelectItem>
            <SelectItem value="3eme-a">3eme A</SelectItem>
            <SelectItem value="2nde-c">2nde C</SelectItem>
            <SelectItem value="terminale-s1">Terminale S1</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="t1">1er Trimestre</SelectItem>
            <SelectItem value="t2">2eme Trimestre</SelectItem>
            <SelectItem value="t3">3eme Trimestre</SelectItem>
            <SelectItem value="annuel">Annuel</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          Annee scolaire: 2024-2025
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking">Classement</TabsTrigger>
          <TabsTrigger value="subjects">Par matiere</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px]">Rang</TableHead>
                  <TableHead>Eleve</TableHead>
                  <TableHead>Maths</TableHead>
                  <TableHead>Francais</TableHead>
                  <TableHead>Physique</TableHead>
                  <TableHead>SVT</TableHead>
                  <TableHead>Anglais</TableHead>
                  <TableHead>Histoire</TableHead>
                  <TableHead>Moyenne</TableHead>
                  <TableHead>Mention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        student.rank === 1 ? "bg-primary/10 text-primary" :
                        student.rank === 2 ? "bg-chart-3/10 text-chart-3" :
                        student.rank === 3 ? "bg-chart-4/10 text-chart-4" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {student.rank}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className={getScoreColor(student.subjects.maths)}>
                      {student.subjects.maths}
                    </TableCell>
                    <TableCell className={getScoreColor(student.subjects.francais)}>
                      {student.subjects.francais}
                    </TableCell>
                    <TableCell className={getScoreColor(student.subjects.physique)}>
                      {student.subjects.physique}
                    </TableCell>
                    <TableCell className={getScoreColor(student.subjects.svt)}>
                      {student.subjects.svt}
                    </TableCell>
                    <TableCell className={getScoreColor(student.subjects.anglais)}>
                      {student.subjects.anglais}
                    </TableCell>
                    <TableCell className={getScoreColor(student.subjects.histoire)}>
                      {student.subjects.histoire}
                    </TableCell>
                    <TableCell>
                      <span className={`text-lg font-bold ${getScoreColor(student.average)}`}>
                        {student.average}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={mentionConfig[student.mention]?.className}>
                        {student.mention}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="subjects">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Mathematiques", avg: 12.7, best: 18, worst: 8 },
              { name: "Francais", avg: 13.7, best: 16, worst: 10 },
              { name: "Physique-Chimie", avg: 13.0, best: 17, worst: 9 },
              { name: "SVT", avg: 13.4, best: 16, worst: 10 },
              { name: "Anglais", avg: 13.6, best: 16, worst: 11 },
              { name: "Histoire-Geo", avg: 12.6, best: 15, worst: 9 },
            ].map((subject) => (
              <div key={subject.name} className="rounded-xl border border-border bg-card p-4">
                <h4 className="font-semibold">{subject.name}</h4>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Moyenne classe</span>
                    <span className={`font-bold ${getScoreColor(subject.avg)}`}>
                      {subject.avg}/20
                    </span>
                  </div>
                  <Progress value={(subject.avg / 20) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {subject.worst}</span>
                    <span>Max: {subject.best}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Statistiques detaillees</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Graphiques et analyses des performances par classe et matiere.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <GradesEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
