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
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 shadow-lg backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activite recente</h3>
        <button className="text-xs font-medium text-primary transition-colors hover:text-primary/80 hover:underline">
          Voir tout
        </button>
      </div>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="group flex items-start gap-3 rounded-lg p-2 transition-all hover:bg-secondary/40 hover:shadow-sm">
            <Avatar className={cn("h-9 w-9 transition-transform group-hover:scale-110 group-hover:rotate-6", typeColors[activity.type])}>
              <AvatarFallback className="bg-transparent text-xs font-medium">
                {activity.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium transition-colors group-hover:text-primary">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
            </div>
            <span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground opacity-80 transition-opacity group-hover:opacity-100">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
