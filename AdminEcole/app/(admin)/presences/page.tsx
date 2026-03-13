"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ClipboardCheck,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Users,
  TrendingDown,
  Send
} from "lucide-react"

// Mock data
const classes = [
  { id: "1", name: "6eme A", effectif: 45 },
  { id: "2", name: "6eme B", effectif: 42 },
  { id: "3", name: "5eme A", effectif: 48 },
  { id: "4", name: "4eme A", effectif: 40 },
  { id: "5", name: "3eme A", effectif: 38 },
]

const students = [
  { id: "1", nom: "Bah", prenom: "Mamadou", matricule: "2024-001", status: "P" },
  { id: "2", nom: "Camara", prenom: "Fatoumata", matricule: "2024-002", status: "P" },
  { id: "3", nom: "Diallo", prenom: "Ibrahima", matricule: "2024-003", status: "A" },
  { id: "4", nom: "Barry", prenom: "Aissatou", matricule: "2024-004", status: "R" },
  { id: "5", nom: "Soumah", prenom: "Mohamed", matricule: "2024-005", status: "P" },
  { id: "6", nom: "Conde", prenom: "Mariama", matricule: "2024-006", status: "P" },
  { id: "7", nom: "Sylla", prenom: "Oumar", matricule: "2024-007", status: "AJ" },
  { id: "8", nom: "Toure", prenom: "Kadiatou", matricule: "2024-008", status: "P" },
]

const absenceHistory = [
  { id: "1", eleve: "Ibrahima Diallo", classe: "6eme A", date: "2024-01-15", type: "A", motif: "-", justifie: false },
  { id: "2", eleve: "Aissatou Barry", classe: "6eme A", date: "2024-01-15", type: "R", motif: "15 min", justifie: true },
  { id: "3", eleve: "Oumar Sylla", classe: "6eme A", date: "2024-01-15", type: "AJ", motif: "Maladie", justifie: true },
  { id: "4", eleve: "Mamadou Bah", classe: "5eme A", date: "2024-01-14", type: "A", motif: "-", justifie: false },
  { id: "5", eleve: "Fatoumata Camara", classe: "4eme A", date: "2024-01-14", type: "R", motif: "10 min", justifie: false },
]

const studentsAtRisk = [
  { id: "1", nom: "Diallo Ibrahima", classe: "6eme A", absences: 8, retards: 3, derniere: "15/01/2024" },
  { id: "2", nom: "Keita Moussa", classe: "5eme B", absences: 6, retards: 5, derniere: "14/01/2024" },
  { id: "3", nom: "Soumah Aminata", classe: "4eme A", absences: 5, retards: 2, derniere: "13/01/2024" },
]

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  P: { label: "Present", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  A: { label: "Absent", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  AJ: { label: "Absent Justifie", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: FileText },
  R: { label: "Retard", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
}

export default function PresencesPage() {
  const [selectedClass, setSelectedClass] = useState("1")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>(
    Object.fromEntries(students.map(s => [s.id, s.status]))
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [justificationOpen, setJustificationOpen] = useState(false)

  const handleStatusChange = (studentId: string, status: string) => {
    setStudentStatuses(prev => ({ ...prev, [studentId]: status }))
  }

  const stats = {
    presents: Object.values(studentStatuses).filter(s => s === "P").length,
    absents: Object.values(studentStatuses).filter(s => s === "A" || s === "AJ").length,
    retards: Object.values(studentStatuses).filter(s => s === "R").length,
  }

  const filteredStudents = students.filter(s => 
    s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.prenom.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Presences</h1>
          <p className="text-muted-foreground">Suivi quotidien des presences, absences et retards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Rapport
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Presents</p>
                <p className="text-2xl font-bold text-foreground">{stats.presents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Absents</p>
                <p className="text-2xl font-bold text-foreground">{stats.absents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retards</p>
                <p className="text-2xl font-bold text-foreground">{stats.retards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eleves a risque</p>
                <p className="text-2xl font-bold text-foreground">{studentsAtRisk.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appel" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="appel">Faire l&apos;appel</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="risque">Eleves a risque</TabsTrigger>
          <TabsTrigger value="justifications">Justifications</TabsTrigger>
        </TabsList>

        {/* Tab: Faire l'appel */}
        <TabsContent value="appel" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Appel du jour
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-[140px] bg-secondary">
                      <SelectValue placeholder="Classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[160px] bg-secondary"
                  />
                  <div className="relative flex-1 md:w-[200px] md:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-secondary"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="w-[100px]">Matricule</TableHead>
                      <TableHead>Nom & Prenom</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Retard</TableHead>
                      <TableHead className="text-center">Justifie</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const status = studentStatuses[student.id]
                      const config = statusConfig[status]
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono text-sm">{student.matricule}</TableCell>
                          <TableCell className="font-medium">
                            {student.nom} {student.prenom}
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={status === "P"}
                              onChange={() => handleStatusChange(student.id, "P")}
                              className="h-4 w-4 accent-green-500"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={status === "A"}
                              onChange={() => handleStatusChange(student.id, "A")}
                              className="h-4 w-4 accent-red-500"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={status === "R"}
                              onChange={() => handleStatusChange(student.id, "R")}
                              className="h-4 w-4 accent-yellow-500"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              checked={status === "AJ"}
                              onChange={() => handleStatusChange(student.id, "AJ")}
                              className="h-4 w-4 accent-orange-500"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.color}>
                              <config.icon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredStudents.length} eleves dans cette classe
                </p>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Notifier les parents
                  </Button>
                  <Button>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Valider l&apos;appel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historique */}
        <TabsContent value="historique" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Historique des absences et retards</CardTitle>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] bg-secondary">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="A">Absents</SelectItem>
                      <SelectItem value="R">Retards</SelectItem>
                      <SelectItem value="AJ">Justifies</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] bg-secondary">
                      <SelectValue placeholder="Classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Eleve</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Justifie</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absenceHistory.map((item) => {
                      const config = statusConfig[item.type]
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell className="font-medium">{item.eleve}</TableCell>
                          <TableCell>{item.classe}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.motif}</TableCell>
                          <TableCell>
                            {item.justifie ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Oui
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                Non
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Voir</Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Eleves a risque */}
        <TabsContent value="risque" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Eleves a risque (3+ absences consecutives)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead>Eleve</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead className="text-center">Absences</TableHead>
                      <TableHead className="text-center">Retards</TableHead>
                      <TableHead>Derniere absence</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsAtRisk.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.nom}</TableCell>
                        <TableCell>{student.classe}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            {student.absences}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {student.retards}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.derniere}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              <Send className="mr-1 h-3 w-3" />
                              Contacter
                            </Button>
                            <Button variant="ghost" size="sm">Voir fiche</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Justifications */}
        <TabsContent value="justifications" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Demandes de justification</CardTitle>
                <Dialog open={justificationOpen} onOpenChange={setJustificationOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <FileText className="mr-2 h-4 w-4" />
                      Nouvelle justification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une justification</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Eleve</label>
                        <Select>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Selectionner un eleve" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nom} {s.prenom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date de l&apos;absence</label>
                        <Input type="date" className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Motif</label>
                        <Select>
                          <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder="Selectionner un motif" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="maladie">Maladie</SelectItem>
                            <SelectItem value="famille">Evenement familial</SelectItem>
                            <SelectItem value="rdv">Rendez-vous officiel</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Commentaire</label>
                        <Textarea placeholder="Details supplementaires..." className="bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Document justificatif</label>
                        <Input type="file" className="bg-secondary" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setJustificationOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={() => setJustificationOpen(false)}>
                        Soumettre
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { eleve: "Oumar Sylla", date: "15/01/2024", motif: "Maladie", status: "valide", doc: true },
                  { eleve: "Mamadou Bah", date: "14/01/2024", motif: "Evenement familial", status: "en_attente", doc: true },
                  { eleve: "Fatoumata Camara", date: "13/01/2024", motif: "Rendez-vous medical", status: "refuse", doc: false },
                ].map((j, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-4 bg-secondary/30">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{j.eleve}</p>
                        <p className="text-sm text-muted-foreground">{j.date} - {j.motif}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {j.doc && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <FileText className="mr-1 h-3 w-3" />
                          Document
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={
                          j.status === "valide" 
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : j.status === "refuse"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        }
                      >
                        {j.status === "valide" ? "Valide" : j.status === "refuse" ? "Refuse" : "En attente"}
                      </Badge>
                      {j.status === "en_attente" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-500 hover:text-green-600">
                            Valider
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600">
                            Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
