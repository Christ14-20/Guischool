'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Ticket } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { createTicket } from '@/lib/api/support';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'FACTURATION', label: 'Facturation' },
  { value: 'FONCTIONNEL', label: 'Fonctionnel' },
  { value: 'FEATURE', label: 'Demande de fonctionnalité' },
  { value: 'BLOCAGE', label: 'Blocage' },
  { value: 'PAIEMENT', label: 'Paiement' },
];

const PRIORITIES = [
  { value: 'BLOQUANT', label: '🔴 Bloquant' },
  { value: 'MAJEUR', label: '🟠 Majeur' },
  { value: 'MINEUR', label: '🔵 Mineur' },
  { value: 'QUESTION', label: '⚪ Question' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const ticketSchema = z.object({
  subject: z.string().min(5, 'Le sujet doit comporter au moins 5 caractères.').max(200),
  category: z.string().min(1, 'La catégorie est requise.'),
  priority: z.string().min(1, 'La priorité est requise.'),
  description: z.string().min(20, 'La description doit comporter au moins 20 caractères.'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

type NewTicketDialogProps = {
  onCreated?: () => void;
};

export function NewTicketDialog({ onCreated }: NewTicketDialogProps) {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const [open, setOpen] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema) as any,
    defaultValues: {
      subject: '',
      category: '',
      priority: 'MINEUR',
      description: '',
    },
  });

  const onSubmit = async (values: TicketFormValues) => {
    if (!token) return;
    try {
      await createTicket(token, values);
      toast.success('Ticket créé avec succès ! Notre équipe vous répondra rapidement.');
      setOpen(false);
      form.reset();
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du ticket.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button id="btn-new-ticket">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau ticket
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Ouvrir un ticket de support
          </DialogTitle>
          <DialogDescription>
            Décrivez votre problème en détail. Notre équipe vous répondra dans les plus brefs délais.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Sujet */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sujet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Décrivez brièvement votre problème…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Catégorie + Priorité */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="select-ticket-category">
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorité *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="select-ticket-priority">
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      id="textarea-ticket-description"
                      placeholder="Décrivez le problème en détail : étapes pour reproduire, comportement attendu, comportement observé…"
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} id="btn-submit-ticket">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  'Envoyer le ticket'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
