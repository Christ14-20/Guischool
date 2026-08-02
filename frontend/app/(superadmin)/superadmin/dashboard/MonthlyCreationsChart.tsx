"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type MonthlyCreation = { month: string; count: number };

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  const idx = Number(month) - 1;
  return `${MONTH_LABELS[idx]} ${year.slice(2)}`;
}

type TooltipProps = {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const count = payload[0].value ?? 0;
  return (
    <div className="px-3 py-2 rounded-lg text-xs bg-card border border-line shadow-[var(--shadow)]">
      <div className="text-text-faint mb-0.5">{formatMonth(label)}</div>
      <div className="text-text font-semibold tabular-nums">
        {count} école{count !== 1 ? "s" : ""} créée{count !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function MonthlyCreationsChart({ data }: { data: MonthlyCreation[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fill: "var(--text-faint)", fontSize: 10 }}
          axisLine={{ stroke: "var(--line)" }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
        <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
