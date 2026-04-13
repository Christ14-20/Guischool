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
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 shadow-lg backdrop-blur-xl">
      <h3 className="mb-4 text-sm font-semibold">Actions rapides</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="flex h-auto flex-col gap-2 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-primary/20"
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
