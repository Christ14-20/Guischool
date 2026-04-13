"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { 
  DollarSign, 
  Search, 
  Plus, 
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle2,
  FileText,
  Filter,
  Calendar
} from "lucide-react"

const payments = [
  {
    id: 1,
    school: "Lycée Excellence",
    plan: "Pro",
    amount: 500000,
    date: "09/04/2024",
    status: "Payé",
    mode: "MTN Mobile Money",
  },
  {
    id: 2,
    school: "École Sainte-Marie",
    plan: "Starter",
    amount: 200000,
    date: "08/04/2024",
    status: "Payé",
    mode: "Orange Money",
  },
  {
    id: 3,
    school: "Collège International",
    plan: "Enterprise",
    amount: 10000000,
    date: "08/04/2024",
    status: "Payé",
    mode: "Virement bancaire",
  },
  {
    id: 4,
    school: "Groupe Scolaire Les Petits Génies",
    plan: "Pro",
    amount: 500000,
    date: "07/04/2024",
    status: "En attente",
    mode: "-",
  },
  {
    id: 5,
    school: "Lycée de Kaloum",
    plan: "Starter",
    amount: 200000,
    date: "05/04/2024",
    status: "En retard",
    mode: "-",
  },
]

const invoices = [
  {
    id: 1,
    numero: "FACT-2026-0001",
    school: "Lycée Excellence",
    plan: "Pro",
    amount: 500000,
    period: "Avril 2024",
    date: "01/04/2024",
    status: "Payée",
  },
  {
    id: 2,
    numero: "FACT-2026-0002",
    school: "École Sainte-Marie",
    plan: "Starter",
    amount: 200000,
    period: "Avril 2024",
    date: "01/04/2024",
    status: "Payée",
  },
  {
    id: 3,
    numero: "FACT-2026-0003",
    school: "Collège International",
    plan: "Enterprise",
    amount: 10000000,
    period: "Avril 2024",
    date: "01/04/2024",
    status: "Payée",
  },
  {
    id: 4,
    numero: "FACT-2026-0004",
    school: "Groupe Scolaire Les Petits Génies",
    plan: "Pro",
    amount: 500000,
    period: "Avril 2024",
    date: "01/04/2024",
    status: "En attente",
  },
]

export default function FinancesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const stats = {
    mrr: 15650000,
    pending: 700000,
    overdue: 200000,
    monthly: 18500000,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
          <p className="text-muted-foreground">
            Gestion des paiements et facturation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer une facture
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.mrr.toLocaleString()} GNF</p>
                <p className="text-sm text-muted-foreground">MRR Mensuel</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending.toLocaleString()} GNF</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue.toLocaleString()} GNF</p>
                <p className="text-sm text-muted-foreground">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.monthly.toLocaleString()} GNF</p>
                <p className="text-sm text-muted-foreground">Revenus mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="paiements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="relances">Relances</TabsTrigger>
        </TabsList>

        <TabsContent value="paiements">
          <Card>
            <CardHeader>
              <CardTitle>Historique des paiements</CardTitle>
              <CardDescription>
                Liste des transactions reçues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par école..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      {selectedStatus === "all" ? "Tous les statuts" : selectedStatus}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedStatus("all")}>
                      Tous les statuts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("Payé")}>
                      Payé
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("En attente")}>
                      En attente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("En retard")}>
                      En retard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>École</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.school}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.plan}</Badge>
                      </TableCell>
                      <TableCell>{payment.amount.toLocaleString()} GNF</TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.mode}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.status === "Payé" ? "default" :
                          payment.status === "En attente" ? "secondary" :
                          "destructive"
                        }>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Receipt className="mr-2 h-4 w-4" />
                              Générer facture
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Voir reçu
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

        <TabsContent value="factures">
          <Card>
            <CardHeader>
              <CardTitle>Factures</CardTitle>
              <CardDescription>
                Gestion des factures émises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>École</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.numero}</TableCell>
                      <TableCell>{invoice.school}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.plan}</Badge>
                      </TableCell>
                      <TableCell>{invoice.amount.toLocaleString()} GNF</TableCell>
                      <TableCell>{invoice.period}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "Payée" ? "default" : "secondary"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir la facture
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Receipt className="mr-2 h-4 w-4" />
                              Envoyer par email
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

        <TabsContent value="relances">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des relances</CardTitle>
              <CardDescription>
                Écoles en retard de paiement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.filter(p => p.status === "En retard" || p.status === "En attente").map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{payment.school}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.amount.toLocaleString()} GNF - Échéance: {payment.date}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Envoyer rappel
                      </Button>
                      <Button variant="outline" size="sm">
                        Suspendre
                      </Button>
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

function Clock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
