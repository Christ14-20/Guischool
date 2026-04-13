"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface GradesEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const students = [
  { id: "1", name: "Mariama Bah", devoir1: "", devoir2: "", examen: "" },
  { id: "2", name: "Mamadou Barry", devoir1: "", devoir2: "", examen: "" },
  { id: "3", name: "Fatoumata Camara", devoir1: "", devoir2: "", examen: "" },
  { id: "4", name: "Alpha Sow", devoir1: "", devoir2: "", examen: "" },
  { id: "5", name: "Ibrahima Conde", devoir1: "", devoir2: "", examen: "" },
]

export function GradesEntryDialog({ open, onOpenChange }: GradesEntryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [grades, setGrades] = useState(students)

  const handleGradeChange = (studentId: string, field: string, value: string) => {
    setGrades(prev => 
      prev.map(s => 
        s.id === studentId ? { ...s, [field]: value } : s
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saisie des notes</DialogTitle>
          <DialogDescription>
            Entrez les notes pour la classe et la matiere selectionnees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Selection */}
            <FieldGroup className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Classe</FieldLabel>
                <Select defaultValue="terminale-s1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6eme-a">6eme A</SelectItem>
                    <SelectItem value="3eme-a">3eme A</SelectItem>
                    <SelectItem value="terminale-s1">Terminale S1</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Matiere</FieldLabel>
                <Select defaultValue="maths">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maths">Mathematiques</SelectItem>
                    <SelectItem value="francais">Francais</SelectItem>
                    <SelectItem value="physique">Physique-Chimie</SelectItem>
                    <SelectItem value="svt">SVT</SelectItem>
                    <SelectItem value="anglais">Anglais</SelectItem>
                    <SelectItem value="histoire">Histoire-Geo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Periode</FieldLabel>
                <Select defaultValue="t1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t1">1er Trimestre</SelectItem>
                    <SelectItem value="t2">2eme Trimestre</SelectItem>
                    <SelectItem value="t3">3eme Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {/* Grades table */}
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Eleve</TableHead>
                    <TableHead className="w-[100px] text-center">Devoir 1</TableHead>
                    <TableHead className="w-[100px] text-center">Devoir 2</TableHead>
                    <TableHead className="w-[100px] text-center">Examen</TableHead>
                    <TableHead className="w-[100px] text-center">Moyenne</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((student) => {
                    const d1 = parseFloat(student.devoir1) || 0
                    const d2 = parseFloat(student.devoir2) || 0
                    const ex = parseFloat(student.examen) || 0
                    const hasGrades = student.devoir1 || student.devoir2 || student.examen
                    const moyenne = hasGrades ? ((d1 + d2 + ex * 2) / 4).toFixed(1) : "-"
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            placeholder="--"
                            value={student.devoir1}
                            onChange={(e) => handleGradeChange(student.id, "devoir1", e.target.value)}
                            className="h-9 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            placeholder="--"
                            value={student.devoir2}
                            onChange={(e) => handleGradeChange(student.id, "devoir2", e.target.value)}
                            className="h-9 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            placeholder="--"
                            value={student.examen}
                            onChange={(e) => handleGradeChange(student.id, "examen", e.target.value)}
                            className="h-9 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {moyenne}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Formule: (Devoir1 + Devoir2 + Examen x 2) / 4
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              Enregistrer les notes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
