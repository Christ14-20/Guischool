"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Activity {
  id: string
  type: "payment" | "inscription" | "note" | "message"
  title: string
  description: string
  time: string
  avatar?: string
  initials: string
}

const activities: Activity[] = [
  {
    id: "1",
    type: "payment",
    title: "Paiement recu",
    description: "Mariama Bah - Scolarite T1",
    time: "Il y a 5 min",
    initials: "MB"
  },
  {
    id: "2",
    type: "inscription",
    title: "Nouvelle inscription",
    description: "Ibrahima Sow - 6eme A",
    time: "Il y a 15 min",
    initials: "IS"
  },
  {
    id: "3",
    type: "note",
    title: "Notes ajoutees",
    description: "Mathematiques - Terminale S1",
    time: "Il y a 1h",
    initials: "MS"
  },
  {
    id: "4",
    type: "message",
    title: "Message envoye",
    description: "Rappel de paiement - 45 parents",
    time: "Il y a 2h",
    initials: "SY"
  },
  {
    id: "5",
    type: "payment",
    title: "Paiement recu",
    description: "Alpha Camara - Scolarite T1",
    time: "Il y a 3h",
    initials: "AC"
  },
]

const typeColors = {
  payment: "bg-primary/10 text-primary",
  inscription: "bg-chart-2/10 text-chart-2",
  note: "bg-chart-3/10 text-chart-3",
  message: "bg-chart-5/10 text-chart-5",
}

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activite recente</h3>
        <button className="text-xs font-medium text-primary hover:underline">
          Voir tout
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar className={cn("h-9 w-9", typeColors[activity.type])}>
              <AvatarFallback className="bg-transparent text-xs font-medium">
                {activity.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
