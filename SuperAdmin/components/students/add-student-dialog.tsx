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

interface AddStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStudentDialog({ open, onOpenChange }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inscrire un nouvel eleve</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'eleve pour completer l'inscription.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Personal info */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Informations personnelles
              </h4>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Prenom</FieldLabel>
                  <Input placeholder="Mariama" required />
                </Field>
                <Field>
                  <FieldLabel>Nom</FieldLabel>
                  <Input placeholder="Bah" required />
                </Field>
                <Field>
                  <FieldLabel>Date de naissance</FieldLabel>
                  <Input type="date" required />
                </Field>
                <Field>
                  <FieldLabel>Genre</FieldLabel>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Feminin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Lieu de naissance</FieldLabel>
                  <Input placeholder="Conakry" />
                </Field>
                <Field>
                  <FieldLabel>Nationalite</FieldLabel>
                  <Input placeholder="Guineenne" defaultValue="Guineenne" />
                </Field>
              </FieldGroup>
            </div>

            {/* Academic info */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Informations academiques
              </h4>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Classe</FieldLabel>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6eme-a">6eme A</SelectItem>
                      <SelectItem value="6eme-b">6eme B</SelectItem>
                      <SelectItem value="5eme-a">5eme A</SelectItem>
                      <SelectItem value="5eme-b">5eme B</SelectItem>
                      <SelectItem value="4eme-a">4eme A</SelectItem>
                      <SelectItem value="4eme-b">4eme B</SelectItem>
                      <SelectItem value="3eme-a">3eme A</SelectItem>
                      <SelectItem value="3eme-b">3eme B</SelectItem>
                      <SelectItem value="2nde-c">2nde C</SelectItem>
                      <SelectItem value="1ere-s1">1ere S1</SelectItem>
                      <SelectItem value="1ere-l2">1ere L2</SelectItem>
                      <SelectItem value="tle-s1">Terminale S1</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Annee scolaire</FieldLabel>
                  <Select defaultValue="2024-2025">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                      <SelectItem value="2025-2026">2025-2026</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>

            {/* Guardian info */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Informations du tuteur
              </h4>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nom du tuteur</FieldLabel>
                  <Input placeholder="Ibrahima Bah" required />
                </Field>
                <Field>
                  <FieldLabel>Lien de parente</FieldLabel>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pere">Pere</SelectItem>
                      <SelectItem value="mere">Mere</SelectItem>
                      <SelectItem value="oncle">Oncle</SelectItem>
                      <SelectItem value="tante">Tante</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Telephone</FieldLabel>
                  <Input type="tel" placeholder="+224 6XX XXX XXX" required />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="tuteur@email.com" />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Adresse</FieldLabel>
                  <Input placeholder="Quartier, Commune, Ville" />
                </Field>
              </FieldGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              Inscrire l'eleve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
