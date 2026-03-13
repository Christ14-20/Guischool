"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Eye, EyeOff, Loader2, Sun, Moon } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate login - in production, this would call an API
    setTimeout(() => {
      if (email && password) {
        // For demo purposes, accept any credentials
        router.push("/")
      } else {
        setError("Veuillez entrer votre email et mot de passe")
        setIsLoading(false)
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.12_0.01_260)] via-[oklch(0.14_0.01_260)] to-[oklch(0.10_0.01_260)] p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-[oklch(0.65_0_0)] hover:text-[oklch(0.95_0_0)]"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[oklch(0.72_0.17_162)]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[oklch(0.65_0.18_250)]/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-[oklch(0.16_0.01_260)]/80 backdrop-blur border-[oklch(0.28_0.01_260)]">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[oklch(0.72_0.17_162)] flex items-center justify-center shadow-lg shadow-[oklch(0.72_0.17_162)]/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-[oklch(0.95_0_0)]">
              EduGuinee
            </CardTitle>
            <CardDescription className="text-[oklch(0.65_0_0)] mt-2">
              Plateforme de gestion scolaire
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-[oklch(0.55_0.22_25)]/10 border border-[oklch(0.55_0.22_25)]/30 text-[oklch(0.55_0.22_25)] text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="email" className="text-[oklch(0.95_0_0)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ecole.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-[oklch(0.12_0.01_260)] border-[oklch(0.28_0.01_260)] text-[oklch(0.95_0_0)] placeholder:text-[oklch(0.40_0_0)] focus:border-[oklch(0.72_0.17_162)] focus:ring-[oklch(0.72_0.17_162)]/20"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-[oklch(0.95_0_0)]">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 bg-[oklch(0.12_0.01_260)] border-[oklch(0.28_0.01_260)] text-[oklch(0.95_0_0)] placeholder:text-[oklch(0.40_0_0)] focus:border-[oklch(0.72_0.17_162)] focus:ring-[oklch(0.72_0.17_162)]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0_0)] hover:text-[oklch(0.65_0_0)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[oklch(0.28_0.01_260)] bg-[oklch(0.12_0.01_260)] text-[oklch(0.72_0.17_162)] focus:ring-[oklch(0.72_0.17_162)]/20"
                />
                <span className="text-[oklch(0.65_0_0)]">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-[oklch(0.72_0.17_162)] hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[oklch(0.72_0.17_162)] hover:bg-[oklch(0.72_0.17_162)]/90 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[oklch(0.28_0.01_260)]">
            <p className="text-center text-sm text-[oklch(0.40_0_0)]">
              Besoin d'aide ?{" "}
              <a href="#" className="text-[oklch(0.72_0.17_162)] hover:underline">
                Contacter le support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-[oklch(0.40_0_0)]">
          © 2024 EduGuinee. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}