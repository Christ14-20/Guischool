import { StatCard } from "@/components/dashboard/stat-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PaymentChart } from "@/components/dashboard/payment-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { UnpaidList } from "@/components/dashboard/unpaid-list"
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  TrendingUp 
} from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, voici un apercu de votre etablissement
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total eleves"
          value="1,247"
          subtitle="Inscrits cette annee"
          icon={Users}
          trend={{ value: 12, label: "vs annee derniere" }}
          variant="success"
        />
        <StatCard
          title="Classes actives"
          value="42"
          subtitle="De la 6eme a la Terminale"
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title="Recettes du mois"
          value="35.2M GNF"
          subtitle="Fevrier 2025"
          icon={CreditCard}
          trend={{ value: 8.5, label: "vs mois dernier" }}
          variant="success"
        />
        <StatCard
          title="Taux de recouvrement"
          value="78%"
          subtitle="Objectif: 85%"
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Charts */}
        <div className="space-y-6 lg:col-span-2">
          <PaymentChart />
          <QuickActions />
        </div>

        {/* Right column - Activity & Lists */}
        <div className="space-y-6">
          <RecentActivity />
          <UnpaidList />
        </div>
      </div>
    </div>
  )
}
