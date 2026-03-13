"use client"

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { month: "Sept", paye: 12500000, impaye: 8500000 },
  { month: "Oct", paye: 18000000, impaye: 6000000 },
  { month: "Nov", paye: 22000000, impaye: 4500000 },
  { month: "Dec", paye: 28000000, impaye: 3200000 },
  { month: "Jan", paye: 32000000, impaye: 2800000 },
  { month: "Fev", paye: 35000000, impaye: 2200000 },
]

function formatGNF(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`
  }
  return `${(value / 1000).toFixed(0)}K`
}

export function PaymentChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Evolution des paiements</h3>
          <p className="text-xs text-muted-foreground">Annee scolaire 2024-2025</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Paye</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-chart-4" />
            <span className="text-xs text-muted-foreground">Impaye</span>
          </div>
        </div>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPaye" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImpaye" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.60 0.22 25)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.60 0.22 25)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
              tickFormatter={formatGNF}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.18 0.01 260)",
                border: "1px solid oklch(0.28 0.01 260)",
                borderRadius: "8px",
                color: "oklch(0.95 0 0)",
              }}
              formatter={(value: number) => [`${formatGNF(value)} GNF`, ""]}
            />
            <Area
              type="monotone"
              dataKey="paye"
              stroke="oklch(0.72 0.17 162)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPaye)"
            />
            <Area
              type="monotone"
              dataKey="impaye"
              stroke="oklch(0.60 0.22 25)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorImpaye)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
