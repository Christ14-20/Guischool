import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: "default" | "success" | "warning" | "info"
}

const variantStyles = {
  default: "border-border/50 group-hover:border-primary/40",
  success: "border-success/20 group-hover:border-success/50 hover:shadow-success/10",
  warning: "border-warning/20 group-hover:border-warning/50 hover:shadow-warning/10",
  info: "border-info/20 group-hover:border-info/50 hover:shadow-info/10",
}

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  success: "bg-primary/10 text-primary",
  warning: "bg-chart-3/10 text-chart-3",
  info: "bg-chart-2/10 text-chart-2",
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default" 
}: StatCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl bg-card/40 backdrop-blur-xl will-change-transform z-10",
      variantStyles[variant]
    )}>
      {/* Soft gradient highlight on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative z-20 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-primary" : "text-destructive"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
          iconVariantStyles[variant]
        )}>
          <Icon className="h-5 w-5 drop-shadow-md" />
        </div>
      </div>
    </div>
  )
}
