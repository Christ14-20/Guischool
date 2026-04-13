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
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { 
  Search, 
  Plus,
  Ticket,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  User,
  Building2,
  Filter,
  Send,
  Archive
} from "lucide-react"

interface Ticket {
  id: string
  ticketNumber: string
  school: string
  requester: string
  email: string
  category: "technique" | "facturation" | "fonctionnel" | "compte" | "paiement" | "autre"
  priority: "bloquant" | "majeur" | "mineur" | "question"
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
  subject: string
  description: string
  createdAt: string
  lastUpdate: string
}

const tickets: Ticket[] = [
  { id: "1", ticketNumber: "TKT-001", school: "Lycee Excellence Conakry", requester: "M. Ousmane Diakite", email: "ousmane@ecole.edu", category: "technique", priority: "bloquant", status: "open", subject: "Probleme de paiement Mobile Money", description: "Les parents ne peuvent pas effectuer de paiements via Orange Money. Le systeme retourne une erreur.", createdAt: "2025-03-11 14:30", lastUpdate: "2025-03-11 14:30" },
  { id: "2", ticketNumber: "TKT-002", school: "College Saint Joseph", requester: "Pere Michel Bernard", email: "michel@stjoseph.edu", category: "fonctionnel", priority: "mineur", status: "in_progress", subject: "Demande d'ajout de fonctionnalite", description: "Nous souhaiterions avoir acces au module de generation automatique des bulletins.", createdAt: "2025-03-10 09:15", lastUpdate: "2025-03-10 11:20" },
  { id: "3", ticketNumber: "TKT-003", school: "Ecole Primaire Les Petits Genies", requester: "Mme Mariama Sy", email: "mariama@petitsgenies.edu", category: "compte", priority: "question", status: "open", subject: "Comment activer le module bulletins?", description: "Je ne trouve pas comment activer les bulletins pour les parents.", createdAt: "2025-03-10 16:45", lastUpdate: "2025-03-10 16:45" },
  { id: "4", ticketNumber: "TKT-004", school: "Lycee Technique Kankan", requester: "M. Alpha Diallo", email: "alpha@technique.edu", category: "compte", priority: "majeur", status: "resolved", subject: "Compte directeur bloque", description: "Mon compte est bloque apres plusieurs tentatives de mot de passe incorrect.", createdAt: "2025-03-09 08:00", lastUpdate: "2025-03-09 10:30" },
  { id: "5", ticketNumber: "TKT-005", school: "Complexe Scolaire La Chance", requester: "M. Boubacar Sekou", email: "boubacar@lachance.edu", category: "technique", priority: "mineur", status: "waiting", subject: "Integration API personnalisee", description: "Nous souhaiterions integrer nos propres formulaires d'inscription via API.", createdAt: "2025-03-08 14:20", lastUpdate: "2025-03-09 09:00" },
  { id: "6", ticketNumber: "TKT-006", school: "College Moderne de Freetown", requester: "M. John Smith", email: "john@moderne.edu", category: "facturation", priority: "bloquant", status: "closed", subject: "Paiement non valide", description: "Le paiement effectu&#233; hier n'apparait pas dans notre tableau de bord.", createdAt: "2025-03-05 10:00", lastUpdate: "2025-03-06 15:00" },
]

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-GN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "bloquant":
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="mr-1 h-3 w-3" />Bloquant</Badge>
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-100 text-blue-800"><Ticket className="mr-1 h-3 w-3" />Ouvert</Badge>
    case "in_progress":
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />En cours</Badge>
    case "waiting":
      return <Badge className="bg-purple-100 text-purple-800">En attente client</Badge>
    case "resolved":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Resolu</Badge>
    case "closed":
      return <Badge variant="secondary"><Archive className="mr-1 h-3 w-3" />Ferme</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getCategoryBadge = (category: string) => {
  const labels: Record<string, string> = {
    technique: "Technique",
    facturation: "Facturation",
    fonctionnel: "Fonctionnel",
    compte: "Compte",
    paiement: "Paiement",
    autre: "Autre"
  }
  return <Badge variant="outline">{labels[category] || category}</Badge>
}

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyOpen, setReplyOpen] = useState(false)

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.school.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const openTickets = tickets.filter(t => t.status === "open").length
  const inProgressTickets = tickets.filter(t => t.status === "in_progress").length
  const urgentTickets = tickets.filter(t => t.priority === "bloquant" && t.status !== "closed").length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground">
            Gerer les tickets de support des ecoles
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ouverts</p>
              <p className="text-2xl font-bold">{openTickets}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold">{inProgressTickets}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bloquants</p>
              <p className="text-2xl font-bold">{urgentTickets}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolus (30j)</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === "resolved" || t.status === "closed").length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="waiting">En attente</SelectItem>
            <SelectItem value="resolved">Resolu</SelectItem>
            <SelectItem value="closed">Ferme</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Priorite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="bloquant">Bloquant</SelectItem>
            <SelectItem value="majeur">Majeur</SelectItem>
            <SelectItem value="mineur">Mineur</SelectItem>
            <SelectItem value="question">Question</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Ecole</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Sujet</TableHead>
              <TableHead>Priorite</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Cree le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                <TableCell className="font-mono text-sm">{ticket.ticketNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {ticket.school}
                  </div>
                </TableCell>
                <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ticket.createdAt}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setReplyOpen(true); }}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket && !replyOpen} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticketNumber}</span>
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  Ecole: {selectedTicket.school} | Cree le {selectedTicket.createdAt}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedTicket.requester}</span>
                    <span className="text-muted-foreground">({selectedTicket.email})</span>
                  </div>
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
                
                <div className="space-y-2">
                  <Field>
                    <FieldLabel>Assigner a</FieldLabel>
                    <Select defaultValue="agent1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent1">Agent Support 1</SelectItem>
                        <SelectItem value="agent2">Agent Support 2</SelectItem>
                        <SelectItem value="tech">Equipe technique</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>Fermer</Button>
                <Button onClick={() => setReplyOpen(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Repondre
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Repondre au ticket</DialogTitle>
            <DialogDescription>
              {selectedTicket && `${selectedTicket.ticketNumber} - ${selectedTicket.subject}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field>
              <FieldLabel>Statut</FieldLabel>
              <Select defaultValue="in_progress">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting">En attente client</SelectItem>
                  <SelectItem value="resolved">Resolu</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Reponse</FieldLabel>
              <Textarea placeholder="Tapez votre reponse ici..." rows={6} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Annuler</Button>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Envoyer la reponse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
