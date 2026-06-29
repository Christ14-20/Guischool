"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCheck,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Separator } from "@/components/ui/separator";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const requestSchema = z.object({
  school_name: z.string().min(3, "Nom de l'école requis."),
  school_type: z.enum(["PRIMAIRE", "COLLEGE", "LYCEE", "MIXTE"]),
  school_city: z.string().optional(),
  school_phone: z.string().optional(),
  school_email: z.string().email("Email école invalide."),
  admin_first_name: z.string().min(2, "Prénom requis."),
  admin_last_name: z.string().min(2, "Nom requis."),
  admin_email: z.string().email("Email admin invalide."),
  admin_phone: z.string().optional(),
  password: z.string().min(8, "8 caractères minimum."),
});

type RequestValues = z.infer<typeof requestSchema>;

type StatusPayload = {
  tracking_code: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  school_name: string;
  school_type: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  review_note: string;
  created_at: string;
  updated_at: string;
};

const TRUST_BADGES = [
  "Direction",
  "Scolarité",
  "Pédagogie",
  "Finances",
  "Parents",
];

const IMPACT_METRICS = [
  {
    value: "1 plateforme",
    label: "pour administrer toute l’école sans fragmentation",
  },
  {
    value: "3 étapes",
    label: "pour ouvrir l’établissement et activer son admin",
  },
  {
    value: "100% web",
    label: "pour accéder aux opérations depuis bureau et mobile",
  },
];

const FEATURE_CARDS = [
  {
    title: "Pilotage académique",
    description:
      "Années scolaires, classes, matières, emploi du temps, résultats et suivi des présences.",
    icon: GraduationCap,
  },
  {
    title: "Organisation interne",
    description:
      "Rôles, utilisateurs, personnels et structure administrative centralisés.",
    icon: Users,
  },
  {
    title: "Suivi financier",
    description:
      "Encaissements, relances, visibilité sur les paiements et lecture des flux.",
    icon: CreditCard,
  },
  {
    title: "Décisions fiables",
    description:
      "Données consolidées pour piloter l’établissement avec moins d’improvisation.",
    icon: BarChart3,
  },
];

const STEPS = [
  {
    step: "01",
    title: "Soumettre l’établissement",
    description:
      "Vous renseignez l’école et le premier compte administrateur dans une seule demande.",
  },
  {
    step: "02",
    title: "Validation et préparation",
    description:
      "Notre équipe vérifie les informations et prépare votre espace avant activation.",
  },
  {
    step: "03",
    title: "Connexion à votre interface",
    description:
      "Dès approbation, l’admin école peut se connecter et commencer la configuration.",
  },
];

const PLAN_PRESETS = [
  {
    name: "Starter",
    accent: "border-emerald-200 bg-white/90",
    description:
      "Pour les établissements qui veulent structurer rapidement leur gestion.",
    bullets: [
      "Base administrative",
      "Pilotage pédagogique",
      "Premier déploiement cadré",
    ],
  },
  {
    name: "Pro",
    accent:
      "border-primary/25 bg-[linear-gradient(180deg,rgba(22,163,74,0.08),rgba(255,255,255,0.96))]",
    description:
      "Pour les écoles qui veulent une exploitation quotidienne plus complète.",
    bullets: [
      "Suivi approfondi",
      "Plus de capacité",
      "Expérience d’exploitation renforcée",
    ],
  },
  {
    name: "Enterprise",
    accent:
      "border-amber-200 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.96))]",
    description:
      "Pour les structures qui veulent déployer à grande échelle et avec accompagnement.",
    bullets: ["Déploiement avancé", "Besoins étendus", "Support renforcé"],
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Nous avions trop de tableaux dispersés. La plateforme donne enfin une lecture claire de la scolarité et des opérations.",
    author: "Direction d’établissement",
  },
  {
    quote:
      "Le fait de créer l’école et le compte admin dans la même demande rend l’ouverture beaucoup plus propre et moins risquée.",
    author: "Responsable administratif",
  },
];

function getStatusLabel(status: StatusPayload["status"]) {
  if (status === "APPROVED") return "Approuvée";
  if (status === "REJECTED") return "Rejetée";
  return "En attente";
}

export function OnboardingLanding() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "fr";

  const [trackingCode, setTrackingCode] = useState("");
  const [trackingEmail, setTrackingEmail] = useState("");
  const [statusResult, setStatusResult] = useState<StatusPayload | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      school_name: "",
      school_type: "PRIMAIRE",
      school_city: "",
      school_phone: "",
      school_email: "",
      admin_first_name: "",
      admin_last_name: "",
      admin_email: "",
      admin_phone: "",
      password: "",
    },
  });

  const onSubmit = async (values: RequestValues) => {
    try {
      const response = await fetch(
        `${API_BASE}/support/public/onboarding-requests/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Impossible d'envoyer la demande.");
      }

      const code = payload?.data?.tracking_code as string | undefined;
      if (code) {
        setTrackingCode(code);
        setTrackingEmail(values.admin_email);
      }

      toast.success("Demande envoyée. Gardez bien votre code de suivi.");
      form.reset({ ...form.getValues(), password: "" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur inattendue.",
      );
    }
  };

  const checkStatus = async () => {
    if (!trackingCode || !trackingEmail) {
      toast.error("Saisissez le code de suivi et l'email admin.");
      return;
    }

    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const url = new URL(
        `${API_BASE}/support/public/onboarding-requests/status/`,
      );
      url.searchParams.set("tracking_code", trackingCode);
      url.searchParams.set("admin_email", trackingEmail);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Impossible de vérifier le statut.",
        );
      }

      setStatusResult(payload?.data as StatusPayload);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur inattendue.",
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4fbf5_0%,#faf7ee_38%,#fffdf8_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_34%)]" />

      <section className="relative px-4 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-full border border-white/60 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(16,24,40,0.06)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">
                Eduguinee
              </p>
              <p className="text-sm font-semibold">
                Plateforme de gestion scolaire
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#fonctionnalites"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Fonctionnalités
            </a>
            <a
              href="#offres"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Offres
            </a>
            <a
              href="#onboarding"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Ouvrir mon école
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/${locale}/login`}>
              <Button
                variant="outline"
                className="border-primary/20 bg-white/70"
              >
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10 pt-10 md:px-8 md:pb-16 md:pt-14">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Digitalisez et structurez votre établissement
              </p>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
                Une landing qui rassure.
                <br />
                Un onboarding qui active.
                <br />
                Une plateforme qui pilote l’école.
              </h1>

              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Eduguinee permet à une école de présenter son sérieux, demander
                l’ouverture de son espace, puis accéder à une interface complète
                pour la pédagogie, l’administration et la gestion. La première
                impression inspire confiance. L’activation, elle, reste
                contrôlée.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="#onboarding">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full px-6 shadow-lg shadow-primary/20"
                >
                  Demander l’ouverture de mon école
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#fonctionnalites">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-primary/20 bg-white/70 px-6"
                >
                  Voir la plateforme
                </Button>
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {IMPACT_METRICS.map((item) => (
                <div
                  key={item.value}
                  className="rounded-[1.6rem] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_10px_35px_rgba(16,24,40,0.06)] backdrop-blur-sm"
                >
                  <p className="text-xl font-extrabold text-primary">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="absolute -left-10 top-10 hidden h-28 w-28 rounded-full bg-emerald-200/60 blur-3xl md:block" />
            <div className="absolute -right-8 bottom-10 hidden h-28 w-28 rounded-full bg-amber-200/60 blur-3xl md:block" />

            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,250,244,0.92))] p-5 shadow-[0_30px_90px_rgba(16,24,40,0.10)] backdrop-blur-xl">
              <div className="rounded-[1.8rem] bg-[linear-gradient(135deg,#0f7a47_0%,#159a55_55%,#6cc08f_100%)] p-6 text-primary-foreground">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
                      Tableau de bord établissement
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      Votre école en vue d’ensemble
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                    Prêt après validation
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                      Scolarité
                    </p>
                    <p className="mt-2 text-lg font-bold">Classes et années</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                      Pédagogie
                    </p>
                    <p className="mt-2 text-lg font-bold">Présences et notes</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                      Finance
                    </p>
                    <p className="mt-2 text-lg font-bold">Paiements suivis</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-[1.6rem] border-border/60 bg-white/90 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Pourquoi cette page convertit mieux
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>
                        Elle présente clairement l’entité et sa valeur avant de
                        demander un engagement.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>
                        Elle rassure sur le parcours: demande, validation, puis
                        connexion à l’interface école.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>
                        Elle évite l’effet “simple formulaire” et installe une
                        perception produit plus solide.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[1.6rem] border-border/60 bg-white/90 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Parcours d’activation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between rounded-2xl bg-muted/70 px-3 py-2">
                      <span>Demande envoyée</span>
                      <CheckCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-muted/70 px-3 py-2">
                      <span>Validation Eduguinee</span>
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-muted/70 px-3 py-2">
                      <span>Connexion admin école</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 rounded-[1.8rem] border border-white/60 bg-white/75 px-5 py-4 shadow-[0_14px_40px_rgba(16,24,40,0.06)] backdrop-blur-xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Pensé pour
          </span>
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      <section id="fonctionnalites" className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              Ce que couvre Eduguinee
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Une plateforme conçue pour les opérations réelles d’un
              établissement.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Vous ne vendez pas juste un accès. Vous proposez un cadre de
              gestion complet, structuré et prêt à être activé une fois la
              demande validée.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURE_CARDS.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="rounded-[1.75rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,248,242,0.96))] shadow-[0_12px_36px_rgba(16,24,40,0.05)]"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-6">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="offres" className="px-4 py-8 md:px-8 md:py-14">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              Positionnement
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Une offre claire, lisible et crédible dès la landing.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Même si l’activation réelle passe par validation, la page peut
              déjà exprimer la gamme de déploiement que l’établissement
              retrouvera ensuite dans l’espace produit.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {TESTIMONIALS.map((item) => (
                <Card
                  key={item.quote}
                  className="rounded-[1.6rem] border-border/70 bg-white/90"
                >
                  <CardContent className="space-y-4 p-5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      “{item.quote}”
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {item.author}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_PRESETS.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-[1.7rem] border ${plan.accent} shadow-[0_12px_34px_rgba(16,24,40,0.05)]`}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {plan.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="flex gap-2 text-muted-foreground"
                    >
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-3">
          {STEPS.map((item) => (
            <Card
              key={item.step}
              className="rounded-[1.8rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,247,241,0.95))] shadow-[0_12px_36px_rgba(16,24,40,0.05)]"
            >
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Étape {item.step}
                </p>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="onboarding" className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="space-y-4">
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Ouvrir votre espace école
            </p>
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Soumettez votre établissement et suivez son activation.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Vous renseignez l’école et le premier administrateur. Après
              validation, votre espace est prêt et ce compte peut enfin accéder
              à l’interface de gestion de l’établissement.
            </p>

            <Card className="rounded-[1.8rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,244,0.95))]">
              <CardHeader>
                <CardTitle>Ce que vous obtenez après approbation</CardTitle>
                <CardDescription>
                  Un parcours simple mais contrôlé
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Une école créée et prête à être structurée dans la
                    plateforme.
                  </p>
                </div>
                <div className="flex gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>Un compte admin école prêt pour la première connexion.</p>
                </div>
                <div className="flex gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Une transition propre entre la landing publique et
                    l’interface privée.
                  </p>
                </div>
                <Separator />
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Vous avez déjà un compte ? Se connecter
                </Link>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <Card className="rounded-[1.9rem] border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(16,24,40,0.07)] backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Demande d&apos;ouverture d&apos;école</CardTitle>
                <CardDescription>
                  Ajoutez votre école et l&apos;administrateur principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="school_name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nom de l&apos;école</FormLabel>
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
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PRIMAIRE">
                                  Primaire
                                </SelectItem>
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
                              <Input
                                type="email"
                                placeholder="ecole@domaine.com"
                                {...field}
                              />
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
                              <Input
                                type="email"
                                placeholder="admin@ecole.com"
                                {...field}
                              />
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
                              <Input
                                type="password"
                                placeholder="********"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting
                        ? "Envoi en cours..."
                        : "Envoyer ma demande"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="rounded-[1.9rem] border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(16,24,40,0.07)] backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Suivre ma demande</CardTitle>
                <CardDescription>
                  Utilisez le code reçu après soumission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Code de suivi"
                    value={trackingCode}
                    onChange={(e) =>
                      setTrackingCode(e.target.value.toUpperCase())
                    }
                  />
                  <Input
                    type="email"
                    placeholder="Email admin"
                    value={trackingEmail}
                    onChange={(e) => setTrackingEmail(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={checkStatus}
                  disabled={checkingStatus}
                >
                  {checkingStatus ? "Vérification..." : "Vérifier le statut"}
                </Button>

                {statusResult && (
                  <Alert>
                    <AlertTitle>
                      Statut: {getStatusLabel(statusResult.status)}
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>
                        Ecole: {statusResult.school_name} (
                        {statusResult.school_type})
                      </p>
                      <p>
                        Admin: {statusResult.admin_first_name}{" "}
                        {statusResult.admin_last_name}
                      </p>
                      {statusResult.review_note ? (
                        <p>Note: {statusResult.review_note}</p>
                      ) : null}
                      {statusResult.status === "APPROVED" ? (
                        <Link
                          href={`/${locale}/login`}
                          className="inline-block font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Demande approuvée - Aller à la connexion
                        </Link>
                      ) : (
                        <p>
                          Votre demande est en cours de traitement. Vous pourrez
                          vous connecter après validation.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}
