'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { FileUploader } from '@/components/shared/FileUploader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type ClassItem, type SchoolYearItem, getClasses, getSchoolYears } from '@/lib/api/pedagogy';
import { createStudent, getStudents, type StudentItem } from '@/lib/api/students';

const phoneRegex = /^\+224[0-9]{9}$/;

const schema = z.object({
  last_name: z.string().min(1, 'Le nom est requis.'),
  first_name: z.string().min(1, 'Le prénom est requis.'),
  birth_date: z
    .string()
    .min(1, 'La date de naissance est requise.')
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'La date de naissance ne peut pas être dans le futur.'),
  birth_place: z.string().optional(),
  gender: z.enum(['M', 'F'], { error: 'Le sexe est requis.' } as any),
  photo_url: z.string().optional(),
  guardian_name: z.string().min(1, 'Le nom complet du tuteur est requis.'),
  guardian_relationship: z.enum(['PERE', 'MERE', 'TUTEUR', 'AUTRE'], {
    error: 'Le lien de parenté est requis.',
  } as any),
  guardian_phone: z.string().regex(phoneRegex, 'Format requis: +224XXXXXXXXX'),
  guardian_email: z.string().email('Email invalide.').optional().or(z.literal('')),
  school_year: z.string().min(1, "L'année scolaire est requise."),
  classe: z.string().min(1, 'La classe est requise.'),
  registration_type: z.enum(['NOUVELLE', 'REINSCRIPTION', 'TRANSFERT_ENTRANT'], {
    error: "Le type d'inscription est requis.",
  } as any),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function NewStudentPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const tenantId = session?.user?.tenantId ?? '';

  const [years, setYears] = useState<SchoolYearItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [showClassFullAlert, setShowClassFullAlert] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      last_name: '',
      first_name: '',
      birth_date: '',
      birth_place: '',
      gender: 'M',
      photo_url: '',
      guardian_name: '',
      guardian_relationship: 'PERE',
      guardian_phone: '+224',
      guardian_email: '',
      school_year: '',
      classe: '',
      registration_type: 'NOUVELLE',
      observations: '',
    },
  });

  const selectedYear = form.watch('school_year');
  const selectedClass = form.watch('classe');
  const photoUrl = form.watch('photo_url');

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    Promise.all([getSchoolYears(token), getClasses(token)])
      .then(([yearsRes, classesRes]) => {
        if (!mounted) return;
        setYears(yearsRes.results);
        setClasses(classesRes.results);

        const defaultYear = yearsRes.results.find((year) =>
          ['OUVERTE', 'EN_COURS'].includes(year.status)
        );
        if (defaultYear) {
          form.setValue('school_year', String(defaultYear.id));
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Impossible de charger les données.');
      });

    return () => {
      mounted = false;
    };
  }, [token, form]);

  const availableYears = useMemo(
    () => years.filter((year) => ['OUVERTE', 'EN_COURS'].includes(year.status)),
    [years]
  );

  const availableClasses = useMemo(
    () =>
      classes
        .filter((classe) => String(classe.school_year) === selectedYear)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [classes, selectedYear]
  );

  const selectedClassInfo = useMemo(
    () => classes.find((classe) => String(classe.id) === selectedClass),
    [classes, selectedClass]
  );

  const isClassFull =
    !!selectedClassInfo && selectedClassInfo.current_count >= selectedClassInfo.capacity;

  const checkDuplicate = async (values: FormValues) => {
    const query = `${values.last_name} ${values.first_name}`.trim();
    const result = await getStudents(token, { search: query, page: 1, page_size: 50 });

    const duplicate = result.results.some((student: StudentItem) => {
      const sameName =
        normalize(student.last_name) === normalize(values.last_name) &&
        normalize(student.first_name) === normalize(values.first_name);
      const sameBirthDate = student.birth_date ? student.birth_date === values.birth_date : false;
      return sameName && sameBirthDate;
    });

    return duplicate;
  };

  const doCreateStudent = async (values: FormValues) => {
    const duplicateExists = await checkDuplicate(values);
    if (duplicateExists) {
      toast.error('Doublon détecté : un élève avec le même nom et la même date de naissance existe déjà.');
      return;
    }

    const payload = {
      tenant: tenantId,
      nom: values.last_name,
      prenom: values.first_name,
      date_naissance: values.birth_date,
      lieu_naissance: values.birth_place || undefined,
      sexe: values.gender,
      photo: values.photo_url || undefined,
      tuteur_nom: values.guardian_name,
      tuteur_lien: values.guardian_relationship,
      tuteur_telephone: values.guardian_phone,
      tuteur_email: values.guardian_email || undefined,
      annee_inscription: Number(values.school_year),
      classe_actuelle: Number(values.classe),
      contact_provisoire: false,
    } as const;

    const created = await createStudent(token, payload);
    toast.success('Élève inscrit avec succès.');
    const createdId = String(created?.id ?? '');
    router.push(createdId ? `/${locale}/app/students/${createdId}` : `/${locale}/app/students`);
  };

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error('Session invalide. Veuillez vous reconnecter.');
      return;
    }
    if (!tenantId) {
      toast.error('Tenant introuvable dans la session. Reconnectez-vous.');
      return;
    }

    try {
      if (isClassFull) {
        setPendingValues(values);
        setShowClassFullAlert(true);
        return;
      }
      await doCreateStudent(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    }
  };

  const onConfirmClassFull = async () => {
    if (!pendingValues) return;
    setShowClassFullAlert(false);
    try {
      await doCreateStudent(pendingValues);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    } finally {
      setPendingValues(null);
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Inscription d'un élève"
        description="Ajoutez un nouvel élève avec ses informations personnelles, tuteur et scolarité."
        actions={
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/app/students`)}>
            Retour à la liste
          </Button>
        }
      />

      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Section 1 — Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom(s) *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Sexe *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex items-center gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="M" id="gender-m" />
                          <label htmlFor="gender-m" className="text-sm">Masculin</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="F" id="gender-f" />
                          <label htmlFor="gender-f" className="text-sm">Féminin</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormLabel>Photo (JPG/PNG, max 2 Mo)</FormLabel>
                <FileUploader
                  accept="image/png,image/jpeg"
                  maxSize={2 * 1024 * 1024}
                  onUploadComplete={({ fileUrl }) => {
                    form.setValue('photo_url', fileUrl ?? '', { shouldValidate: true });
                    toast.success('Photo téléversée.');
                  }}
                />
                {photoUrl ? <p className="mt-2 text-xs text-muted-foreground">Photo liée au dossier.</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 2 — Tuteur légal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="guardian_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet tuteur *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guardian_relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lien de parenté *</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? 'PERE')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERE">Père</SelectItem>
                        <SelectItem value="MERE">Mère</SelectItem>
                        <SelectItem value="TUTEUR">Tuteur</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guardian_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl>
                      <Input placeholder="+224..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guardian_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 3 — Scolarité</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="school_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année scolaire *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value ?? '');
                        form.setValue('classe', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une année" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year.id} value={String(year.id)}>
                            {year.label} ({year.status})
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
                name="classe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe *</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? '')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une classe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableClasses.map((classe) => (
                          <SelectItem key={classe.id} value={String(classe.id)}>
                            {classe.name} ({classe.current_count}/{classe.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClassInfo ? (
                      <p className="text-xs text-muted-foreground">
                        Capacité: {selectedClassInfo.current_count}/{selectedClassInfo.capacity}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registration_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'inscription *</FormLabel>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value ?? 'NOUVELLE')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NOUVELLE">Nouvelle</SelectItem>
                        <SelectItem value="REINSCRIPTION">Réinscription</SelectItem>
                        <SelectItem value="TRANSFERT_ENTRANT">Transfert entrant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observations</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Réinitialiser
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showClassFullAlert} onOpenChange={setShowClassFullAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Classe pleine
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette classe a atteint sa capacité maximale. Voulez-vous confirmer l'inscription malgré tout ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setPendingValues(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmClassFull}>Confirmer l'inscription</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
