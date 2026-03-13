"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

interface UnpaidStudent {
  id: string
  name: string
  class: string
  amount: number
  dueDate: string
  status: "en_retard" | "tres_en_retard"
}

const unpaidStudents: UnpaidStudent[] = [
  {
    id: "1",
    name: "Mamadou Barry",
    class: "Terminale S1",
    amount: 850000,
    dueDate: "15 Dec 2024",
    status: "tres_en_retard"
  },
  {
    id: "2",
    name: "Fatoumata Camara",
    class: "3eme A",
    amount: 650000,
    dueDate: "01 Jan 2025",
    status: "en_retard"
  },
  {
    id: "3",
    name: "Ousmane Diallo",
    class: "6eme B",
    amount: 450000,
    dueDate: "10 Jan 2025",
    status: "en_retard"
  },
  {
    id: "4",
    name: "Aissatou Balde",
    class: "1ere L2",
    amount: 750000,
    dueDate: "20 Dec 2024",
    status: "tres_en_retard"
  },
]

function formatGNF(value: number) {
  return new Intl.NumberFormat("fr-GN").format(value) + " GNF"
}

export function UnpaidList() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Impayes prioritaires</h3>
          <p className="text-xs text-muted-foreground">
            {unpaidStudents.length} eleves avec solde en attente
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Relancer tous
        </Button>
      </div>
      <div className="space-y-3">
        {unpaidStudents.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.class}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-destructive">
                {formatGNF(student.amount)}
              </p>
              <Badge
                variant={student.status === "tres_en_retard" ? "destructive" : "secondary"}
                className="mt-1 text-[10px]"
              >
                {student.status === "tres_en_retard" ? "Tres en retard" : "En retard"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
