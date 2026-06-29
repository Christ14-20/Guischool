"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

const loginSchema = z.object({
  email: z
    .string()
    .email("Adresse email invalide")
    .nonempty("L'email est requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Récupère le chemin de redirection basé sur le rôle de l'utilisateur
 */
function getRedirectPath(role: string | undefined, locale: string): string {
  if (!role) return `/${locale}/app/dashboard`;

  switch (role) {
    case "SUPER_ADMIN":
      return `/${locale}/superadmin/dashboard`;
    case "SUPPORT_STAFF":
      return `/${locale}/superadmin/onboarding`;
    case "ADMIN_SCHOOL":
    case "TEACHER":
    case "STUDENT":
    case "PARENT":
    default:
      return `/${locale}/app/dashboard`;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "fr";
  const t = useTranslations("Auth");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isSubmitLoading, setSubmitLoading] = useState(false);
  useSession();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    setSubmitLoading(true);
    setErrorStatus(null);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.error) {
        if (res.error === "AccessDenied" || res.status === 403) {
          setErrorStatus(403);
        } else {
          setErrorStatus(401);
        }
      } else if (res?.ok) {
        // Petite pause pour permettre à la session de se mettre à jour
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Récupérer la session mise à jour pour accéder au rôle
        const sessionResponse = await fetch("/api/auth/session");
        const updatedSession = await sessionResponse.json();

        // Rediriger selon le rôle
        const redirectPath = getRedirectPath(
          updatedSession?.user?.role,
          locale,
        );
        router.push(redirectPath);
      }
    } catch {
      setErrorStatus(500);
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl font-bold text-primary">ED</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Eduguinée 3.0
          </CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nom@ecole.edu.gn"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("password")}</FormLabel>
                      <Link
                        href={`/${locale}/forgot-password`}
                        className="text-sm font-medium text-primary hover:underline"
                        tabIndex={-1}
                      >
                        {t("forgotPassword")}
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorStatus === 401 && (
                <Alert variant="destructive">
                  <AlertDescription>{t("error401")}</AlertDescription>
                </Alert>
              )}
              {errorStatus === 403 && (
                <Alert variant="destructive">
                  <AlertDescription>{t("error403")}</AlertDescription>
                </Alert>
              )}
              {errorStatus === 500 && (
                <Alert variant="destructive">
                  <AlertDescription>{t("error500")}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitLoading}
              >
                {isSubmitLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  t("submit")
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Eduguinée — Propulsé par Kante
        </CardFooter>
      </Card>
    </div>
  );
}
