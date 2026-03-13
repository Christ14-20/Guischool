"use client"

import { Button } from "@/components/ui/button"
import { 
  UserPlus, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Download,
  Calendar
} from "lucide-react"

const actions = [
  {
    label: "Inscrire un eleve",
    icon: UserPlus,
    variant: "default" as const,
  },
  {
    label: "Saisir des notes",
    icon: FileText,
    variant: "secondary" as const,
  },
  {
    label: "Enregistrer paiement",
    icon: CreditCard,
    variant: "secondary" as const,
  },
  {
    label: "Envoyer SMS",
    icon: MessageSquare,
    variant: "secondary" as const,
  },
  {
    label: "Generer bulletin",
    icon: Download,
    variant: "secondary" as const,
  },
  {
    label: "Emploi du temps",
    icon: Calendar,
    variant: "secondary" as const,
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Actions rapides</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto flex-col gap-2 py-4"
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
