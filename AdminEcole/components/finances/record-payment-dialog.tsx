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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Smartphone, Building } from "lucide-react"

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordPaymentDialog({ open, onOpenChange }: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("especes")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Saisissez les informations du paiement recu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Student selection */}
            <Field>
              <FieldLabel>Eleve</FieldLabel>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Rechercher un eleve..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mariama Bah - Terminale S1</SelectItem>
                  <SelectItem value="2">Mamadou Barry - Terminale S1</SelectItem>
                  <SelectItem value="3">Fatoumata Camara - 3eme A</SelectItem>
                  <SelectItem value="4">Ousmane Diallo - 6eme B</SelectItem>
                  <SelectItem value="5">Alpha Sow - 2nde C</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Payment type */}
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Type de paiement</FieldLabel>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inscription">Inscription</SelectItem>
                    <SelectItem value="scolarite_t1">Scolarite T1</SelectItem>
                    <SelectItem value="scolarite_t2">Scolarite T2</SelectItem>
                    <SelectItem value="scolarite_t3">Scolarite T3</SelectItem>
                    <SelectItem value="examen">Frais d'examen</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Montant (GNF)</FieldLabel>
                <Input 
                  type="number" 
                  placeholder="850000" 
                  required 
                  min={0}
                />
              </Field>
            </FieldGroup>

            {/* Payment method */}
            <Field>
              <FieldLabel>Mode de paiement</FieldLabel>
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={setPaymentMethod}
                className="grid grid-cols-2 gap-3 pt-2"
              >
                <Label
                  htmlFor="especes"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="especes" id="especes" />
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Especes</span>
                </Label>
                <Label
                  htmlFor="orange_money"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="orange_money" id="orange_money" />
                  <Smartphone className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Orange Money</span>
                </Label>
                <Label
                  htmlFor="mtn_money"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="mtn_money" id="mtn_money" />
                  <Smartphone className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">MTN Money</span>
                </Label>
                <Label
                  htmlFor="virement"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value="virement" id="virement" />
                  <Building className="h-4 w-4" />
                  <span className="text-sm font-medium">Virement</span>
                </Label>
              </RadioGroup>
            </Field>

            {/* Mobile Money reference */}
            {(paymentMethod === "orange_money" || paymentMethod === "mtn_money") && (
              <Field>
                <FieldLabel>Reference transaction</FieldLabel>
                <Input 
                  placeholder="Ex: OM2025031101" 
                  required 
                />
              </Field>
            )}

            {/* Notes */}
            <Field>
              <FieldLabel>Notes (optionnel)</FieldLabel>
              <Input placeholder="Informations supplementaires..." />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
