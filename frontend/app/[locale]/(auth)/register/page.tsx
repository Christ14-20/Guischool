"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import axios from "axios"

const registerSchema = z.object({
  adminName: z.string().min(2, "Nom trop court"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  confirmPassword: z.string().min(8, "8 caractères minimum"),
  schoolName: z.string().min(3, "Nom d'établissement requis"),
  mineduCode: z.string().min(1, "Code MINEDU requis"),
  schoolType: z.string().min(1, "Type requis"),
  location: z.string().min(3, "Localisation requise"),
  plan: z.string().min(1, "Plan requis"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

function RegisterPageInner() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const t = useTranslations("Register")
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitLoading, setSubmitLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const steps = [
    { id: "1", name: t("step1") },
    { id: "2", name: t("step2") },
    { id: "3", name: t("step3") },
  ]

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      adminName: "", email: "", password: "", confirmPassword: "",
      schoolName: "", mineduCode: "", schoolType: "", location: "", plan: "",
    },
    mode: "onChange",
  })

  if (!token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 bg-muted/40">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-center text-destructive">{t("accessDenied")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{t("invitationRequired")}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href={`/${locale}/login`}>
              <Button type="button" variant="outline">{t("backToLogin")}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  type FieldName = keyof RegisterFormValues

  const next = async () => {
    let fieldsToValidate: FieldName[] = []
    if (currentStep === 0) {
      fieldsToValidate = ['adminName', 'email', 'password', 'confirmPassword']
    } else if (currentStep === 1) {
      fieldsToValidate = ['schoolName', 'mineduCode', 'schoolType', 'location']
    }
    const isStepValid = await form.trigger(fieldsToValidate)
    if (isStepValid) setCurrentStep(s => s + 1)
  }

  const prev = () => { if (currentStep > 0) setCurrentStep(s => s - 1) }

  async function onSubmit(data: RegisterFormValues) {
    setSubmitLoading(true)
    setErrorMessage(null)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      await axios.post(`${API_URL}/auth/register/`, { ...data, invitation_token: token })
      router.push(`/${locale}/login?registered=true`)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setErrorMessage(err.response?.data?.detail || "Erreur lors de la création du compte.")
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-xl shadow-lg border-primary/20 relative">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">ED</span>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-center">{t("title")}</CardTitle>
          <CardDescription className="text-center">{t("description")}</CardDescription>

          {/* Stepper */}
          <div className="mt-4 flex text-sm font-medium">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex-1 flex flex-col justify-center items-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 z-10 bg-background ${idx <= currentStep ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                  {idx + 1}
                </div>
                <div className="text-xs text-center text-muted-foreground">{step.name}</div>
                {idx !== steps.length - 1 && (
                  <div className={`absolute top-4 left-[50%] h-[2px] w-full ${idx < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {currentStep === 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField control={form.control} name="adminName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom et Prénom</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse Email Pro</FormLabel>
                      <FormControl><Input placeholder="admin@ecole.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField control={form.control} name="schoolName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'établissement</FormLabel>
                      <FormControl><Input placeholder="Groupe Scolaire Excellence" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mineduCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code Agrément MINEDU</FormLabel>
                      <FormControl><Input placeholder="AG-XYZ-2024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="schoolType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PUBLIC">Public</SelectItem>
                            <SelectItem value="PRIVE">Privé</SelectItem>
                            <SelectItem value="INTERNATIONAL">International</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville/Quartier</FormLabel>
                        <FormControl><Input placeholder="Conakry, Kaloum" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField control={form.control} name="plan" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sélection du Plan d'Abonnement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-16">
                            <SelectValue placeholder="Choisir un forfait..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STARTER">
                            <div className="font-semibold text-primary">Starter</div>
                            <div className="text-xs text-muted-foreground">&lt; 300 élèves</div>
                          </SelectItem>
                          <SelectItem value="PRO">
                            <div className="font-semibold text-primary">Pro</div>
                            <div className="text-xs text-muted-foreground">300 – 1000 élèves</div>
                          </SelectItem>
                          <SelectItem value="ENTERPRISE">
                            <div className="font-semibold text-primary">Enterprise</div>
                            <div className="text-xs text-muted-foreground">&gt; 1000 élèves</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between items-center w-full">
          <Button type="button" variant="outline" disabled={currentStep === 0 || isSubmitLoading} onClick={prev}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("previous")}
          </Button>
          <div className="flex gap-2">
            <Link href={`/${locale}/login`}>
              <Button type="button" variant="ghost" disabled={isSubmitLoading}>{t("back")}</Button>
            </Link>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={next}>
                {t("next")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={form.handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90" disabled={isSubmitLoading}>
                {isSubmitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("submit")}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    }>
      <RegisterPageInner />
    </Suspense>
  )
}
