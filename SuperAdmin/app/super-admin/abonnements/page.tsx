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
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  Plus, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Gift,
  RefreshCw
} from "lucide-react"

interface Subscription {
  id: string
  school: string
  plan: "starter" | "pro" | "enterprise"
  status: "trial" | "active" | "past_due" | "suspended" | "cancelled"
  startDate: string
  expiryDate: string
  amount: number
  billingCycle: "monthly" | "yearly"
  paymentMethod: string
  lastPayment: string
}

interface Plan {
  name: string
  priceMonthly: number
  priceYearly: number
  maxStudents: number
  maxStaff: number
  features: string[]
  popular: boolean
}

const subscriptions: Subscription[] = [
  { id: "1", school: "Lycee Excellence Conakry", plan: "pro", status: "active", startDate: "2024-01-15", expiryDate: "2026-01-15", amount: 500000, billingCycle: "yearly", paymentMethod: "Virement", lastPayment: "2025-01-15" },
  { id: "2", school: "College Saint Joseph", plan: "starter", status: "active", startDate: "2024-03-20", expiryDate: "2025-03-20", amount: 200000, billingCycle: "monthly", paymentMethod: "Mobile Money", lastPayment: "2025-03-01" },
  { id: "3", school: "Ecole Primaire Les Petits Genies", plan: "starter", status: "trial", startDate: "2025-01-10", expiryDate: "2025-02-10", amount: 0, billingCycle: "monthly", paymentMethod: "-", lastPayment: "-" },
  { id: "4", school: "Lycee Technique Kankan", plan: "pro", status: "active", startDate: "2024-06-01", expiryDate: "2025-06-01", amount: 500000, billingCycle: "yearly", paymentMethod: "Virement", lastPayment: "2024-06-01" },
  { id: "5", school: "Complexe Scolaire La Chance", plan: "enterprise", status: "active", startDate: "2023-09-01", expiryDate: "2025-09-01", amount: 0, billingCycle: "yearly", paymentMethod: "Virement", lastPayment: "2024-09-01" },
  { id: "6", school: "College Moderne de Freetown", plan: "starter", status: "suspended", startDate: "2024-02-15", expiryDate: "2025-02-15", amount: 200000, billingCycle: "monthly", paymentMethod: "Mobile Money", lastPayment: "2024-02-15" },
]

const plans: Plan[] = [
  { 
    name: "Starter", 
    priceMonthly: 200000, 
    priceYearly: 1800000, 
    maxStudents: 1000,
    maxStaff: 10,
    features: [
      "Gestion des eleves",
      "Gestion des notes",
      "Gestion des paiements",
      "Bulletins de base",
      "Application parents (basique)"
    ],
    popular: false
  },
  { 
    name: "Pro", 
    priceMonthly: 500000, 
    priceYearly: 4500000, 
    maxStudents: 5000,
    maxStaff: 25,
    features: [
      "Tout Starter +",
      "Multi-sites",
      "Rapports avances",
      "Application parents (complete)",
      "Support prioritaire",
      "API access"
    ],
    popular: true
  },
  { 
    name: "Enterprise", 
    priceMonthly: 0, 
    priceYearly: 0, 
    maxStudents: -1,
    maxStaff: -1,
    features: [
      "Tout Pro +",
      "Illimite",
      "API complete",
      "SSO",
      "Support dedie",
      "Formation",
      "Personnalisation avancee"
    ],
    popular: false
  },
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
    case "past_due":
      return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="mr-1 h-3 w-3" />En retard</Badge>
    case "suspended":
      return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Suspendu</Badge>
    case "cancelled":
      return <Badge variant="secondary">Annule</Badge>
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

export default function AbonnementsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesSearch = s.school.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalMRR = subscriptions
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.amount, 0)
  
  const totalARR = totalMRR * 12
  const activeSubscriptions = subscriptions.filter(s => s.status === "active" || s.status === "trial").length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonnements et Plans</h1>
          <p className="text-sm text-muted-foreground">
            Gerer les abonnements et les plans tarifaires
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Renouveler
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold">{formatGNF(totalMRR)}</p>
              <p className="text-xs text-muted-foreground">Recettes mensuelles</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ARR</p>
              <p className="text-2xl font-bold">{formatGNF(totalARR)}</p>
              <p className="text-xs text-muted-foreground">Recettes annuelles</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Abonnements actifs</p>
              <p className="text-2xl font-bold">{activeSubscriptions}</p>
              <p className="text-xs text-muted-foreground">actifs + essai</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En retard</p>
              <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "past_due").length}</p>
              <p className="text-xs text-muted-foreground">requièrent attention</p>
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Plans tarifaires</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-xl border bg-card p-5 ${plan.popular ? 'border-primary ring-1 ring-primary' : ''}`}>
              {plan.popular && (
                <Badge className="mb-2">Plus populaire</Badge>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-3">
                {plan.name === "Enterprise" ? (
                  <p className="text-2xl font-bold">Sur devis</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatGNF(plan.priceMonthly)}<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                    <p className="text-sm text-muted-foreground">{formatGNF(plan.priceYearly)}/an</p>
                  </>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <Users className="inline h-4 w-4 mr-1" />
                  {plan.maxStudents === -1 ? 'Illimite' : `Max ${plan.maxStudents} eleves`}
                </p>
                <p className="text-sm">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  {plan.maxStaff === -1 ? 'Illimite' : `Max ${plan.maxStaff} staff`}
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-4" variant={plan.popular ? "default" : "outline"}>
                {plan.name === "Enterprise" ? "Contacter" : "Modifier"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Abonnements</h2>
        
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row mb-4">
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
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Essai</SelectItem>
              <SelectItem value="past_due">En retard</SelectItem>
              <SelectItem value="suspended">Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ecole</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Dernier paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.school}</TableCell>
                  <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                  <TableCell>{getStatusBadge(sub.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Du {sub.startDate}</p>
                      <p className="text-muted-foreground">Au {sub.expiryDate}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{sub.amount > 0 ? formatGNF(sub.amount) : '-'}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {sub.billingCycle === 'yearly' ? '/an' : '/mois'}
                    </span>
                  </TableCell>
                  <TableCell>{sub.lastPayment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
