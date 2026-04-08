"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMonthLabel } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";

export function MonthlyTrendChart({
  data,
  className
}: {
  data: Array<{ month: string; income: number; expense: number; balance: number }>;
  className?: string;
}) {
  return (
    <div className={cn("h-64 w-full sm:h-80", className)}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="income" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#129474" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#129474" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expense" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `${value}€`} tick={{ fontSize: 12 }} width={44} />
          <Tooltip labelFormatter={formatMonthLabel} formatter={(value: number) => `${value.toFixed(2)} €`} />
          <Area type="monotone" dataKey="income" stroke="#129474" fill="url(#income)" strokeWidth={2} />
          <Area type="monotone" dataKey="expense" stroke="#ea580c" fill="url(#expense)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
