"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Calendar,
  Plus,
  Download,
  RefreshCw,
  AlertTriangle,
  Users,
  BookOpen,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Printer
} from "lucide-react"

// Time slots
const timeSlots = [
  { id: "1", start: "08:00", end: "08:50" },
  { id: "2", start: "09:00", end: "09:50" },
  { id: "3", start: "10:10", end: "11:00" },
  { id: "4", start: "11:10", end: "12:00" },
  { id: "5", start: "14:00", end: "14:50" },
  { id: "6", start: "15:00", end: "15:50" },
]

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]

const classes = [
  { id: "1", name: "6eme A" },
  { id: "2", name: "6eme B" },
  { id: "3", name: "5eme A" },
  { id: "4", name: "4eme A" },
  { id: "5", name: "3eme A" },
]

const teachers = [
  { id: "1", name: "M. Diallo", matiere: "Mathematiques" },
  { id: "2", name: "Mme Camara", matiere: "Francais" },
  { id: "3", name: "M. Barry", matiere: "Physique-Chimie" },
  { id: "4", name: "Mme Soumah", matiere: "Histoire-Geo" },
  { id: "5", name: "M. Conde", matiere: "Anglais" },
]

const rooms = [
  { id: "1", name: "Salle 101" },
  { id: "2", name: "Salle 102" },
  { id: "3", name: "Salle 103" },
  { id: "4", name: "Labo Physique" },
  { id: "5", name: "Labo SVT" },
]

// Course colors
const courseColors: Record<string, string> = {
  "Mathematiques": "bg-blue-500/20 border-blue-500/30 text-blue-400",
  "Francais": "bg-purple-500/20 border-purple-500/30 text-purple-400",
  "Physique-Chimie": "bg-orange-500/20 border-orange-500/30 text-orange-400",
  "Histoire-Geo": "bg-green-500/20 border-green-500/30 text-green-400",
  "Anglais": "bg-pink-500/20 border-pink-500/30 text-pink-400",
  "SVT": "bg-teal-500/20 border-teal-500/30 text-teal-400",
  "EPS": "bg-red-500/20 border-red-500/30 text-red-400",
}

// Mock schedule
const schedule: Record<string, Record<string, { matiere: string; prof: string; salle: string } | null>> = {
  "Lundi": {
    "1": { matiere: "Mathematiques", prof: "M. Diallo", salle: "101" },
    "2": { matiere: "Mathematiques", prof: "M. Diallo", salle: "101" },
    "3": { matiere: "Francais", prof: "Mme Camara", salle: "101" },
    "4": { matiere: "Anglais", prof: "M. Conde", salle: "101" },
    "5": { matiere: "Histoire-Geo", prof: "Mme Soumah", salle: "101" },
    "6": { matiere: "EPS", prof: "M. Bah", salle: "Terrain" },
  },
  "Mardi": {
    "1": { matiere: "Francais", prof: "Mme Camara", salle: "101" },
    "2": { matiere: "Francais", prof: "Mme Camara", salle: "101" },
    "3": { matiere: "Physique-Chimie", prof: "M. Barry", salle: "Labo" },
    "4": { matiere: "Physique-Chimie", prof: "M. Barry", salle: "Labo" },
    "5": { matiere: "SVT", prof: "Mme Keita", salle: "Labo SVT" },
    "6": null,
  },
  "Mercredi": {
    "1": { matiere: "Mathematiques", prof: "M. Diallo", salle: "101" },
    "2": { matiere: "Histoire-Geo", prof: "Mme Soumah", salle: "101" },
    "3": { matiere: "Anglais", prof: "M. Conde", salle: "101" },
    "4": { matiere: "Anglais", prof: "M. Conde", salle: "101" },
    "5": null,
    "6": null,
  },
  "Jeudi": {
    "1": { matiere: "SVT", prof: "Mme Keita", salle: "Labo SVT" },
    "2": { matiere: "SVT", prof: "Mme Keita", salle: "Labo SVT" },
    "3": { matiere: "Mathematiques", prof: "M. Diallo", salle: "101" },
    "4": { matiere: "Francais", prof: "Mme Camara", salle: "101" },
    "5": { matiere: "EPS", prof: "M. Bah", salle: "Terrain" },
    "6": { matiere: "EPS", prof: "M. Bah", salle: "Terrain" },
  },
  "Vendredi": {
    "1": { matiere: "Physique-Chimie", prof: "M. Barry", salle: "Labo" },
    "2": { matiere: "Histoire-Geo", prof: "Mme Soumah", salle: "101" },
    "3": { matiere: "Histoire-Geo", prof: "Mme Soumah", salle: "101" },
    "4": { matiere: "Mathematiques", prof: "M. Diallo", salle: "101" },
    "5": null,
    "6": null,
  },
}

const conflicts = [
  { type: "prof", message: "M. Diallo assigne a 2 classes en meme temps", jour: "Lundi", heure: "08:00" },
  { type: "salle", message: "Salle 101 surreservee", jour: "Mardi", heure: "10:10" },
]

export default function EmploiDuTempsPage() {
  const [selectedClass, setSelectedClass] = useState("1")
  const [viewMode, setViewMode] = useState<"classe" | "prof" | "salle">("classe")
  const [addCourseOpen, setAddCourseOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; slot: string } | null>(null)

  const handleSlotClick = (day: string, slot: string) => {
    setSelectedSlot({ day, slot })
    setAddCourseOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emploi du Temps</h1>
          <p className="text-muted-foreground">Planification et gestion des cours</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Generer auto
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-500">{conflicts.length} conflit(s) detecte(s)</p>
                <ul className="mt-1 space-y-1">
                  {conflicts.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {c.message} - {c.jour} a {c.heure}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cours/semaine</p>
                <p className="text-2xl font-bold text-foreground">24</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enseignants</p>
                <p className="text-2xl font-bold text-foreground">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                <MapPin className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salles</p>
                <p className="text-2xl font-bold text-foreground">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conflits</p>
                <p className="text-2xl font-bold text-foreground">{conflicts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <CardTitle>Semaine du 15 au 19 Janvier 2024</CardTitle>
              </div>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                <TabsList className="bg-secondary">
                  <TabsTrigger value="classe">Par classe</TabsTrigger>
                  <TabsTrigger value="prof">Par prof</TabsTrigger>
                  <TabsTrigger value="salle">Par salle</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px] bg-secondary">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
                <div className="p-2 text-center text-sm font-medium text-muted-foreground">Heure</div>
                {days.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-foreground bg-secondary rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {timeSlots.map((slot, slotIdx) => (
                <div key={slot.id} className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
                  <div className="p-2 text-center text-xs text-muted-foreground flex flex-col justify-center">
                    <span>{slot.start}</span>
                    <span>{slot.end}</span>
                  </div>
                  {days.map((day) => {
                    const course = schedule[day]?.[slot.id]
                    if (course) {
                      const colorClass = courseColors[course.matiere] || "bg-gray-500/20 border-gray-500/30 text-gray-400"
                      return (
                        <div
                          key={`${day}-${slot.id}`}
                          className={`p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${colorClass}`}
                          onClick={() => handleSlotClick(day, slot.id)}
                        >
                          <p className="font-medium text-sm truncate">{course.matiere}</p>
                          <p className="text-xs opacity-80 truncate">{course.prof}</p>
                          <p className="text-xs opacity-60 truncate">Salle {course.salle}</p>
                        </div>
                      )
                    }
                    return (
                      <div
                        key={`${day}-${slot.id}`}
                        className="p-2 rounded-lg border border-dashed border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors flex items-center justify-center"
                        onClick={() => handleSlotClick(day, slot.id)}
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Pause indicator */}
              {timeSlots.findIndex(s => s.id === "4") >= 0 && (
                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1 my-2">
                  <div className="p-1 text-center text-xs text-muted-foreground">12:00-14:00</div>
                  <div className="col-span-5 p-2 text-center text-sm text-muted-foreground bg-secondary/30 rounded-lg">
                    Pause dejeuner
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(courseColors).map(([matiere, colorClass]) => (
              <Badge key={matiere} variant="outline" className={colorClass}>
                {matiere}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Course Dialog */}
      <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSlot ? `${selectedSlot.day} - ${timeSlots.find(s => s.id === selectedSlot.slot)?.start}` : "Ajouter un cours"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Matiere</label>
              <Select>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionner une matiere" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(courseColors).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enseignant</label>
              <Select>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionner un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} - {t.matiere}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Salle</label>
              <Select>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selectionner une salle" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddCourseOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setAddCourseOpen(false)}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
