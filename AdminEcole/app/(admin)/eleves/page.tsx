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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  FileText,
  Download,
  Filter
} from "lucide-react"
import { AddStudentDialog } from "@/components/students/add-student-dialog"

interface Student {
  id: string
  matricule: string
  firstName: string
  lastName: string
  class: string
  gender: "M" | "F"
  birthDate: string
  guardian: string
  phone: string
  paymentStatus: "paye" | "partiel" | "impaye"
}

const students: Student[] = [
  {
    id: "1",
    matricule: "EDU2024001",
    firstName: "Mariama",
    lastName: "Bah",
    class: "Terminale S1",
    gender: "F",
    birthDate: "15/03/2006",
    guardian: "Ibrahima Bah",
    phone: "+224 622 123 456",
    paymentStatus: "paye"
  },
  {
    id: "2",
    matricule: "EDU2024002",
    firstName: "Mamadou",
    lastName: "Barry",
    class: "Terminale S1",
    gender: "M",
    birthDate: "22/07/2005",
    guardian: "Kadiatou Barry",
    phone: "+224 628 789 012",
    paymentStatus: "impaye"
  },
  {
    id: "3",
    matricule: "EDU2024003",
    firstName: "Fatoumata",
    lastName: "Camara",
    class: "3eme A",
    gender: "F",
    birthDate: "10/11/2008",
    guardian: "Sekou Camara",
    phone: "+224 621 456 789",
    paymentStatus: "partiel"
  },
  {
    id: "4",
    matricule: "EDU2024004",
    firstName: "Ousmane",
    lastName: "Diallo",
    class: "6eme B",
    gender: "M",
    birthDate: "05/01/2012",
    guardian: "Aissatou Diallo",
    phone: "+224 625 321 654",
    paymentStatus: "paye"
  },
  {
    id: "5",
    matricule: "EDU2024005",
    firstName: "Aissatou",
    lastName: "Balde",
    class: "1ere L2",
    gender: "F",
    birthDate: "18/09/2007",
    guardian: "Mamadou Balde",
    phone: "+224 624 987 654",
    paymentStatus: "impaye"
  },
  {
    id: "6",
    matricule: "EDU2024006",
    firstName: "Alpha",
    lastName: "Sow",
    class: "2nde C",
    gender: "M",
    birthDate: "30/04/2008",
    guardian: "Fatoumata Sow",
    phone: "+224 620 111 222",
    paymentStatus: "paye"
  },
  {
    id: "7",
    matricule: "EDU2024007",
    firstName: "Kadiatou",
    lastName: "Sylla",
    class: "4eme B",
    gender: "F",
    birthDate: "12/12/2009",
    guardian: "Boubacar Sylla",
    phone: "+224 623 333 444",
    paymentStatus: "partiel"
  },
  {
    id: "8",
    matricule: "EDU2024008",
    firstName: "Ibrahima",
    lastName: "Conde",
    class: "5eme A",
    gender: "M",
    birthDate: "25/06/2010",
    guardian: "Mariama Conde",
    phone: "+224 627 555 666",
    paymentStatus: "paye"
  },
]

const paymentStatusConfig = {
  paye: { label: "Paye", variant: "default" as const, className: "bg-primary/10 text-primary border-primary/20" },
  partiel: { label: "Partiel", variant: "secondary" as const, className: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  impaye: { label: "Impaye", variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.matricule.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesClass = classFilter === "all" || student.class === classFilter
    const matchesPayment = paymentFilter === "all" || student.paymentStatus === paymentFilter

    return matchesSearch && matchesClass && matchesPayment
  })

  const classes = [...new Set(students.map(s => s.class))]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des eleves</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} eleves inscrits cette annee
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvel eleve
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="paye">Paye</SelectItem>
              <SelectItem value="partiel">Partiel</SelectItem>
              <SelectItem value="impaye">Impaye</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[250px]">Eleve</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Date naissance</TableHead>
              <TableHead>Tuteur</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {student.firstName[0]}{student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.gender === "M" ? "Masculin" : "Feminin"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{student.matricule}</TableCell>
                <TableCell>{student.class}</TableCell>
                <TableCell>{student.birthDate}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{student.guardian}</p>
                    <p className="text-xs text-muted-foreground">{student.phone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={paymentStatusConfig[student.paymentStatus].variant}
                    className={paymentStatusConfig[student.paymentStatus].className}
                  >
                    {paymentStatusConfig[student.paymentStatus].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Bulletin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
