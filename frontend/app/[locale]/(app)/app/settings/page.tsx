"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Users,
  History,
} from "lucide-react";

import { AuditTable } from "@/components/settings/AuditTable";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FileUploader } from "@/components/shared/FileUploader";
import { StatusBadge } from "@/components/shared/StatusBadge";

import {
  getSchoolSettings,
  updateSchoolSettings,
  getSchoolUsers,
  inviteSchoolUser,
  changePassword,
  type SchoolUser,
} from "@/lib/api/settings";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const schoolSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères."),
  address: z.string().min(5, "L'adresse est requise."),
  phone: z.string().min(8, "Numéro de téléphone invalide."),
  email: z.string().email("Email invalide."),
  website: z.string().url("URL invalide.").optional().or(z.literal("")),
  logo: z.string().optional(),
});

const pedagogySchema = z.object({
  passing_threshold: z.coerce.number().min(0).max(20),
  max_repeats: z.coerce.number().min(0).max(5),
});

const inviteSchema = z.object({
  first_name: z.string().min(1, "Prénom requis."),
  last_name: z.string().min(1, "Nom requis."),
  email: z.string().email("Email invalide."),
  role: z.string().min(1, "Le rôle est requis."),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Mot de passe actuel requis."),
    new_password: z
      .string()
      .min(8, "Le nouveau mot de passe doit comporter au moins 8 caractères."),
    confirm_password: z.string().min(8, "Confirmation requise."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm_password"],
  });

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";
  const schoolId = session?.user?.tenantId ?? "";

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Forms
  const schoolForm = useForm<z.infer<typeof schoolSchema>>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      logo: "",
    },
  });

  const pedagogyForm = useForm<z.infer<typeof pedagogySchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pedagogySchema) as any,
    defaultValues: { passing_threshold: 10, max_repeats: 2 },
  });

  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      role: "TEACHER",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  // Load initial data
  useEffect(() => {
    if (!token || !schoolId) return;

    async function loadData() {
      setLoading(true);
      try {
        const settings = await getSchoolSettings(token, schoolId);
        schoolForm.reset({
          name: settings.name,
          address: settings.address ?? "",
          phone: settings.phone ?? "",
          email: settings.email ?? "",
          website: settings.website ?? "",
          logo: settings.logo ?? "",
        });
        pedagogyForm.reset({
          passing_threshold: settings.passing_threshold,
          max_repeats: settings.max_repeats,
        });
      } catch {
        toast.error("Erreur lors du chargement des paramètres.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token, schoolId, schoolForm, pedagogyForm]);

  const loadUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await getSchoolUsers(token);
      setUsers(data);
    } catch {
      toast.error("Impossible de charger l'équipe.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handlers
  const onUpdateSchool = async (values: z.infer<typeof schoolSchema>) => {
    try {
      await updateSchoolSettings(token, schoolId, values);
      toast.success("Informations de l'école mises à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const onUpdatePedagogy = async (values: z.infer<typeof pedagogySchema>) => {
    try {
      await updateSchoolSettings(token, schoolId, values);
      toast.success("Paramètres pédagogiques mis à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const onInviteUser = async (values: z.infer<typeof inviteSchema>) => {
    try {
      await inviteSchoolUser(token, values);
      toast.success("Invitation envoyée à " + values.email);
      inviteForm.reset();
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const onChangePassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await changePassword(token, {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success("Mot de passe modifié avec succès.");
      passwordForm.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const userColumns: DataTableColumn<SchoolUser>[] = [
    {
      key: "name",
      header: "Nom",
      accessor: (u) => `${u.first_name} ${u.last_name}`,
    },
    { key: "email", header: "Email", accessor: (u) => u.email },
    {
      key: "role",
      header: "Rôle",
      accessor: (u) => <Badge variant="outline">{u.role}</Badge>,
    },
    {
      key: "status",
      header: "Statut",
      accessor: (u) => <StatusBadge status={u.status} />,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Paramètres"
        description="Gérez les informations de votre établissement et les accès de votre équipe."
      />

      <Tabs defaultValue="school" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-max lg:grid-cols-4">
          <TabsTrigger value="school" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> École
          </TabsTrigger>
          <TabsTrigger value="pedagogy" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Pédagogie
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex items-center gap-2"
            onClick={loadUsers}
          >
            <Users className="h-4 w-4" /> Équipe
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Audit
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Sécurité
          </TabsTrigger>
        </TabsList>

        {/* ─── École ──────────────────────────────────────────────────────── */}
        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l&apos;établissement</CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur les bulletins et factures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...schoolForm}>
                <form
                  onSubmit={schoolForm.handleSubmit(onUpdateSchool)}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-8 lg:flex-row">
                    <div className="w-full lg:w-1/3">
                      <FormLabel className="mb-2 block">
                        Logo de l&apos;école
                      </FormLabel>
                      <FileUploader
                        onUploadComplete={({ fileUrl }) =>
                          schoolForm.setValue("logo", fileUrl ?? "")
                        }
                      />
                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        Format recommandé: Carré, PNG ou JPG.
                      </p>
                    </div>

                    <div className="flex-1 space-y-4">
                      <FormField
                        control={schoolForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l&apos;école *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={schoolForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email de contact *</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={schoolForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse physique *</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={schoolForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site Web</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={schoolForm.formState.isSubmitting}
                    >
                      {schoolForm.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Pédagogie ──────────────────────────────────────────────────── */}
        <TabsContent value="pedagogy">
          <Card>
            <CardHeader>
              <CardTitle>Règles et seuils pédagogiques</CardTitle>
              <CardDescription>
                Définissez les critères de réussite pour votre établissement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pedagogyForm}>
                <form
                  onSubmit={pedagogyForm.handleSubmit(onUpdatePedagogy)}
                  className="space-y-6"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={pedagogyForm.control}
                      name="passing_threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moyenne de passage (/20)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} />
                          </FormControl>
                          <FormDescription>
                            Note minimale requise pour être admis au niveau
                            supérieur.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={pedagogyForm.control}
                      name="max_repeats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre max de redoublements</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>
                            Nombre d&apos;années maximum qu&apos;un élève peut
                            passer dans le même niveau.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={pedagogyForm.formState.isSubmitting}
                    >
                      {pedagogyForm.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Mettre à jour les seuils
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Équipe ─────────────────────────────────────────────────────── */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs</CardTitle>
                <CardDescription>
                  Gérez les accès de votre personnel administratif et
                  enseignant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users}
                  rowKey={(u) => u.id}
                  loading={loadingUsers}
                  emptyTitle="Aucun utilisateur"
                  emptyDescription="Vous n'avez pas encore invité de membres dans votre équipe."
                />
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Inviter un membre
                </CardTitle>
                <CardDescription>
                  Un email sera envoyé pour activer le compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...inviteForm}>
                  <form
                    onSubmit={inviteForm.handleSubmit(onInviteUser)}
                    className="space-y-4"
                  >
                    <FormField
                      control={inviteForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email professionnel</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="nom@ecole.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rôle</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir un rôle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ADMIN_SCHOOL">
                                Administrateur École
                              </SelectItem>
                              <SelectItem value="SECRETARY">
                                Secrétaire
                              </SelectItem>
                              <SelectItem value="ACCOUNTANT">
                                Comptable
                              </SelectItem>
                              <SelectItem value="TEACHER">
                                Enseignant
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={inviteForm.formState.isSubmitting}
                    >
                      {inviteForm.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Envoyer l&apos;invitation
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Audit ─────────────────────────────────────────────────────── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Journal d&apos;audit</CardTitle>
              <CardDescription>
                Historique complet des actions effectuées par le personnel sur
                la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditTable token={token} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Sécurité ───────────────────────────────────────────────────── */}
        <TabsContent value="security">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Modifiez votre mot de passe pour sécuriser votre accès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="current_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator className="my-2" />
                  <FormField
                    control={passwordForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>8 caractères minimum.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={passwordForm.formState.isSubmitting}
                    >
                      {passwordForm.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="mr-2 h-4 w-4" />
                      )}
                      Mettre à jour le mot de passe
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
