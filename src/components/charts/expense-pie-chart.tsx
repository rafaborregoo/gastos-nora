"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

const COLORS = ["#129474", "#ea580c", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];

export function ExpensePieChart({
  data,
  className
}: {
  data: Array<{ categoryName: string; totalAmount: number }>;
  className?: string;
}) {
  return (
    <div className={cn("h-60 w-full sm:h-72", className)}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="totalAmount" nameKey="categoryName" innerRadius={64} outerRadius={92} paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell key={entry.categoryName} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
