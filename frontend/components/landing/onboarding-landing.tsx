'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const requestSchema = z.object({
  school_name: z.string().min(3, 'Nom de l\'école requis.'),
  school_type: z.enum(['PRIMAIRE', 'COLLEGE', 'LYCEE', 'MIXTE']),
  school_city: z.string().optional(),
  school_phone: z.string().optional(),
  school_email: z.string().email('Email école invalide.'),
  admin_first_name: z.string().min(2, 'Prénom requis.'),
  admin_last_name: z.string().min(2, 'Nom requis.'),
  admin_email: z.string().email('Email admin invalide.'),
  admin_phone: z.string().optional(),
  password: z.string().min(8, '8 caractères minimum.'),
});

type RequestValues = z.infer<typeof requestSchema>;

type StatusPayload = {
  tracking_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  school_name: string;
  school_type: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  review_note: string;
  created_at: string;
  updated_at: string;
};

export function OnboardingLanding() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';

  const [trackingCode, setTrackingCode] = useState('');
  const [trackingEmail, setTrackingEmail] = useState('');
  const [statusResult, setStatusResult] = useState<StatusPayload | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      school_name: '',
      school_type: 'PRIMAIRE',
      school_city: '',
      school_phone: '',
      school_email: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_email: '',
      admin_phone: '',
      password: '',
    },
  });

  const onSubmit = async (values: RequestValues) => {
    try {
      const response = await fetch(`${API_BASE}/support/public/onboarding-requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Impossible d\'envoyer la demande.');
      }

      const code = payload?.data?.tracking_code as string | undefined;
      if (code) {
        setTrackingCode(code);
        setTrackingEmail(values.admin_email);
      }

      toast.success('Demande envoyée. Gardez bien votre code de suivi.');
      form.reset({ ...form.getValues(), password: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue.');
    }
  };

  const checkStatus = async () => {
    if (!trackingCode || !trackingEmail) {
      toast.error('Saisissez le code de suivi et l\'email admin.');
      return;
    }

    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const url = new URL(`${API_BASE}/support/public/onboarding-requests/status/`);
      url.searchParams.set('tracking_code', trackingCode);
      url.searchParams.set('admin_email', trackingEmail);

      const response = await fetch(url.toString(), { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Impossible de vérifier le statut.');
      }

      setStatusResult(payload?.data as StatusPayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue.');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-amber-50 px-4 py-8 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Eduguinee - Plateforme écoles
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ouvrez votre espace école en quelques minutes
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Soumettez votre établissement et votre compte admin école. Après validation par notre équipe,
            vous pourrez vous connecter à l'interface de gestion de votre école.
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Comment ça marche ?</CardTitle>
              <CardDescription>3 étapes simples pour démarrer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>1. Vous envoyez la demande d'ouverture (école + admin).</p>
              <p>2. Notre équipe vérifie et valide votre établissement.</p>
              <p>3. Dès approbation, vous vous connectez à l'interface école.</p>
              <Separator />
              <Link href={`/${locale}/login`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Vous avez déjà un compte ? Se connecter
              </Link>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demande d'ouverture d'école</CardTitle>
              <CardDescription>Ajoutez votre école et l'administrateur principal</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="school_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nom de l'école</FormLabel>
                          <FormControl>
                            <Input placeholder="Collège Horizon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="school_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PRIMAIRE">Primaire</SelectItem>
                              <SelectItem value="COLLEGE">Collège</SelectItem>
                              <SelectItem value="LYCEE">Lycée</SelectItem>
                              <SelectItem value="MIXTE">Mixte</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="school_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Conakry" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="school_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email école</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="ecole@domaine.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="school_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone école</FormLabel>
                          <FormControl>
                            <Input placeholder="+224..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom admin</FormLabel>
                          <FormControl>
                            <Input placeholder="Mamadou" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom admin</FormLabel>
                          <FormControl>
                            <Input placeholder="Diallo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email admin</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@ecole.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone admin</FormLabel>
                          <FormControl>
                            <Input placeholder="+224..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Mot de passe initial admin</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suivre ma demande</CardTitle>
              <CardDescription>Utilisez le code reçu après soumission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Code de suivi"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                />
                <Input
                  type="email"
                  placeholder="Email admin"
                  value={trackingEmail}
                  onChange={(e) => setTrackingEmail(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={checkStatus} disabled={checkingStatus}>
                {checkingStatus ? 'Vérification...' : 'Vérifier le statut'}
              </Button>

              {statusResult && (
                <Alert>
                  <AlertTitle>Statut: {statusResult.status}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      Ecole: {statusResult.school_name} ({statusResult.school_type})
                    </p>
                    <p>Admin: {statusResult.admin_first_name} {statusResult.admin_last_name}</p>
                    {statusResult.review_note ? <p>Note: {statusResult.review_note}</p> : null}
                    {statusResult.status === 'APPROVED' ? (
                      <Link href={`/${locale}/login`} className="inline-block font-medium text-primary underline-offset-4 hover:underline">
                        Demande approuvée - Aller à la connexion
                      </Link>
                    ) : (
                      <p>
                        Votre demande est en cours de traitement. Vous pourrez vous connecter après validation.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
