"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Mail, 
  Globe, 
  Palette,
  Database,
  Key,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Check
} from "lucide-react"

export default function ParametresPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">
            Gérez les paramètres de la plateforme
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <Database className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations de la plateforme</CardTitle>
              <CardDescription>
                Informations générales sur EduGuinée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Nom de la plateforme</Label>
                  <Input id="platformName" defaultValue="EduGuinée" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformEmail">Email de contact</Label>
                  <Input id="platformEmail" type="email" defaultValue="contact@eduguinee.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select defaultValue="africa-conakry">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="africa-conakry">Africa/Conakry (GMT)</SelectItem>
                      <SelectItem value="europe-paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Langue par défaut</Label>
                  <Select defaultValue="fr">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>
                Personnalisez l'apparence de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thème</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/10 cursor-pointer">
                    <Palette className="h-4 w-4" />
                    <span className="text-sm font-medium">Clair</span>
                    <Check className="h-4 w-4 ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer">
                    <Palette className="h-4 w-4" />
                    <span className="text-sm font-medium">Sombre</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer">
                    <Palette className="h-4 w-4" />
                    <span className="text-sm font-medium">Système</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration régionale</CardTitle>
              <CardDescription>
                Paramètres liés à la localisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select defaultValue="gnf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gnf">Franc Guinéen (GNF)</SelectItem>
                      <SelectItem value="eur">Euro (€)</SelectItem>
                      <SelectItem value="usd">Dollar ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Format de date</Label>
                  <Select defaultValue="dd/mm/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Mettre à jour le mot de passe</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentification à deux facteurs</CardTitle>
              <CardDescription>
                Ajoutez une couche de sécurité supplémentaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">
                    Utilisez une application d'authentification
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-muted-foreground">
                    Recevez les codes par SMS
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions actives</CardTitle>
              <CardDescription>
                Gérez vos sessions actives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Session actuelle</p>
                      <p className="text-sm text-muted-foreground">
                        Chrome sur Windows • Conakry, GN
                      </p>
                    </div>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <Button variant="outline" className="w-full text-destructive">
                  <Shield className="mr-2 h-4 w-4" />
                  Déconnecter toutes les autres sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications par email</CardTitle>
              <CardDescription>
                Choisissez quand recevoir des notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Nouvelle école enregistrée</p>
                  <p className="text-sm text-muted-foreground">
                    Quand une nouvelle école s'inscrit
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Paiement reçu</p>
                  <p className="text-sm text-muted-foreground">
                    Quand un paiement est effectué
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Abonnement expiré</p>
                  <p className="text-sm text-muted-foreground">
                    Quand un abonnement arrive à expiration
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Support</p>
                  <p className="text-sm text-muted-foreground">
                    Quand un utilisateur soumet un ticket
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications push</CardTitle>
              <CardDescription>
                Notifications navigateur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Activer les notifications push</p>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications dans le navigateur
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan actuel</CardTitle>
              <CardDescription>
                Informations sur votre abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/10">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Shield className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">Plan Enterprise</p>
                    <p className="text-sm text-muted-foreground">
                      Accès illimité à toutes les fonctionnalités
                    </p>
                  </div>
                </div>
                <Badge variant="default">Actif</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Date de début</p>
                  <p className="text-lg font-medium">11 Mars 2024</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Prochaine facturation</p>
                  <p className="text-lg font-medium">11 Avril 2024</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="text-lg font-medium">999 €/mois</p>
                </div>
              </div>
              <Button variant="outline">Changer de plan</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moyen de paiement</CardTitle>
              <CardDescription>
                Gérez vos moyens de paiement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expire 12/25</p>
                  </div>
                </div>
                <Badge variant="secondary">Par défaut</Badge>
              </div>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un moyen de paiement
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique des factures</CardTitle>
              <CardDescription>
                Téléchargez vos factures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { date: "11 Mars 2024", amount: "999 €", status: "Payée" },
                  { date: "11 Février 2024", amount: "999 €", status: "Payée" },
                  { date: "11 Janvier 2024", amount: "999 €", status: "Payée" },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{invoice.date}</p>
                      <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Télécharger
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clés API</CardTitle>
              <CardDescription>
                Gérez vos clés API pour l'intégration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Clé de production</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    sk_live_••••••••••••••••
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Copier
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Clé de test</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    sk_test_••••••••••••••••
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Copier
                </Button>
              </div>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Générer une nouvelle clé
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configurez des webhooks pour les événements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL du webhook</Label>
                <Input placeholder="https://votre-site.com/webhook" />
              </div>
              <div className="space-y-2">
                <Label>Événements</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school.created">École créée</SelectItem>
                    <SelectItem value="payment.received">Paiement reçu</SelectItem>
                    <SelectItem value="subscription.created">Nouvel abonnement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un webhook
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation API</CardTitle>
              <CardDescription>
                Ressources pour les développeurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Globe className="mr-2 h-4 w-4" />
                Consulter la documentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CreditCard({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}
