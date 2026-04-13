"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  CreditCard,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts"

const schoolsData = [
  { name: "Conakry", value: 45, color: "#3b82f6" },
  { name: "Kindia", value: 20, color: "#22c55e" },
  { name: "Kankan", value: 15, color: "#f59e0b" },
  { name: "N'Zérékoré", value: 12, color: "#ef4444" },
  { name: "Autres", value: 8, color: "#8b5cf6" },
]

const revenueData = [
  { month: "Jan", revenue: 45000, subscriptions: 120 },
  { month: "Fév", revenue: 52000, subscriptions: 145 },
  { month: "Mar", revenue: 48000, subscriptions: 130 },
  { month: "Avr", revenue: 61000, subscriptions: 180 },
  { month: "Mai", revenue: 55000, subscriptions: 160 },
  { month: "Juin", revenue: 67000, subscriptions: 195 },
]

const activityData = [
  { day: "Lun", active: 420 },
  { day: "Mar", active: 380 },
  { day: "Mer", active: 450 },
  { day: "Jeu", active: 420 },
  { day: "Ven", active: 390 },
  { day: "Sam", active: 180 },
  { day: "Dim", active: 90 },
]

const subscriptionTrends = [
  { month: "Jan", basic: 80, premium: 40, enterprise: 10 },
  { month: "Fév", basic: 95, premium: 45, enterprise: 12 },
  { month: "Mar", basic: 88, premium: 50, enterprise: 15 },
  { month: "Avr", basic: 120, premium: 60, enterprise: 18 },
  { month: "Mai", basic: 110, premium: 55, enterprise: 20 },
  { month: "Juin", basic: 130, premium: 70, enterprise: 25 },
]

export default function AnalytiquesPage() {
  const [timeRange, setTimeRange] = useState("6m")

  const stats = [
    {
      title: "Total Écoles",
      value: "156",
      change: "+12%",
      trend: "up",
      icon: Building2,
      description: "vs mois dernier"
    },
    {
      title: "Total Utilisateurs",
      value: "12,847",
      change: "+8.5%",
      trend: "up",
      icon: Users,
      description: "vs mois dernier"
    },
    {
      title: "Revenus Mensuels",
      value: "67,000 €",
      change: "+23%",
      trend: "up",
      icon: DollarSign,
      description: "vs mois dernier"
    },
    {
      title: "Taux de Retention",
      value: "94.2%",
      change: "-1.2%",
      trend: "down",
      icon: Activity,
      description: "vs mois dernier"
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytiques</h1>
          <p className="text-muted-foreground">
           Suivez les performances de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
            <TabsList>
              <TabsTrigger value="7d">7 jours</TabsTrigger>
              <TabsTrigger value="30d">30 jours</TabsTrigger>
              <TabsTrigger value="6m">6 mois</TabsTrigger>
              <TabsTrigger value="1a">1 an</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant={stat.trend === "up" ? "default" : "destructive"} className="gap-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus & Abonnements</CardTitle>
            <CardDescription>Revenus mensuels et nombre d'abonnements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenus (€)" />
                  <Bar dataKey="subscriptions" fill="#22c55e" radius={[4, 4, 0, 0]} name="Abonnements" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des Écoles</CardTitle>
            <CardDescription>Par région</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={schoolsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {schoolsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {schoolsData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendance des Abonnements</CardTitle>
            <CardDescription>Par type de plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={subscriptionTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Area type="monotone" dataKey="basic" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Basic" />
                  <Area type="monotone" dataKey="premium" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Premium" />
                  <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Enterprise" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité Quotidienne</CardTitle>
            <CardDescription>Connexions par jour de la semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                    name="Connexions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Écoles</CardTitle>
          <CardDescription>Écoles avec le plus d'utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: " Lycée de Conakry", users: 1245, revenue: 8500, growth: "+12%" },
              { name: "College Excellence", users: 987, revenue: 7200, growth: "+8%" },
              { name: "École Internationale", users: 856, revenue: 6100, growth: "+15%" },
              { name: "Lycée Kindia", users: 654, revenue: 4800, growth: "+5%" },
              { name: "Institution Mamou", users: 543, revenue: 3900, growth: "+3%" },
            ].map((school, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-muted-foreground">{school.users} utilisateurs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{school.revenue} €/mois</p>
                  <Badge variant="default" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {school.growth}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
