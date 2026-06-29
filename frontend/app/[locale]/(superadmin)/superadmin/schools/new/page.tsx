"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSchool, getPlans, getSchools } from "@/lib/api/superadmin";

const schema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caracteres."),
  slug: z
    .string()
    .min(3, "Le slug doit contenir au moins 3 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Le slug doit contenir uniquement a-z, 0-9 et -."),
  codeMinedu: z
    .string()
    .min(3, "Le code MINEDU est requis.")
    .regex(/^[A-Z0-9-]{3,20}$/i, "Format code MINEDU invalide."),
  type: z.string().min(1, "Le type est requis."),
  school_type: z.string().min(1, "Le type d'etablissement est requis."),
  location: z.string().min(2, "La localisation est requise."),
  plan: z.string().min(1, "Le plan est requis."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const TAKEN_SLUGS = new Set(["horizon", "la-reussite", "college-nongo"]);

export default function SuperadminNewSchoolPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const locale = (params?.locale as string) ?? "fr";
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<Array<{ id: number; name: string }>>([]);

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: "",
      slug: "",
      codeMinedu: "",
      type: "",
      school_type: "PRIV",
      location: "",
      plan: "",
      description: "",
    }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) return;

    let isMounted = true;

    getPlans(accessToken)
      .then((items) => {
        if (!isMounted) return;
        setPlans(
          items.map((item) => ({
            id: item.id,
            name: item.name.charAt(0) + item.name.slice(1).toLowerCase(),
          })),
        );
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de charger les plans.";
        toast.error(message);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const checkSlugAvailability = async (slug: string) => {
    const accessToken = session?.accessToken;
    if (!accessToken) return false;

    setCheckingSlug(true);
    try {
      const result = await getSchools(accessToken, {
        page: 1,
        page_size: 10,
        search: slug,
      });
      const items = result.results;
      if (Array.isArray(items)) {
        return !items.some(
          (item: Record<string, unknown>) =>
            String(item.slug).toLowerCase() === slug.toLowerCase(),
        );
      }
      return !TAKEN_SLUGS.has(slug.toLowerCase());
    } catch {
      return !TAKEN_SLUGS.has(slug.toLowerCase());
    } finally {
      setCheckingSlug(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      toast.error("Session invalide. Veuillez vous reconnecter.");
      return;
    }

    setSubmitting(true);

    try {
      const isAvailable = await checkSlugAvailability(values.slug);
      if (!isAvailable) {
        form.setError("slug", { message: "Ce slug est deja utilise." });
        return;
      }

      const payload = (await createSchool(accessToken, {
        name: values.name,
        slug: values.slug,
        code_minedu: values.codeMinedu,
        type: values.type,
        school_type: values.school_type,
        address: values.location,
        plan: Number(values.plan),
        settings: values.description ? { description: values.description } : {},
      })) as Record<string, unknown>;
      const createdId = payload?.id;

      toast.success("Ecole creee avec succes.");
      router.push(
        createdId
          ? `/${locale}/superadmin/schools/${createdId}`
          : `/${locale}/superadmin/schools`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inattendue.";
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
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/superadmin/schools`)}
          >
            Retour a la liste
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations de l&apos;ecole</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit(onSubmit)}
            >
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
                            form.setValue("slug", toSlug(event.target.value), {
                              shouldValidate: true,
                            });
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
                      {checkingSlug
                        ? "Verification en cours..."
                        : "URL publique de l'ecole."}
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
                    <FormLabel>Type d&apos;etablissement</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectionner" />
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
                name="school_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de gestion</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PUB">
                          Publique (sans paie)
                        </SelectItem>
                        <SelectItem value="PRIV">Privée</SelectItem>
                        <SelectItem value="FRAR">FRAR</SelectItem>
                        <SelectItem value="ETP">
                          École Technique Publique
                        </SelectItem>
                        <SelectItem value="ETPR">
                          École Technique Privée
                        </SelectItem>
                        <SelectItem value="INT">Internationale</SelectItem>
                        <SelectItem value="COM">Communautaire</SelectItem>
                        <SelectItem value="INC">Indépendante</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Les écoles publiques n&apos;ont pas accès au module paie
                      (CNSS standard).
                    </FormDescription>
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
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.name}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset(defaultValues)}
                >
                  Reinitialiser
                </Button>
                <Button type="submit" disabled={submitting || checkingSlug}>
                  {submitting ? "Creation..." : "Creer l'ecole"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
