'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caracteres.'),
  slug: z
    .string()
    .min(3, 'Le slug doit contenir au moins 3 caracteres.')
    .regex(/^[a-z0-9-]+$/, 'Le slug doit contenir uniquement a-z, 0-9 et -.'),
  codeMinedu: z
    .string()
    .min(3, 'Le code MINEDU est requis.')
    .regex(/^[A-Z0-9-]{3,20}$/i, 'Format code MINEDU invalide.'),
  type: z.string().min(1, 'Le type est requis.'),
  location: z.string().min(2, 'La localisation est requise.'),
  plan: z.string().min(1, 'Le plan est requis.'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const TAKEN_SLUGS = new Set(['horizon', 'la-reussite', 'college-nongo']);

export default function SuperadminNewSchoolPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: '',
      slug: '',
      codeMinedu: '',
      type: '',
      location: '',
      plan: '',
      description: '',
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const checkSlugAvailability = async (slug: string) => {
    setCheckingSlug(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${base}/superadmin/schools/?search=${encodeURIComponent(slug)}`);
      if (response.ok) {
        const json = await response.json();
        const payload = json?.data ?? json;
        const items = payload?.results ?? payload?.items ?? payload ?? [];
        if (Array.isArray(items)) {
          return !items.some((item: any) => String(item.slug).toLowerCase() === slug.toLowerCase());
        }
      }
      return !TAKEN_SLUGS.has(slug.toLowerCase());
    } catch {
      return !TAKEN_SLUGS.has(slug.toLowerCase());
    } finally {
      setCheckingSlug(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);

    try {
      const isAvailable = await checkSlugAvailability(values.slug);
      if (!isAvailable) {
        form.setError('slug', { message: 'Ce slug est deja utilise.' });
        return;
      }

      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${base}/superadmin/schools/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          slug: values.slug,
          code_minedu: values.codeMinedu,
          type: values.type,
          location: values.location,
          plan: values.plan,
          description: values.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Creation impossible pour le moment.');
      }

      const json = await response.json();
      const payload = json?.data ?? json;
      const createdId = payload?.id;

      toast.success('Ecole creee avec succes.');
      router.push(
        createdId ? `/${locale}/superadmin/schools/${createdId}` : `/${locale}/superadmin/schools`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inattendue.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Nouvelle ecole"
        description="Creation d'un nouvel etablissement sur la plateforme Eduguinee."
        actions={
          <Button variant="outline" onClick={() => router.push(`/${locale}/superadmin/schools`)}>
            Retour a la liste
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations de l'ecole</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!slugManuallyEdited) {
                            form.setValue('slug', toSlug(event.target.value), { shouldValidate: true });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) => {
                          setSlugManuallyEdited(true);
                          field.onChange(toSlug(event.target.value));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {checkingSlug ? 'Verification en cours...' : 'URL publique de l\'ecole.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codeMinedu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code MINEDU</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'etablissement</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRIMAIRE">Primaire</SelectItem>
                        <SelectItem value="COLLEGE">College</SelectItem>
                        <SelectItem value="LYCEE">Lycee</SelectItem>
                        <SelectItem value="MIXTE">Mixte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STARTER">Starter</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset(defaultValues)}>
                  Reinitialiser
                </Button>
                <Button type="submit" disabled={submitting || checkingSlug}>
                  {submitting ? 'Creation...' : 'Creer l\'ecole'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
