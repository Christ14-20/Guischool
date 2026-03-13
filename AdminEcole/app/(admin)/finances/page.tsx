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
  Download,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Smartphone
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecordPaymentDialog } from "@/components/finances/record-payment-dialog"

interface Payment {
  id: string
  date: string
  studentName: string
  studentClass: string
  type: string
  amount: number
  method: "especes" | "orange_money" | "mtn_money" | "virement"
  reference: string
  status: "confirme" | "en_attente"
}

const payments: Payment[] = [
  {
    id: "1",
    date: "11/03/2025",
    studentName: "Mariama Bah",
    studentClass: "Terminale S1",
    type: "Scolarite T2",
    amount: 850000,
    method: "orange_money",
    reference: "OM2025031101",
    status: "confirme"
  },
  {
    id: "2",
    date: "10/03/2025",
    studentName: "Alpha Sow",
    studentClass: "2nde C",
    type: "Scolarite T2",
    amount: 650000,
    method: "especes",
    reference: "ESP2025031001",
    status: "confirme"
  },
  {
    id: "3",
    date: "10/03/2025",
    studentName: "Fatoumata Camara",
    studentClass: "3eme A",
    type: "Inscription",
    amount: 150000,
    method: "mtn_money",
    reference: "MTN2025031001",
    status: "en_attente"
  },
  {
    id: "4",
    date: "09/03/2025",
    studentName: "Ibrahima Conde",
    studentClass: "5eme A",
    type: "Scolarite T2",
    amount: 450000,
    method: "orange_money",
    reference: "OM2025030901",
    status: "confirme"
  },
  {
    id: "5",
    date: "08/03/2025",
    studentName: "Kadiatou Sylla",
    studentClass: "4eme B",
    type: "Scolarite T1",
    amount: 500000,
    method: "virement",
    reference: "VIR2025030801",
    status: "confirme"
  },
  {
    id: "6",
    date: "07/03/2025",
    studentName: "Ousmane Diallo",
    studentClass: "6eme B",
    type: "Inscription",
    amount: 100000,
    method: "especes",
    reference: "ESP2025030701",
    status: "confirme"
  },
]

const methodConfig = {
  especes: { label: "Especes", icon: CreditCard },
  orange_money: { label: "Orange Money", icon: Smartphone },
  mtn_money: { label: "MTN Money", icon: Smartphone },
  virement: { label: "Virement", icon: CreditCard },
}

function formatGNF(value: number) {
  return new Intl.NumberFormat("fr-GN").format(value) + " GNF"
}

export default function FinancesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter

    return matchesSearch && matchesMethod
  })

  const totalReceived = payments
    .filter(p => p.status === "confirme")
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion financiere</h1>
          <p className="text-sm text-muted-foreground">
            Suivi des paiements et recouvrements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Rapport
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Enregistrer paiement
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Recettes totales"
          value="125.8M GNF"
          subtitle="Annee 2024-2025"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Recettes du mois"
          value="35.2M GNF"
          subtitle="Mars 2025"
          icon={CreditCard}
          trend={{ value: 12, label: "vs fevrier" }}
          variant="success"
        />
        <StatCard
          title="Impayes"
          value="28.5M GNF"
          subtitle="156 eleves concernes"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="Taux recouvrement"
          value="78%"
          subtitle="Objectif: 85%"
          icon={CheckCircle}
          variant="info"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Paiements recents</TabsTrigger>
          <TabsTrigger value="unpaid">Impayes</TabsTrigger>
          <TabsTrigger value="fees">Frais de scolarite</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                <SelectItem value="especes">Especes</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="mtn_money">MTN Money</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Eleve</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const MethodIcon = methodConfig[payment.method].icon
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.date}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.studentName}</p>
                          <p className="text-xs text-muted-foreground">{payment.studentClass}</p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.type}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatGNF(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MethodIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{methodConfig[payment.method].label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                      <TableCell>
                        <Badge
                          variant={payment.status === "confirme" ? "default" : "secondary"}
                          className={payment.status === "confirme" 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-chart-3/10 text-chart-3 border-chart-3/20"
                          }
                        >
                          {payment.status === "confirme" ? "Confirme" : "En attente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="unpaid">
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Liste des impayes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette section affichera les eleves avec des soldes impayes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Grille tarifaire</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Configuration des frais de scolarite par niveau.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
