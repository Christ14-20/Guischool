"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  UserCog,
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Users,
  Calendar,
  Clock,
  Eye,
  Pencil,
  Trash2,
  GraduationCap
} from "lucide-react"

// Mock data
const teachers = [
  {
    id: "1",
    nom: "Diallo",
    prenom: "Mamadou",
    email: "m.diallo@eduguinee.com",
    telephone: "+224 620 12 34 56",
    matiere: "Mathematiques",
    classes: ["6eme A", "6eme B", "5eme A"],
    heures: 18,
    status: "actif",
    dateEmbauche: "2020-09-01",
    grade: "Professeur certifie",
  },
  {
    id: "2",
    nom: "Camara",
    prenom: "Fatoumata",
    email: "f.camara@eduguinee.com",
    telephone: "+224 621 23 45 67",
    matiere: "Francais",
    classes: ["6eme A", "5eme A", "4eme A"],
    heures: 20,
    status: "actif",
    dateEmbauche: "2019-09-01",
    grade: "Professeur agrege",
  },
  {
    id: "3",
    nom: "Barry",
    prenom: "Ibrahima",
    email: "i.barry@eduguinee.com",
    telephone: "+224 622 34 56 78",
    matiere: "Physique-Chimie",
    classes: ["4eme A", "3eme A", "3eme B"],
    heures: 16,
    status: "actif",
    dateEmbauche: "2021-09-01",
    grade: "Professeur certifie",
  },
  {
    id: "4",
    nom: "Soumah",
    prenom: "Mariama",
    email: "m.soumah@eduguinee.com",
    telephone: "+224 623 45 67 89",
    matiere: "Histoire-Geo",
    classes: ["6eme A", "6eme B", "5eme A", "5eme B"],
    heures: 22,
    status: "actif",
    dateEmbauche: "2018-09-01",
    grade: "Professeur agrege",
  },
  {
    id: "5",
    nom: "Conde",
    prenom: "Oumar",
    email: "o.conde@eduguinee.com",
    telephone: "+224 624 56 78 90",
    matiere: "Anglais",
    classes: ["5eme A", "4eme A"],
    heures: 12,
    status: "conge",
    dateEmbauche: "2022-09-01",
    grade: "Professeur vacataire",
  },
]

const matieres = [
  "Mathematiques",
  "Francais",
  "Anglais",
  "Histoire-Geo",
  "Physique-Chimie",
  "SVT",
  "EPS",
  "Education Civique",
]

const statusConfig: Record<string, { label: string; color: string }> = {
  actif: { label: "Actif", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  conge: { label: "En conge", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  inactif: { label: "Inactif", color: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export default function EnseignantsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMatiere, setFilterMatiere] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.matiere.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMatiere = filterMatiere === "all" || t.matiere === filterMatiere
    const matchesStatus = filterStatus === "all" || t.status === filterStatus
    return matchesSearch && matchesMatiere && matchesStatus
  })

  const stats = {
    total: teachers.length,
    actifs: teachers.filter((t) => t.status === "actif").length,
    heuresTotal: teachers.reduce((acc, t) => acc + t.heures, 0),
    matieres: [...new Set(teachers.map((t) => t.matiere))].length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Enseignants</h1>
          <p className="text-muted-foreground">Gerez le personnel enseignant et leurs affectations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel enseignant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un enseignant</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input placeholder="Nom de famille" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prenom</label>
                  <Input placeholder="Prenom" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="email@exemple.com" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telephone</label>
                  <Input placeholder="+224 6XX XX XX XX" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Matiere principale</label>
                  <Select>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {matieres.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade</label>
                  <Select>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacataire">Professeur vacataire</SelectItem>
                      <SelectItem value="certifie">Professeur certifie</SelectItem>
                      <SelectItem value="agrege">Professeur agrege</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date d&apos;embauche</label>
                  <Input type="date" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input placeholder="Adresse" className="bg-secondary" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddTeacherOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => setAddTeacherOpen(false)}>
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total enseignants</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-foreground">{stats.actifs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Heures/semaine</p>
                <p className="text-2xl font-bold text-foreground">{stats.heuresTotal}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                <BookOpen className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matieres</p>
                <p className="text-2xl font-bold text-foreground">{stats.matieres}</p>
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
                placeholder="Rechercher par nom, prenom ou matiere..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary"
              />
            </div>
            <Select value={filterMatiere} onValueChange={setFilterMatiere}>
              <SelectTrigger className="w-[180px] bg-secondary">
                <SelectValue placeholder="Matiere" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matieres</SelectItem>
                {matieres.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] bg-secondary">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="actif">Actifs</SelectItem>
                <SelectItem value="conge">En conge</SelectItem>
                <SelectItem value="inactif">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead>Enseignant</TableHead>
                  <TableHead>Matiere</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead className="text-center">Heures</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => {
                  const status = statusConfig[teacher.status]
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {teacher.prenom[0]}{teacher.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{teacher.prenom} {teacher.nom}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {teacher.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {teacher.matiere}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.classes.slice(0, 2).map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                          {teacher.classes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{teacher.classes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{teacher.heures}h</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {teacher.grade}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir profil
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              Emploi du temps
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Cards View (alternative) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.slice(0, 3).map((teacher) => {
          const status = statusConfig[teacher.status]
          return (
            <Card key={teacher.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {teacher.prenom[0]}{teacher.nom[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{teacher.prenom} {teacher.nom}</h3>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-primary">{teacher.matiere}</p>
                    <p className="text-xs text-muted-foreground">{teacher.grade}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {teacher.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {teacher.telephone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {teacher.classes.length} classes - {teacher.heures}h/semaine
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Voir profil
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Emploi du temps
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
