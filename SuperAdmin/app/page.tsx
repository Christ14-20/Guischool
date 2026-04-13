import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Headphones, 
  Settings,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Shield className="h-9 w-9 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">EduGuinée</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Plateforme SaaS de gestion scolaire pour laGuinée
        </p>
      </div>

      <Link href="/super-admin" className="group">
        <div className="relative p-8 rounded-2xl border bg-card/50 backdrop-blur transition-all duration-300 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 max-w-xl w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Super Admin</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Interface d'administration centrale pour gérer les écoles, les abonnements et la plateforme.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <BarChart3 className="mr-1 h-3 w-3" /> Analytiques
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <Building2 className="mr-1 h-3 w-3" /> Écoles
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <CreditCard className="mr-1 h-3 w-3" /> Abonnements
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <Headphones className="mr-1 h-3 w-3" /> Support
            </span>
          </div>
          <div className="flex items-center text-primary font-medium">
            Accéder au tableau de bord <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </div>
  )
}
