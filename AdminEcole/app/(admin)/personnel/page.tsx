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
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  UserPlus,
  Search,
  Download,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Wallet,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Banknote,
  Shield,
  Briefcase,
  GraduationCap,
  UserCog,
  ClipboardList,
  Calculator
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Types
interface Employee {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  fonction: string
  service: string
  dateEmbauche: string
  typeContrat: "permanent" | "vacataire" | "stagiaire"
  status: "actif" | "conge" | "inactif"
  salaireBase: number
  grade: string
  banque?: string
  rib?: string
}

interface Salary {
  id: string
  employeeId: string
  employee: Employee
  mois: string
  annee: number
  salaireBase: number
  primeAnciennete: number
  primeResponsabilite: number
  primeTransport: number
  totalBrut: number
  cnss: number
  avance: number
  autresRetenues: number
  totalRetenues: number
  netAPayer: number
  statut: "brouillon" | "valide" | "paye"
  datePaiement?: string
  modePaiement?: string
}

// Mock data - Employees
const employees: Employee[] = [
  {
    id: "1",
    nom: "Diallo",
    prenom: "Mamadou",
    email: "m.diallo@lycee-ayd.com",
    telephone: "+224 620 12 34 56",
    fonction: "Professeur",
    service: "Enseignement",
    dateEmbauche: "2018-09-01",
    typeContrat: "permanent",
    status: "actif",
    salaireBase: 3500000,
    grade: "Professeur certifié",
    banque: "UGB",
    rib: "GN123456789012345678"
  },
  {
    id: "2",
    nom: "Camara",
    prenom: "Fatoumata",
    email: "f.camara@lycee-ayd.com",
    telephone: "+224 621 23 45 67",
    fonction: "Secrétaire",
    service: "Administration",
    dateEmbauche: "2020-03-15",
    typeContrat: "permanent",
    status: "actif",
    salaireBase: 1800000,
    grade: "Secrétaire Bach",
    banque: "SOGEB",
    rib: "GN987654321098765432"
  },
  {
    id: "3",
    nom: "Barry",
    prenom: "Ibrahima",
    email: "i.barry@lycee-ayd.com",
    telephone: "+224 622 34 56 78",
    fonction: "Comptable",
    service: "Finance",
    dateEmbauche: "2019-01-10",
    typeContrat: "permanent",
    status: "actif",
    salaireBase: 2500000,
    grade: "Comptable",
    banque: "UBA",
    rib: "GN555566667777888899"
  },
  {
    id: "4",
    nom: "Soumah",
    prenom: "Mariama",
    email: "m.soumah@lycee-ayd.com",
    telephone: "+224 623 45 67 89",
    fonction: "Surveillante",
    service: "Vie scolaire",
    dateEmbauche: "2021-09-01",
    typeContrat: "permanent",
    status: "actif",
    salaireBase: 1500000,
    grade: "Surveillante",
  },
  {
    id: "5",
    nom: "Conde",
    prenom: "Oumar",
    email: "o.conde@lycee-ayd.com",
    telephone: "+224 624 56 78 90",
    fonction: "Professeur",
    service: "Enseignement",
    dateEmauche: "2023-01-15",
    typeContrat: "vacataire",
    status: "actif",
    salaireBase: 500000,
    grade: "Professeur vacataire",
  },
  {
    id: "6",
    nom: "Keita",
    prenom: "Aissatou",
    email: "a.keita@lycee-ayd.com",
    telephone: "+224 625 67 89 01",
    fonction: "Professeur",
    service: "Enseignement",
    dateEmauche: "2017-09-01",
    typeContrat: "permanent",
    status: "conge",
    salaireBase: 3800000,
    grade: "Professeur agrégé",
  },
]

// Mock data - Salaries
const salaries: Salary[] = [
  {
    id: "1",
    employeeId: "1",
    employee: employees[0],
    mois: "Février",
    annee: 2025,
    salaireBase: 3500000,
    primeAnciennete: 350000,
    primeResponsabilite: 200000,
    primeTransport: 50000,
    totalBrut: 4100000,
    cnss: 205000,
    avance: 0,
    autresRetenues: 50000,
    totalRetenues: 255000,
    netAPayer: 3845000,
    statut: "paye",
    datePaiement: "28/02/2025",
    modePaiement: "Virement bancaire"
  },
  {
    id: "2",
    employeeId: "2",
    employee: employees[1],
    mois: "Février",
    annee: 2025,
    salaireBase: 1800000,
    primeAnciennete: 90000,
    primeResponsabilite: 0,
    primeTransport: 50000,
    totalBrut: 1940000,
    cnss: 97000,
    avance: 0,
    autresRetenues: 25000,
    totalRetenues: 122000,
    netAPayer: 1818000,
    statut: "paye",
    datePaiement: "28/02/2025",
    modePaiement: "Virement bancaire"
  },
  {
    id: "3",
    employeeId: "3",
    employee: employees[2],
    mois: "Février",
    annee: 2025,
    salaireBase: 2500000,
    primeAnciennete: 250000,
    primeResponsabilite: 150000,
    primeTransport: 50000,
    totalBrut: 2950000,
    cnss: 147500,
    avance: 100000,
    autresRetenues: 30000,
    totalRetenues: 277500,
    netAPayer: 2672500,
    statut: "valide",
  },
  {
    id: "4",
    employeeId: "5",
    employee: employees[4],
    mois: "Février",
    annee: 2025,
    salaireBase: 500000,
    primeAnciennete: 0,
    primeResponsabilite: 0,
    primeTransport: 0,
    totalBrut: 500000,
    cnss: 0,
    avance: 0,
    autresRetenues: 0,
    totalRetenues: 0,
    netAPayer: 500000,
    statut: "brouillon",
  },
]

// Config
const fonctionConfig: Record<string, { label: string; color: string }> = {
  "Professeur": { label: "Professeur", color: "bg-primary/10 text-primary border-primary/20" },
  "Secrétaire": { label: "Secrétaire", color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  "Comptable": { label: "Comptable", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  "Surveillante": { label: "Surveillant(e)", color: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  "Directeur": { label: "Directeur", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
}

const contratConfig: Record<string, { label: string; color: string }> = {
  permanent: { label: "Permanent", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  vacataire: { label: "Vacataire", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  stagiaire: { label: "Stagiaire", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  actif: { label: "Actif", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  conge: { label: "En congé", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  inactif: { label: "Inactif", color: "bg-red-500/10 text-red-500 border-red-500/20" },
}

const salaryStatutConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  valide: { label: "Validé", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  paye: { label: "Payé", color: "bg-green-500/10 text-green-500 border-green-500/20" },
}

function formatGNF(value: number) {
  return new Intl.NumberFormat("fr-GN", { maximumFractionDigits: 0 }).format(value) + " GNF"
}

export default function PersonnelPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState("all")
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [addSalaryOpen, setAddSalaryOpen] = useState(false)

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch = 
      e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesService = serviceFilter === "all" || e.service === serviceFilter
    return matchesSearch && matchesService
  })

  const services = [...new Set(employees.map(e => e.service))]
  
  const stats = {
    total: employees.length,
    actifs: employees.filter(e => e.status === "actif").length,
    masseSalariale: employees.reduce((sum, e) => sum + e.salaireBase, 0),
    enConge: employees.filter(e => e.status === "conge").length,
  }

  const salaryStats = {
    totalPaye: salaries.filter(s => s.statut === "paye").reduce((sum, s) => sum + s.netAPayer, 0),
    enAttente: salaries.filter(s => s.statut !== "paye").reduce((sum, s) => sum + s.netAPayer, 0),
    chargesSociales: salaries.reduce((sum, s) => sum + s.cnss, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personnel & Paie</h1>
          <p className="text-muted-foreground">
            Gérez le personnel et les salaires de l'établissement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Nouveau employé
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel employé</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input placeholder="Nom de famille" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input placeholder="Prénom" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@exemple.com" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input placeholder="+224 6XX XX XX XX" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Fonction</Label>
                  <Select>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professeur">Professeur</SelectItem>
                      <SelectItem value="secretaire">Secrétaire</SelectItem>
                      <SelectItem value="comptable">Comptable</SelectItem>
                      <SelectItem value="surveillant">Surveillant(e)</SelectItem>
                      <SelectItem value="directeur">Directeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Enseignement">Enseignement</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Vie scolaire">Vie scolaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date d'embauche</Label>
                  <Input type="date" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Type de contrat</Label>
                  <Select>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="vacataire">Vacataire</SelectItem>
                      <SelectItem value="stagiaire">Stagiaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salaire de base (GNF)</Label>
                  <Input type="number" placeholder="0" className="bg-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input placeholder="Grade ou catégorie" className="bg-secondary" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddEmployeeOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => setAddEmployeeOpen(false)}>
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
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total employés</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
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
                <Wallet className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Masse salariale</p>
                <p className="text-2xl font-bold text-foreground">{formatGNF(stats.masseSalariale)}</p>
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
                <p className="text-sm text-muted-foreground">En congé</p>
                <p className="text-2xl font-bold text-foreground">{stats.enConge}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="paie">Paie</TabsTrigger>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          <TabsTrigger value="avances">Avances</TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employes" className="space-y-4">
          {/* Filters */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-secondary"
                  />
                </div>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-[180px] bg-secondary">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les services</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Employees Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead>Employé</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Date embauche</TableHead>
                    <TableHead className="text-right">Salaire base</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const fonction = fonctionConfig[employee.fonction] || { label: employee.fonction, color: "bg-gray-500/10" }
                    const contrat = contratConfig[employee.typeContrat] || { label: employee.typeContrat, color: "bg-gray-500/10" }
                    const status = statusConfig[employee.status]
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.prenom} {employee.nom}</p>
                            <p className="text-xs text-muted-foreground">{employee.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={fonction.color}>
                            {fonction.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.service}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={contrat.color}>
                            {contrat.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.dateEmbauche}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatGNF(employee.salaireBase)}
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
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Contrat
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calculator className="mr-2 h-4 w-4" />
                                Calculer salaire
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Désactiver
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

        {/* Paie Tab */}
        <TabsContent value="paie" className="space-y-4">
          {/* Salary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <Banknote className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salariés ce mois</p>
                    <p className="text-2xl font-bold text-foreground">{formatGNF(salaryStats.totalPaye)}</p>
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
                    <p className="text-2xl font-bold text-foreground">{formatGNF(salaryStats.enAttente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                    <Shield className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Charges CNSS</p>
                    <p className="text-2xl font-bold text-foreground">{formatGNF(salaryStats.chargesSociales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-4">
            <Select defaultValue="02-2025">
              <SelectTrigger className="w-[200px] bg-secondary">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="02-2025">Février 2025</SelectItem>
                <SelectItem value="01-2025">Janvier 2025</SelectItem>
                <SelectItem value="12-2024">Décembre 2024</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2">
              <Calculator className="h-4 w-4" />
              Calculer les salaires
            </Button>
          </div>

          {/* Salaries Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead>Employé</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead className="text-right">Salaire base</TableHead>
                    <TableHead className="text-right">Primes</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Retenues</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => {
                    const primes = salary.primeAnciennete + salary.primeResponsabilite + salary.primeTransport
                    const statut = salaryStatutConfig[salary.statut]
                    return (
                      <TableRow key={salary.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{salary.employee.prenom} {salary.employee.nom}</p>
                            <p className="text-xs text-muted-foreground">{salary.mois} {salary.annee}</p>
                          </div>
                        </TableCell>
                        <TableCell>{salary.employee.fonction}</TableCell>
                        <TableCell className="text-right">{formatGNF(salary.salaireBase)}</TableCell>
                        <TableCell className="text-right text-green-600">+{formatGNF(primes)}</TableCell>
                        <TableCell className="text-right font-medium">{formatGNF(salary.totalBrut)}</TableCell>
                        <TableCell className="text-right text-red-600">-{formatGNF(salary.totalRetenues)}</TableCell>
                        <TableCell className="text-right font-bold">{formatGNF(salary.netAPayer)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statut.color}>
                            {statut.label}
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
                                Voir bulletin
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger PDF
                              </DropdownMenuItem>
                              {salary.statut === "valide" && (
                                <DropdownMenuItem>
                                  <Banknote className="mr-2 h-4 w-4" />
                                  Marquer payé
                                </DropdownMenuItem>
                              )}
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

        {/* Contrats Tab */}
        <TabsContent value="contrats" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Gestion des contrats</CardTitle>
              <CardDescription>
                Suivi et renouvellement des contrats de travail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border p-8 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Module contrats</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Gestion des contrats de travail, renouvellements et avenants.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avances Tab */}
        <TabsContent value="avances" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Avances sur salaire</CardTitle>
              <CardDescription>
                Gestion des demandes d'avances et prêts au personnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border p-8 text-center">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Module avances</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Suivi des avances sur salaire et remboursements.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
