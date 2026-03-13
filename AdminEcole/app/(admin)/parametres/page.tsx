"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Building2,
  Calendar,
  CreditCard,
  Users,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Key,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const utilisateurs = [
  { id: "1", nom: "Amadou Diallo", email: "a.diallo@eduguinee.com", role: "Directeur", statut: "actif", dernierAcces: "Il y a 5 min" },
  { id: "2", nom: "Mariama Bah", email: "m.bah@eduguinee.com", role: "Secretaire", statut: "actif", dernierAcces: "Il y a 2h" },
  { id: "3", nom: "Ibrahim Camara", email: "i.camara@eduguinee.com", role: "Comptable", statut: "actif", dernierAcces: "Hier" },
  { id: "4", nom: "Fatoumata Sylla", email: "f.sylla@eduguinee.com", role: "Surveillant", statut: "inactif", dernierAcces: "Il y a 1 semaine" },
]

const fraisScolarite = [
  { id: "1", niveau: "6eme", inscription: 150000, scolarite: 450000, total: 600000 },
  { id: "2", niveau: "5eme", inscription: 150000, scolarite: 450000, total: 600000 },
  { id: "3", niveau: "4eme", inscription: 175000, scolarite: 500000, total: 675000 },
  { id: "4", niveau: "3eme", inscription: 200000, scolarite: 550000, total: 750000 },
  { id: "5", niveau: "2nde", inscription: 200000, scolarite: 600000, total: 800000 },
  { id: "6", niveau: "1ere", inscription: 225000, scolarite: 650000, total: 875000 },
  { id: "7", niveau: "Terminale", inscription: 250000, scolarite: 700000, total: 950000 },
]

export default function ParametresPage() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditFraisOpen, setIsEditFraisOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parametres</h1>
        <p className="text-muted-foreground">Configurez votre etablissement et gerez les acces</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ecole" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ecole" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Ecole</span>
          </TabsTrigger>
          <TabsTrigger value="annee" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Annee scolaire</span>
          </TabsTrigger>
          <TabsTrigger value="frais" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Frais</span>
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Ecole Tab */}
        <TabsContent value="ecole" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l etablissement</CardTitle>
              <CardDescription>Informations generales affichees sur les documents officiels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l etablissement</Label>
                  <Input id="nom" defaultValue="Lycee Alpha Yaya Diallo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type d etablissement</Label>
                  <Select defaultValue="lycee">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaire">Ecole primaire</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="lycee">Lycee</SelectItem>
                      <SelectItem value="complexe">Complexe scolaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" defaultValue="contact@lycee-aydiallo.edu.gn" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Telephone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input id="telephone" defaultValue="+224 622 123 456" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-2.5 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="adresse" 
                    defaultValue="Quartier Almamya, Commune de Kaloum, Conakry, Guinee"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="directeur">Nom du directeur</Label>
                  <Input id="directeur" defaultValue="M. Amadou Diallo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agrement">Numero d agrement</Label>
                  <Input id="agrement" defaultValue="AGR-2015-00123" />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer les modifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annee scolaire Tab */}
        <TabsContent value="annee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration de l annee scolaire</CardTitle>
              <CardDescription>Definissez les dates et periodes de l annee en cours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Annee scolaire actuelle</p>
                    <p className="text-2xl font-bold text-primary">2023 - 2024</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date de debut</Label>
                  <Input type="date" defaultValue="2023-10-02" />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input type="date" defaultValue="2024-07-15" />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-4 font-medium">Trimestres</h4>
                <div className="space-y-4">
                  <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground">Trimestre 1</Label>
                      <p className="font-medium">Oct 2023 - Dec 2023</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Debut</Label>
                      <Input type="date" defaultValue="2023-10-02" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <Input type="date" defaultValue="2023-12-22" />
                    </div>
                  </div>
                  <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground">Trimestre 2</Label>
                      <p className="font-medium">Jan 2024 - Mars 2024</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Debut</Label>
                      <Input type="date" defaultValue="2024-01-08" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <Input type="date" defaultValue="2024-03-29" />
                    </div>
                  </div>
                  <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-muted-foreground">Trimestre 3</Label>
                      <p className="font-medium">Avr 2024 - Juil 2024</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Debut</Label>
                      <Input type="date" defaultValue="2024-04-15" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <Input type="date" defaultValue="2024-07-15" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline">Preparer annee suivante</Button>
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frais Tab */}
        <TabsContent value="frais" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grille tarifaire</CardTitle>
                  <CardDescription>Frais d inscription et de scolarite par niveau</CardDescription>
                </div>
                <Dialog open={isEditFraisOpen} onOpenChange={setIsEditFraisOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Modifier la grille
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier les frais</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Niveau</Label>
                        <Select defaultValue="6eme">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fraisScolarite.map((f) => (
                              <SelectItem key={f.id} value={f.niveau}>{f.niveau}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Frais d inscription (GNF)</Label>
                        <Input type="number" defaultValue="150000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Scolarite annuelle (GNF)</Label>
                        <Input type="number" defaultValue="450000" />
                      </div>
                      <Button className="w-full" onClick={() => setIsEditFraisOpen(false)}>
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Niveau</TableHead>
                    <TableHead className="text-right">Inscription</TableHead>
                    <TableHead className="text-right">Scolarite</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraisScolarite.map((frais) => (
                    <TableRow key={frais.id}>
                      <TableCell className="font-medium">{frais.niveau}</TableCell>
                      <TableCell className="text-right">{frais.inscription.toLocaleString()} GNF</TableCell>
                      <TableCell className="text-right">{frais.scolarite.toLocaleString()} GNF</TableCell>
                      <TableCell className="text-right font-bold">{frais.total.toLocaleString()} GNF</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Options de paiement</CardTitle>
              <CardDescription>Configurez les methodes de paiement acceptees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Phone className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Orange Money</p>
                    <p className="text-sm text-muted-foreground">Numero: +224 622 123 456</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Phone className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">MTN Mobile Money</p>
                    <p className="text-sm text-muted-foreground">Numero: +224 661 789 012</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Especes</p>
                    <p className="text-sm text-muted-foreground">Paiement au guichet</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilisateurs Tab */}
        <TabsContent value="utilisateurs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <CardDescription>Gerez les acces au tableau de bord de l ecole</CardDescription>
                </div>
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter un utilisateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvel utilisateur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nom complet</Label>
                        <Input placeholder="Ex: Mamadou Barry" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" placeholder="email@eduguinee.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionnez un role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="directeur">Directeur</SelectItem>
                            <SelectItem value="secretaire">Secretaire</SelectItem>
                            <SelectItem value="comptable">Comptable</SelectItem>
                            <SelectItem value="surveillant">Surveillant</SelectItem>
                            <SelectItem value="enseignant">Enseignant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mot de passe temporaire</Label>
                        <Input type="password" placeholder="Minimum 8 caracteres" />
                      </div>
                      <Button className="w-full" onClick={() => setIsAddUserOpen(false)}>
                        Creer l utilisateur
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Dernier acces</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilisateurs.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.nom}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {user.dernierAcces}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.statut === "actif" ? "default" : "secondary"}>
                          {user.statut}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="mr-2 h-4 w-4" />
                              Reinitialiser MDP
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Desactiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences de notification</CardTitle>
              <CardDescription>Configurez les alertes et rappels automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alertes financieres</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Rappels de paiement automatiques</p>
                      <p className="text-sm text-muted-foreground">Envoyer des SMS de rappel aux parents en retard</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Confirmation de paiement</p>
                      <p className="text-sm text-muted-foreground">SMS de confirmation apres chaque paiement</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Alerte impayes critiques</p>
                      <p className="text-sm text-muted-foreground">Notification quand le retard depasse 30 jours</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alertes academiques</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Publication des resultats</p>
                      <p className="text-sm text-muted-foreground">Notifier les parents quand les notes sont publiees</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Absences</p>
                      <p className="text-sm text-muted-foreground">Alerter les parents en cas d absence</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Moyenne en baisse</p>
                      <p className="text-sm text-muted-foreground">Alerte si la moyenne baisse de plus de 2 points</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Parametres SMS</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Heure d envoi preferee</Label>
                    <Select defaultValue="08:00">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="08:00">08:00</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="12:00">12:00</SelectItem>
                        <SelectItem value="14:00">14:00</SelectItem>
                        <SelectItem value="18:00">18:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequence des rappels</Label>
                    <Select defaultValue="7">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Tous les 3 jours</SelectItem>
                        <SelectItem value="7">Tous les 7 jours</SelectItem>
                        <SelectItem value="14">Tous les 14 jours</SelectItem>
                        <SelectItem value="30">Tous les 30 jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer les preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
