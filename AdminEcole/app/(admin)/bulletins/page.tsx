"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import {
  FileText,
  Download,
  Search,
  Printer,
  Eye,
  Send,
  Calendar,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  Building,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  FileCheck,
  FileX,
  MailOpen
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Types
interface Student {
  id: string
  matricule: string
  nom: string
  prenom: string
  classe: string
  genre: "M" | "F"
  dateNaiss: string
  lieuNaiss: string
}

interface Bulletin {
  id: string
  eleveId: string
  eleve: Student
  trimestre: string
  anneeScolaire: string
  moyenneGenerale: number
  rang: number
  effectif: number
  mention: string
  decision: string
  matieres: MatiereNote[]
  appreciation: string
  dateGeneration: string
  statut: "brouillon" | "valide" | "publie" | "envoye"
}

interface MatiereNote {
  nom: string
  coef: number
  noteCC1: number
  noteCC2: number
  noteDS: number
  moyenne: number
  moyenneCoef: number
  appreciation: string
}

// Mock data - Students
const students: Student[] = [
  { id: "1", matricule: "EDU2024001", nom: "Bah", prenom: "Mariama", classe: "Terminale S1", genre: "F", dateNaiss: "15/03/2006", lieuNaiss: "Conakry" },
  { id: "2", matricule: "EDU2024002", nom: "Barry", prenom: "Mamadou", classe: "Terminale S1", genre: "M", dateNaiss: "22/07/2005", lieuNaiss: "Kindia" },
  { id: "3", matricule: "EDU2024003", nom: "Camara", prenom: "Fatoumata", classe: "Terminale S1", genre: "F", dateNaiss: "10/11/2008", lieuNaiss: "Labé" },
  { id: "4", matricule: "EDU2024004", nom: "Diallo", prenom: "Ousmane", classe: "3eme A", genre: "M", dateNaiss: "05/01/2012", lieuNaiss: "Conakry" },
  { id: "5", matricule: "EDU2024005", nom: "Balde", prenom: "Aissatou", classe: "1ere L2", genre: "F", dateNaiss: "18/09/2007", lieuNaiss: "Kankan" },
]

// Mock data - Bulletins
const bulletins: Bulletin[] = [
  {
    id: "1",
    eleveId: "1",
    eleve: students[0],
    trimestre: "Trimestre 1",
    anneeScolaire: "2024-2025",
    moyenneGenerale: 16.5,
    rang: 1,
    effectif: 45,
    mention: "Très Bien",
    decision: "Admis",
    matieres: [
      { nom: "Mathématiques", coef: 4, noteCC1: 16, noteCC2: 17, noteDS: 18, moyenne: 17, moyenneCoef: 68, appreciation: "Excellente performance" },
      { nom: "Physique-Chimie", coef: 4, noteCC1: 15, noteCC2: 16, noteDS: 17, moyenne: 16, moyenneCoef: 64, appreciation: "Très bien" },
      { nom: "SVT", coef: 3, noteCC1: 16, noteCC2: 15, noteDS: 16, moyenne: 15.67, moyenneCoef: 47, appreciation: "Bien" },
      { nom: "Français", coef: 3, noteCC1: 15, noteCC2: 14, noteDS: 16, moyenne: 15, moyenneCoef: 45, appreciation: "Bonne progression" },
      { nom: "Anglais", coef: 2, noteCC1: 14, noteCC2: 15, noteDS: 14, moyenne: 14.33, moyenneCoef: 28.67, appreciation: "Assidu" },
      { nom: "Histoire-Géo", coef: 2, noteCC1: 16, noteCC2: 15, noteDS: 17, moyenne: 16, moyenneCoef: 32, appreciation: "Très impliqué" },
      { nom: "Philosophie", coef: 2, noteCC1: 15, noteCC2: 16, noteDS: 15, moyenne: 15.33, moyenneCoef: 30.67, appreciation: "Réfléchi" },
    ],
    appreciation: "Élève brillante, sérieuse et très impliquée. Continuez ainsi!",
    dateGeneration: "15/12/2024",
    statut: "publie"
  },
  {
    id: "2",
    eleveId: "2",
    eleve: students[1],
    trimestre: "Trimestre 1",
    anneeScolaire: "2024-2025",
    moyenneGenerale: 14.2,
    rang: 5,
    effectif: 45,
    mention: "Bien",
    decision: "Admis",
    matieres: [
      { nom: "Mathématiques", coef: 4, noteCC1: 14, noteCC2: 15, noteDS: 13, moyenne: 14, moyenneCoef: 56, appreciation: "Correct" },
      { nom: "Physique-Chimie", coef: 4, noteCC1: 13, noteCC2: 14, noteDS: 15, moyenne: 14, moyenneCoef: 56, appreciation: "Bien" },
      { nom: "SVT", coef: 3, noteCC1: 14, noteCC2: 13, noteDS: 14, moyenne: 13.67, moyenneCoef: 41, appreciation: "Stable" },
      { nom: "Français", coef: 3, noteCC1: 15, noteCC2: 14, noteDS: 16, moyenne: 15, moyenneCoef: 45, appreciation: "Bien" },
      { nom: "Anglais", coef: 2, noteCC1: 13, noteCC2: 14, noteDS: 13, moyenne: 13.33, moyenneCoef: 26.67, appreciation: "Effort à maintenir" },
      { nom: "Histoire-Géo", coef: 2, noteCC1: 14, noteCC2: 15, noteDS: 14, moyenne: 14.33, moyenneCoef: 28.67, appreciation: "Intéressé" },
      { nom: "Philosophie", coef: 2, noteCC1: 14, noteCC2: 14, noteDS: 15, moyenne: 14.33, moyenneCoef: 28.67, appreciation: "Participatif" },
    ],
    appreciation: "Élève sérieux mais peut mieux faire en mathématiques.",
    dateGeneration: "15/12/2024",
    statut: "valide"
  },
  {
    id: "3",
    eleveId: "3",
    eleve: students[2],
    trimestre: "Trimestre 1",
    anneeScolaire: "2024-2025",
    moyenneGenerale: 11.8,
    rang: 12,
    effectif: 45,
    mention: "Assez Bien",
    decision: "Admis",
    matieres: [
      { nom: "Mathématiques", coef: 4, noteCC1: 10, noteCC2: 11, noteDS: 12, moyenne: 11, moyenneCoef: 44, appreciation: "Effort nécessaire" },
      { nom: "Physique-Chimie", coef: 4, noteCC1: 11, noteCC2: 12, noteDS: 10, moyenne: 11, moyenneCoef: 44, appreciation: "À revoir" },
      { nom: "SVT", coef: 3, noteCC1: 12, noteCC2: 13, noteDS: 12, moyenne: 12.33, moyenneCoef: 37, appreciation: "Correct" },
      { nom: "Français", coef: 3, noteCC1: 13, noteCC2: 12, noteDS: 14, moyenne: 13, moyenneCoef: 39, appreciation: "Bien" },
      { nom: "Anglais", coef: 2, noteCC1: 11, noteCC2: 12, noteDS: 11, moyenne: 11.33, moyenneCoef: 22.67, appreciation: "Moyen" },
      { nom: "Histoire-Géo", coef: 2, noteCC1: 12, noteCC2: 11, noteDS: 13, moyenne: 12, moyenneCoef: 24, appreciation: "Acceptable" },
      { nom: "Philosophie", coef: 2, noteCC1: 12, noteCC2: 13, noteDS: 12, moyenne: 12.33, moyenneCoef: 24.67, appreciation: "Correct" },
    ],
    appreciation: "Élève correcte, doit s'investir davantage en sciences.",
    dateGeneration: "15/12/2024",
    statut: "brouillon"
  },
]

// Config
const mentionConfig: Record<string, { label: string; className: string }> = {
  "Très Bien": { label: "Très Bien", className: "bg-primary/10 text-primary border-primary/20" },
  "Bien": { label: "Bien", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  "Assez Bien": { label: "Assez Bien", className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  "Passable": { label: "Passable", className: "bg-secondary text-secondary-foreground" },
  "Insuffisant": { label: "Insuffisant", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

const decisionConfig: Record<string, { label: string; className: string }> = {
  "Admis": { label: "Admis", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  "Redouble": { label: "Redouble", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  "Conseil": { label: "Conseil", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
}

const statutConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  brouillon: { label: "Brouillon", icon: FileX, className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  valide: { label: "Validé", icon: CheckCircle, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  publie: { label: "Publié", icon: Eye, className: "bg-green-500/10 text-green-500 border-green-500/20" },
  envoye: { label: "Envoyé", icon: Send, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
}

function getScoreColor(score: number) {
  if (score >= 16) return "text-primary font-bold"
  if (score >= 14) return "text-chart-2 font-semibold"
  if (score >= 12) return "text-chart-3"
  if (score >= 10) return "text-foreground"
  return "text-destructive font-bold"
}

export default function BulletinsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [classeFilter, setClasseFilter] = useState("all")
  const [trimestreFilter, setTrimestreFilter] = useState("all")
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const filteredBulletins = bulletins.filter((b) => {
    const matchesSearch = 
      b.eleve.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.eleve.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.eleve.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClasse = classeFilter === "all" || b.eleve.classe === classeFilter
    const matchesTrimestre = trimestreFilter === "all" || b.trimestre === trimestreFilter
    return matchesSearch && matchesClasse && matchesTrimestre
  })

  const classes = [...new Set(students.map(s => s.classe))]
  
  const stats = {
    total: bulletins.length,
    publikes: bulletins.filter(b => b.statut === "publie").length,
    enAttente: bulletins.filter(b => b.statut === "brouillon").length,
    moyenneClasse: (bulletins.reduce((sum, b) => sum + b.moyenneGenerale, 0) / bulletins.length).toFixed(1),
  }

  const handleViewBulletin = (bulletin: Bulletin) => {
    setSelectedBulletin(bulletin)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulletins Scolaires</h1>
          <p className="text-muted-foreground">
            Générez et gérez les bulletins de notes des élèves
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Générer bulletins
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total bulletins</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Publiés</p>
                <p className="text-2xl font-bold text-foreground">{stats.publikes}</p>
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
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-foreground">{stats.enAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Award className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moyenne classe</p>
                <p className="text-2xl font-bold text-foreground">{stats.moyenneClasse}/20</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary"
              />
            </div>
            <Select value={classeFilter} onValueChange={setClasseFilter}>
              <SelectTrigger className="w-[180px] bg-secondary">
                <SelectValue placeholder="Classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={trimestreFilter} onValueChange={setTrimestreFilter}>
              <SelectTrigger className="w-[180px] bg-secondary">
                <SelectValue placeholder="Trimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les trimestres</SelectItem>
                <SelectItem value="Trimestre 1">Trimestre 1</SelectItem>
                <SelectItem value="Trimestre 2">Trimestre 2</SelectItem>
                <SelectItem value="Trimestre 3">Trimestre 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="liste" className="space-y-4">
        <TabsList>
          <TabsTrigger value="liste">Liste des bulletins</TabsTrigger>
          <TabsTrigger value="attestations">Attestations</TabsTrigger>
          <TabsTrigger value="certificats">Certificats</TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Trimestre</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                    <TableHead className="text-center">Rang</TableHead>
                    <TableHead>Mention</TableHead>
                    <TableHead>Décision</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBulletins.map((bulletin) => {
                    const statut = statutConfig[bulletin.statut]
                    const mention = mentionConfig[bulletin.mention]
                    const decision = decisionConfig[bulletin.decision]
                    return (
                      <TableRow key={bulletin.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{bulletin.eleve.prenom} {bulletin.eleve.nom}</p>
                            <p className="text-xs text-muted-foreground">{bulletin.eleve.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell>{bulletin.eleve.classe}</TableCell>
                        <TableCell>{bulletin.trimestre}</TableCell>
                        <TableCell className={`text-center ${getScoreColor(bulletin.moyenneGenerale)}`}>
                          {bulletin.moyenneGenerale}/20
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{bulletin.rang}</span>
                          <span className="text-muted-foreground"> / {bulletin.effectif}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={mention.className}>
                            {mention.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={decision.className}>
                            {decision.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statut.className}>
                            <statut.icon className="mr-1 h-3 w-3" />
                            {statut.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewBulletin(bulletin)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir bulletin
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Envoyer aux parents
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attestations" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Attestations de scolarité</CardTitle>
              <CardDescription>
                Générez des attestations de scolarité pour vos élèves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">Attestation simple</p>
                      <p className="text-sm text-muted-foreground">Pour inscription administrative</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Générer
                  </Button>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-8 w-8 text-chart-2" />
                    <div>
                      <p className="font-medium">Relevé de notes</p>
                      <p className="text-sm text-muted-foreground">Document officiel avec moyennes</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Générer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificats" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Certificats officiels</CardTitle>
              <CardDescription>
                Générez des certificats de fin d'année ou de transfert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucun certificat généré</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les certificats seront disponibles après la fin de l'année scolaire
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulletin Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedBulletin && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Bulletin de {selectedBulletin.eleve.prenom} {selectedBulletin.eleve.nom}
                </DialogTitle>
              </DialogHeader>
              
              {/* Bulletin Header */}
              <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Matricule:</span>{" "}
                    <span className="font-medium">{selectedBulletin.eleve.matricule}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe:</span>{" "}
                    <span className="font-medium">{selectedBulletin.eleve.classe}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date de naissance:</span>{" "}
                    <span className="font-medium">{selectedBulletin.eleve.dateNaiss} à {selectedBulletin.eleve.lieuNaiss}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Année scolaire:</span>{" "}
                    <span className="font-medium">{selectedBulletin.anneeScolaire}</span>
                  </div>
                </div>
              </div>

              {/* Notes Table */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Matière</TableHead>
                    <TableHead className="text-center">Coef</TableHead>
                    <TableHead className="text-center">CC1</TableHead>
                    <TableHead className="text-center">CC2</TableHead>
                    <TableHead className="text-center">DS</TableHead>
                    <TableHead className="text-center">Moy.</TableHead>
                    <TableHead>Moy.×Coef</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBulletin.matieres.map((matiere, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{matiere.nom}</TableCell>
                      <TableCell className="text-center">{matiere.coef}</TableCell>
                      <TableCell className="text-center">{matiere.noteCC1}</TableCell>
                      <TableCell className="text-center">{matiere.noteCC2}</TableCell>
                      <TableCell className="text-center">{matiere.noteDS}</TableCell>
                      <TableCell className={`text-center ${getScoreColor(matiere.moyenne)}`}>
                        {matiere.moyenne.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">{matiere.moyenneCoef.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total points:</span>
                      <span className="font-medium">
                        {selectedBulletin.matieres.reduce((sum, m) => sum + m.moyenneCoef, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total coefficients:</span>
                      <span className="font-medium">
                        {selectedBulletin.matieres.reduce((sum, m) => sum + m.coef, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Moyenne générale:</span>
                      <span className={getScoreColor(selectedBulletin.moyenneGenerale)}>
                        {selectedBulletin.moyenneGenerale}/20
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rang:</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {selectedBulletin.rang} / {selectedBulletin.effectif}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mention:</span>
                    <Badge variant="outline" className={mentionConfig[selectedBulletin.mention].className}>
                      {selectedBulletin.mention}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Décision:</span>
                    <Badge variant="outline" className={decisionConfig[selectedBulletin.decision].className}>
                      {selectedBulletin.decision}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Appreciation */}
              <div className="rounded-lg border border-border p-4 mt-4">
                <h4 className="font-medium mb-2">Appréciation du conseil de classe:</h4>
                <p className="text-sm italic">{selectedBulletin.appreciation}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Fermer
                </Button>
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
