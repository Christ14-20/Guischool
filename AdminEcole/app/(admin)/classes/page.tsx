"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Search,
  Users,
  BookOpen,
  GraduationCap,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const classes = [
  {
    id: "1",
    nom: "6eme A",
    niveau: "6eme",
    effectif: 45,
    capacite: 50,
    professeurPrincipal: "M. Camara Ibrahim",
    salle: "Salle 101",
    matieres: 8,
    moyenneClasse: 12.5,
  },
  {
    id: "2",
    nom: "6eme B",
    niveau: "6eme",
    effectif: 42,
    capacite: 50,
    professeurPrincipal: "Mme Bah Fatoumata",
    salle: "Salle 102",
    matieres: 8,
    moyenneClasse: 13.2,
  },
  {
    id: "3",
    nom: "5eme A",
    niveau: "5eme",
    effectif: 48,
    capacite: 50,
    professeurPrincipal: "M. Diallo Mamadou",
    salle: "Salle 201",
    matieres: 9,
    moyenneClasse: 11.8,
  },
  {
    id: "4",
    nom: "5eme B",
    niveau: "5eme",
    effectif: 44,
    capacite: 50,
    professeurPrincipal: "Mme Sylla Mariama",
    salle: "Salle 202",
    matieres: 9,
    moyenneClasse: 12.1,
  },
  {
    id: "5",
    nom: "4eme A",
    niveau: "4eme",
    effectif: 40,
    capacite: 45,
    professeurPrincipal: "M. Barry Ousmane",
    salle: "Salle 301",
    matieres: 10,
    moyenneClasse: 13.5,
  },
  {
    id: "6",
    nom: "3eme A",
    niveau: "3eme",
    effectif: 38,
    capacite: 45,
    professeurPrincipal: "M. Conde Alpha",
    salle: "Salle 401",
    matieres: 10,
    moyenneClasse: 14.2,
  },
]

const enseignants = [
  { id: "1", nom: "M. Camara Ibrahim", matiere: "Mathematiques", classes: ["6eme A", "5eme A", "4eme A"], heures: 18 },
  { id: "2", nom: "Mme Bah Fatoumata", matiere: "Francais", classes: ["6eme A", "6eme B", "5eme A"], heures: 20 },
  { id: "3", nom: "M. Diallo Mamadou", matiere: "Physique-Chimie", classes: ["5eme A", "4eme A", "3eme A"], heures: 16 },
  { id: "4", nom: "Mme Sylla Mariama", matiere: "SVT", classes: ["6eme A", "6eme B", "5eme B"], heures: 18 },
  { id: "5", nom: "M. Barry Ousmane", matiere: "Histoire-Geo", classes: ["4eme A", "3eme A"], heures: 14 },
  { id: "6", nom: "M. Conde Alpha", matiere: "Anglais", classes: ["5eme A", "5eme B", "4eme A", "3eme A"], heures: 20 },
]

const niveaux = ["Tous", "6eme", "5eme", "4eme", "3eme", "2nde", "1ere", "Terminale"]

export default function ClassesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [niveauFilter, setNiveauFilter] = useState("Tous")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredClasses = classes.filter((classe) => {
    const matchesSearch = classe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classe.professeurPrincipal.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesNiveau = niveauFilter === "Tous" || classe.niveau === niveauFilter
    return matchesSearch && matchesNiveau
  })

  const totalEleves = classes.reduce((sum, c) => sum + c.effectif, 0)
  const totalCapacite = classes.reduce((sum, c) => sum + c.capacite, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Classes</h1>
          <p className="text-muted-foreground">Gerez les classes, enseignants et emplois du temps</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle classe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Creer une nouvelle classe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de la classe</Label>
                <Input placeholder="Ex: 6eme C" />
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez le niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {niveaux.slice(1).map((niveau) => (
                      <SelectItem key={niveau} value={niveau}>{niveau}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacite maximale</Label>
                <Input type="number" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label>Salle attribuee</Label>
                <Input placeholder="Ex: Salle 103" />
              </div>
              <div className="space-y-2">
                <Label>Professeur principal</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    {enseignants.map((ens) => (
                      <SelectItem key={ens.id} value={ens.id}>{ens.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setIsAddDialogOpen(false)}>
                Creer la classe
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                <Users className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total eleves</p>
                <p className="text-2xl font-bold">{totalEleves}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                <BookOpen className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enseignants</p>
                <p className="text-2xl font-bold">{enseignants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <Users className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux remplissage</p>
                <p className="text-2xl font-bold">{Math.round((totalEleves / totalCapacite) * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="enseignants">Enseignants</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une classe..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={niveauFilter} onValueChange={setNiveauFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niveaux.map((niveau) => (
                      <SelectItem key={niveau} value={niveau}>{niveau}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Classes Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((classe) => (
              <Card key={classe.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{classe.nom}</CardTitle>
                      <p className="text-sm text-muted-foreground">{classe.salle}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ajouter eleve
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Effectif</span>
                    <span className="font-medium">{classe.effectif} / {classe.capacite}</span>
                  </div>
                  <Progress value={(classe.effectif / classe.capacite) * 100} className="h-2" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prof. principal</span>
                      <span className="font-medium">{classe.professeurPrincipal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Matieres</span>
                      <span className="font-medium">{classe.matieres}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moyenne classe</span>
                      <Badge variant={classe.moyenneClasse >= 12 ? "default" : "secondary"}>
                        {classe.moyenneClasse}/20
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enseignants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liste des enseignants</CardTitle>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enseignant</TableHead>
                    <TableHead>Matiere</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Heures/sem</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enseignants.map((ens) => (
                    <TableRow key={ens.id}>
                      <TableCell className="font-medium">{ens.nom}</TableCell>
                      <TableCell>{ens.matiere}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ens.classes.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{ens.heures}h</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir profil
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
