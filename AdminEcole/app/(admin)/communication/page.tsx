"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MessageSquare,
  Send,
  Bell,
  Users,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
} from "lucide-react"

const messagesEnvoyes = [
  {
    id: "1",
    type: "sms",
    destinataires: "Parents 6eme A",
    sujet: "Reunion parents-professeurs",
    message: "Chers parents, nous vous invitons a la reunion du 15 mars a 14h...",
    date: "2024-03-10 10:30",
    statut: "envoye",
    nombreDestinataires: 45,
  },
  {
    id: "2",
    type: "notification",
    destinataires: "Tous les parents",
    sujet: "Fermeture exceptionnelle",
    message: "L'ecole sera fermee le lundi 18 mars pour cause de fete nationale...",
    date: "2024-03-09 16:00",
    statut: "envoye",
    nombreDestinataires: 257,
  },
  {
    id: "3",
    type: "sms",
    destinataires: "Parents - Impayes",
    sujet: "Rappel paiement scolarite",
    message: "Rappel: la scolarite du 2eme trimestre est a regulariser avant le 20 mars...",
    date: "2024-03-08 09:00",
    statut: "envoye",
    nombreDestinataires: 32,
  },
  {
    id: "4",
    type: "email",
    destinataires: "Enseignants",
    sujet: "Conseil de classe - Planning",
    message: "Le planning des conseils de classe du 2eme trimestre est disponible...",
    date: "2024-03-07 14:30",
    statut: "envoye",
    nombreDestinataires: 15,
  },
]

const annonces = [
  {
    id: "1",
    titre: "Inscription examens blancs",
    contenu: "Les inscriptions pour les examens blancs du BEPC et du BAC sont ouvertes...",
    datePublication: "2024-03-10",
    auteur: "Direction",
    cible: "3eme, Terminale",
    actif: true,
  },
  {
    id: "2",
    titre: "Nouvelle cantine scolaire",
    contenu: "A partir du 1er avril, une nouvelle cantine sera disponible avec des repas equilibres...",
    datePublication: "2024-03-08",
    auteur: "Administration",
    cible: "Tous",
    actif: true,
  },
  {
    id: "3",
    titre: "Tournoi de football inter-classes",
    contenu: "Le tournoi annuel de football aura lieu du 25 au 30 mars. Inscrivez vos equipes...",
    datePublication: "2024-03-05",
    auteur: "Sport",
    cible: "Tous",
    actif: false,
  },
]

const classes = ["Tous", "6eme A", "6eme B", "5eme A", "5eme B", "4eme A", "3eme A"]

export default function CommunicationPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [isNewAnnonceOpen, setIsNewAnnonceOpen] = useState(false)
  const [selectedType, setSelectedType] = useState("sms")
  const [message, setMessage] = useState("")
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])

  const caracteres = message.length
  const smsCount = Math.ceil(caracteres / 160) || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communication</h1>
          <p className="text-muted-foreground">Envoyez des SMS, notifications et gerez les annonces</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isNewAnnonceOpen} onOpenChange={setIsNewAnnonceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Megaphone className="h-4 w-4" />
                Nouvelle annonce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Creer une annonce</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titre de l annonce</Label>
                  <Input placeholder="Ex: Reunion parents-professeurs" />
                </div>
                <div className="space-y-2">
                  <Label>Contenu</Label>
                  <Textarea 
                    placeholder="Redigez votre annonce..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Public cible</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionnez le public" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous (eleves, parents, enseignants)</SelectItem>
                      <SelectItem value="parents">Parents uniquement</SelectItem>
                      <SelectItem value="eleves">Eleves uniquement</SelectItem>
                      <SelectItem value="enseignants">Enseignants uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => setIsNewAnnonceOpen(false)}>
                  Publier l annonce
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="h-4 w-4" />
                Nouveau message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Envoyer un message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type de message</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={selectedType === "sms" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setSelectedType("sms")}
                    >
                      <Phone className="h-4 w-4" />
                      SMS
                    </Button>
                    <Button
                      type="button"
                      variant={selectedType === "notification" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setSelectedType("notification")}
                    >
                      <Bell className="h-4 w-4" />
                      Notification
                    </Button>
                    <Button
                      type="button"
                      variant={selectedType === "email" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setSelectedType("email")}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Destinataires</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionnez les destinataires" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous-parents">Tous les parents</SelectItem>
                      <SelectItem value="impayes">Parents - Scolarite impayee</SelectItem>
                      <SelectItem value="classe">Parents d une classe</SelectItem>
                      <SelectItem value="enseignants">Tous les enseignants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Classes concernees</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {classes.slice(1).map((classe) => (
                      <label
                        key={classe}
                        className="flex items-center gap-2 rounded-lg border border-border p-2 cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox 
                          checked={selectedClasses.includes(classe)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClasses([...selectedClasses, classe])
                            } else {
                              setSelectedClasses(selectedClasses.filter(c => c !== classe))
                            }
                          }}
                        />
                        <span className="text-sm">{classe}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sujet</Label>
                  <Input placeholder="Objet du message" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Message</Label>
                    {selectedType === "sms" && (
                      <span className="text-xs text-muted-foreground">
                        {caracteres}/160 ({smsCount} SMS)
                      </span>
                    )}
                  </div>
                  <Textarea 
                    placeholder="Redigez votre message..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {selectedType === "sms" && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground">
                      Cout estime: <span className="font-medium text-foreground">{smsCount * 50} GNF</span> par destinataire
                    </p>
                  </div>
                )}

                <Button className="w-full gap-2" onClick={() => setIsNewMessageOpen(false)}>
                  <Send className="h-4 w-4" />
                  Envoyer le message
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SMS envoyes (mois)</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
                <Bell className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold">456</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
                <Users className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parents joignables</p>
                <p className="text-2xl font-bold">89%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
                <Megaphone className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annonces actives</p>
                <p className="text-2xl font-bold">{annonces.filter(a => a.actif).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historique" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historique">Historique</TabsTrigger>
          <TabsTrigger value="annonces">Annonces</TabsTrigger>
          <TabsTrigger value="modeles">Modeles</TabsTrigger>
        </TabsList>

        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Messages envoyes</CardTitle>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead className="hidden md:table-cell">Destinataires</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messagesEnvoyes.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {msg.type === "sms" && <Phone className="mr-1 h-3 w-3" />}
                          {msg.type === "notification" && <Bell className="mr-1 h-3 w-3" />}
                          {msg.type === "email" && <Mail className="mr-1 h-3 w-3" />}
                          {msg.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{msg.sujet}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{msg.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{msg.nombreDestinataires}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{msg.date}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Envoye
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annonces" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {annonces.map((annonce) => (
              <Card key={annonce.id} className={!annonce.actif ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{annonce.titre}</CardTitle>
                      <CardDescription>{annonce.datePublication}</CardDescription>
                    </div>
                    <Badge variant={annonce.actif ? "default" : "secondary"}>
                      {annonce.actif ? "Active" : "Archivee"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{annonce.contenu}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cible: {annonce.cible}</span>
                    <span className="text-muted-foreground">{annonce.auteur}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      {annonce.actif ? "Archiver" : "Reactiver"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modeles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modeles de messages</CardTitle>
                  <CardDescription>Modeles pre-enregistres pour gagner du temps</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau modele
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Rappel paiement</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Rappel: La scolarite de votre enfant [NOM] est a regulariser...
                        </p>
                      </div>
                      <Badge variant="secondary">SMS</Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">Utiliser</Button>
                      <Button variant="ghost" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Absence eleve</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Votre enfant [NOM] a ete absent(e) le [DATE]. Merci de justifier...
                        </p>
                      </div>
                      <Badge variant="secondary">SMS</Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">Utiliser</Button>
                      <Button variant="ghost" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Reunion parents</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Une reunion parents-professeurs aura lieu le [DATE] a [HEURE]...
                        </p>
                      </div>
                      <Badge variant="secondary">Notification</Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">Utiliser</Button>
                      <Button variant="ghost" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Resultats disponibles</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Les resultats du [TRIMESTRE] sont disponibles. Connectez-vous pour consulter...
                        </p>
                      </div>
                      <Badge variant="secondary">Notification</Badge>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">Utiliser</Button>
                      <Button variant="ghost" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
