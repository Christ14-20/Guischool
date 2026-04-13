"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Pause,
  Play,
  Trash2,
  Building2,
  Users,
  MapPin,
  Globe,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"

interface School {
  id: string
  name: string
  slug: string
  codeMinedu: string
  type: "primaire" | "college" | "lycee" | "mixte" | "technique"
  status: "active" | "trial" | "suspended" | "cancelled"
  region: string
  prefecture: string
  address: string
  director: string
  phone: string
  email: string
  students: number
  staff: number
  plan: "starter" | "pro" | "enterprise"
  createdAt: string
  expiryDate: string
  revenue: number
}

const schools: School[] = [
  { id: "1", name: "Lycée Excellence Conakry", slug: "lycee-excellence", codeMinedu: "GN-2024-001", type: "lycee", status: "active", region: "Conakry", prefecture: "Conakry", address: "Ratoma, Kobayah", director: "M. Ousmane Diakité", phone: "+224 622 00 00 00", email: "contact@lycee-excellence.edu", students: 1250, staff: 45, plan: "pro", createdAt: "2024-01-15", expiryDate: "2026-01-15", revenue: 15000000 },
  { id: "2", name: "College Saint Joseph", slug: "college-saint-joseph", codeMinedu: "GN-2024-002", type: "college", status: "active", region: "Conakry", prefecture: "Dixinn", address: "Dixinn, Centre Ville", director: "Père Michel Bernard", phone: "+224 621 11 11 11", email: "direction@stjoseph.edu", students: 890, staff: 32, plan: "starter", createdAt: "2024-03-20", expiryDate: "2025-03-20", revenue: 8500000 },
  { id: "3", name: "Ecole Primaire Les Petits Genies", slug: "petits-genies", codeMinedu: "GN-2025-001", type: "primaire", status: "trial", region: "Kindia", prefecture: "Kindia", address: "Centre Ville", director: "Mme Mariama Sy", phone: "+224 623 22 22 22", email: "contact@petitsgenies.edu", students: 450, staff: 18, plan: "starter", createdAt: "2025-01-10", expiryDate: "2025-02-10", revenue: 0 },
  { id: "4", name: "Lycee Technique Kankan", slug: "technique-kankan", codeMinedu: "GN-2024-003", type: "technique", status: "active", region: "Kankan", prefecture: "Kankan", address: "Quartier Commerce", director: "M. Alpha Diallo", phone: "+224 624 33 33 33", email: "direction@technique-kankan.edu", students: 680, staff: 28, plan: "pro", createdAt: "2024-06-01", expiryDate: "2025-06-01", revenue: 12000000 },
  { id: "5", name: "Complexe Scolaire La Chance", slug: "chance", codeMinedu: "GN-2023-001", type: "mixte", status: "active", region: "Labé", prefecture: "Labé", address: "T冒着, Avenue Principale", director: "M. Boubacar Sékou", phone: "+224 625 44 44 44", email: "administration@lachance.edu", students: 1100, staff: 52, plan: "enterprise", createdAt: "2023-09-01", expiryDate: "2025-09-01", revenue: 25000000 },
  { id: "6", name: "College Moderne de Freetown", slug: "moderne-freetown", codeMinedu: "GN-2024-004", type: "college", status: "suspended", region: "Freetown", prefecture: "Freetown", address: "Centre Ville", director: "M. John Smith", phone: "+224 626 55 55 55", email: "direction@moderne-freetown.edu", students: 520, staff: 22, plan: "starter", createdAt: "2024-02-15", expiryDate: "2025-02-15", revenue: 0 },
]

const formatGNF = (amount: number) => {
  return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(amount)
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
    case "trial":
      return <Badge className="bg-blue-100 text-blue-800"><Clock className="mr-1 h-3 w-3" />Essai</Badge>
    case "suspended":
      return <Badge className="bg-red-100 text-red-800"><Pause className="mr-1 h-3 w-3" />Suspendue</Badge>
    case "cancelled":
      return <Badge className="bg-gray-100 text-gray-800">Annulee</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getPlanBadge = (plan: string) => {
  switch (plan) {
    case "starter":
      return <Badge variant="outline">Starter</Badge>
    case "pro":
      return <Badge className="bg-primary/10 text-primary">Pro</Badge>
    case "enterprise":
      return <Badge className="bg-purple-100 text-purple-800">Enterprise</Badge>
    default:
      return <Badge variant="outline">{plan}</Badge>
  }
}

export default function EcolesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const filteredSchools = schools.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.region.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
    setCreateOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Ecoles</h1>
          <p className="text-sm text-muted-foreground">
            Creez, configurez et managez les etablissements scolaires
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Ecole
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{schools.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actives</p>
              <p className="text-xl font-bold">{schools.filter(s => s.status === "active").length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En essai</p>
              <p className="text-xl font-bold">{schools.filter(s => s.status === "trial").length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Suspendues</p>
              <p className="text-xl font-bold">{schools.filter(s => s.status === "suspended").length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenus mens.</p>
              <p className="text-xl font-bold">{formatGNF(schools.reduce((sum, s) => sum + s.revenue, 0)).split(' ')[0]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ecole..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Essai</SelectItem>
            <SelectItem value="suspended">Suspendue</SelectItem>
            <SelectItem value="cancelled">Annulee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schools Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ecole</TableHead>
              <TableHead>Code MINEDU</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Eleves</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.map((school) => (
              <TableRow key={school.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-xs text-muted-foreground">{school.slug}.eduguinee.com</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{school.codeMinedu}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {school.region}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {school.students}
                  </div>
                </TableCell>
                <TableCell>{getPlanBadge(school.plan)}</TableCell>
                <TableCell>
                  <span className="text-sm">{school.expiryDate}</span>
                </TableCell>
                <TableCell>{getStatusBadge(school.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {school.status === "active" ? (
                      <Button variant="ghost" size="icon" className="text-red-600">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : school.status === "suspended" ? (
                      <Button variant="ghost" size="icon" className="text-green-600">
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create School Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Creer une nouvelle ecole</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel etablissement scolaire sur la plateforme.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSchool}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <FieldGroup>
                <h4 className="font-medium col-span-2">Informations generales</h4>
                <Field>
                  <FieldLabel>Nom de l'etablissement</FieldLabel>
                  <Input placeholder="Lycee Excellence Conakry" required />
                </Field>
                <Field>
                  <FieldLabel>Code MINEDU</FieldLabel>
                  <Input placeholder="GN-2024-001" />
                </Field>
                <Field>
                  <FieldLabel>Type d'etablissement</FieldLabel>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaire">Primaire</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="lycee">Lycee</SelectItem>
                      <SelectItem value="mixte">Mixte</SelectItem>
                      <SelectItem value="technique">Technique</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              
              <FieldGroup>
                <h4 className="font-medium col-span-2">Localisation</h4>
                <Field>
                  <FieldLabel>Region</FieldLabel>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conakry">Conakry</SelectItem>
                      <SelectItem value="kindia">Kindia</SelectItem>
                      <SelectItem value="labé">Labé</SelectItem>
                      <SelectItem value="kankan">Kankan</SelectItem>
                      <SelectItem value="faranah">Faranah</SelectItem>
                      <SelectItem value="nzerekore">Nzerekore</SelectItem>
                      <SelectItem value="boke">Boké</SelectItem>
                      <SelectItem value="mamou">Mamou</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Prefecture</FieldLabel>
                  <Input placeholder="Conakry" required />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Adresse</FieldLabel>
                  <Input placeholder="Quartier, Rue" required />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <h4 className="font-medium col-span-2">Contact</h4>
                <Field>
                  <FieldLabel>Nom du directeur</FieldLabel>
                  <Input placeholder="M. Jean Dupont" required />
                </Field>
                <Field>
                  <FieldLabel>Telephone</FieldLabel>
                  <Input placeholder="+224 622 00 00 00" required />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="contact@ecole.edu" required />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <h4 className="font-medium col-span-2">Plan</h4>
                <Field>
                  <FieldLabel>Plan selectionne</FieldLabel>
                  <Select defaultValue="starter">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - 200 000 GNF/mois</SelectItem>
                      <SelectItem value="pro">Pro - 500 000 GNF/mois</SelectItem>
                      <SelectItem value="enterprise">Enterprise - Sur devis</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Duree d'essai (jours)</FieldLabel>
                  <Input type="number" defaultValue="30" />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                Creer l'ecole
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
