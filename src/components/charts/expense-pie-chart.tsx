"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#129474", "#ea580c", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];

export function ExpensePieChart({
  data
}: {
  data: Array<{ categoryName: string; totalAmount: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="totalAmount" nameKey="categoryName" innerRadius={70} outerRadius={100} paddingAngle={4}>
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

