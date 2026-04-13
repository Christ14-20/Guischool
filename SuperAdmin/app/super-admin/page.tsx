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
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Pause,
  Play,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Ticket,
  Globe,
  DollarSign,
  Activity
} from "lucide-react"

interface School {
  id: string
  name: string
  slug: string
  type: string
  region: string
  students: number
  plan: "starter" | "pro" | "enterprise"
  status: "active" | "trial" | "suspended"
  createdAt: string
  revenue: number
}

interface Ticket {
  id: string
  school: string
  subject: string
  priority: "bloquant" | "majeur" | "mineur" | "question"
  status: "open" | "in_progress" | "resolved" | "closed"
  createdAt: string
}

const schools: School[] = [
  { id: "1", name: "Lycée Excellence Conakry", slug: "lycee-excellence", type: "Lycée", region: "Conakry", students: 1250, plan: "pro", status: "active", createdAt: "2024-01-15", revenue: 15000000 },
  { id: "2", name: "College Saint Joseph", slug: "college-saint-joseph", type: "Collège", region: "Conakry", students: 890, plan: "starter", status: "active", createdAt: "2024-03-20", revenue: 8500000 },
  { id: "3", name: "Ecole Primaire Les Petits Genies", slug: "petits-genies", type: "Primaire", region: "Kindia", students: 450, plan: "starter", status: "trial", createdAt: "2025-01-10", revenue: 0 },
  { id: "4", name: "Lycee Technique Kankan", slug: "technique-kankan", type: "Technique", region: "Kankan", students: 680, plan: "pro", status: "active", createdAt: "2024-06-01", revenue: 12000000 },
  { id: "5", name: "Complexe Scolaire La Chance", slug: "chance", type: "Mixte", region: "Labé", students: 1100, plan: "enterprise", status: "active", createdAt: "2023-09-01", revenue: 25000000 },
  { id: "6", name: "College Moderne de Freetown", slug: "moderne-freetown", type: "Collège", region: "Freetown", students: 520, plan: "starter", status: "suspended", createdAt: "2024-02-15", revenue: 0 },
]

const tickets: Ticket[] = [
  { id: "1", school: "Lycée Excellence Conakry", subject: "Problème de paiement Mobile Money", priority: "bloquant", status: "open", createdAt: "2025-03-11" },
  { id: "2", school: "College Saint Joseph", subject: "Demande d'ajout de fonctionnalité", priority: "mineur", status: "in_progress", createdAt: "2025-03-10" },
  { id: "3", school: "Ecole Primaire Les Petits Genies", subject: "Comment activer le module bulletins?", priority: "question", status: "open", createdAt: "2025-03-10" },
  { id: "4", school: "Lycee Technique Kankan", subject: "Compte directeur bloqué", priority: "majeur", status: "resolved", createdAt: "2025-03-09" },
  { id: "5", school: "Complexe Scolaire La Chance", subject: "Intégration API personnalisée", priority: "mineur", status: "open", createdAt: "2025-03-08" },
]

const revenueData = [
  { month: "Sept", revenue: 45000000 },
  { month: "Oct", revenue: 52000000 },
  { month: "Nov", revenue: 58000000 },
  { month: "Dec", revenue: 65000000 },
  { month: "Jan", revenue: 72000000 },
  { month: "Fev", revenue: 78000000 },
]

const formatGNF = (amount: number) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  return `${(amount / 1000).toFixed(0)}K`
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
    case "trial":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Clock className="mr-1 h-3 w-3" />Essai</Badge>
    case "suspended":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><Pause className="mr-1 h-3 w-3" />Suspendue</Badge>
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

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "bloquant":
      return <Badge className="bg-red-100 text-red-800">Bloquant</Badge>
    case "majeur":
      return <Badge className="bg-orange-100 text-orange-800">Majeur</Badge>
    case "mineur":
      return <Badge className="bg-yellow-100 text-yellow-800">Mineur</Badge>
    case "question":
      return <Badge variant="outline">Question</Badge>
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

const getTicketStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-100 text-blue-800">Ouvert</Badge>
    case "in_progress":
      return <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
    case "resolved":
      return <Badge className="bg-green-100 text-green-800">Résolu</Badge>
    case "closed":
      return <Badge variant="secondary">Fermé</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function SuperAdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.region.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSchools = schools.length
  const activeSchools = schools.filter(s => s.status === "active").length
  const totalStudents = schools.reduce((sum, s) => sum + s.students, 0)
  const totalRevenue = schools.reduce((sum, s) => sum + s.revenue, 0)
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length
  const urgentTickets = tickets.filter(t => t.priority === "bloquant" && t.status === "open").length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de la plateforme Eduguinee
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Ecole
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ecoles actives</p>
              <p className="text-3xl font-bold">{activeSchools}/{totalSchools}</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +3 ce mois
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total eleves</p>
              <p className="text-3xl font-bold">{totalStudents.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8% vs mois dernier
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenus mensuels</p>
              <p className="text-3xl font-bold">{formatGNF(totalRevenue)} GNF</p>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15% vs mois dernier
              </p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tickets ouverts</p>
              <p className="text-3xl font-bold">{openTickets}</p>
              {urgentTickets > 0 && (
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {urgentTickets} urgent(s)
                </p>
              )}
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <Ticket className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Schools List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ecoles recentes</h2>
            <Button variant="ghost" size="sm">Voir tout</Button>
          </div>
          
          <div className="rounded-xl border bg-card">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une ecole..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ecole</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Eleves</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.slice(0, 6).map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="text-xs text-muted-foreground">{school.slug}.eduguinee.com</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{school.region}</Badge>
                    </TableCell>
                    <TableCell>{school.students}</TableCell>
                    <TableCell>{getPlanBadge(school.plan)}</TableCell>
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
                          <Button variant="ghost" size="icon">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tickets de support</h2>
            <Button variant="ghost" size="sm">Voir tout</Button>
          </div>
          
          <div className="rounded-xl border bg-card p-4 space-y-4">
            {tickets.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{ticket.school}</p>
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ticket.createdAt}</p>
                </div>
                {getTicketStatusBadge(ticket.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Carte des ecoles</h2>
            <p className="text-sm text-muted-foreground">Distribution geographique des ecoles</p>
          </div>
          <Globe className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="h-64 rounded-lg bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Carte interactive - Regions de Guinee</p>
        </div>
      </div>
    </div>
  )
}