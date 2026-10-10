"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** School mean score (left axis, 0–100) and KCSE mean points (right axis, 1–12) per term. */
export function TermTrendChart({
  series,
  height = 260,
}: {
  series: { label: string; meanScore: number; meanPoints: number | null; grade: string | null; students: number }[];
  height?: number;
}) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>
        Upload results to see the term-by-term trend.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis yAxisId="score" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis yAxisId="points" orientation="right" domain={[1, 12]} tick={{ fontSize: 11, fill: "#6b7280" }} />
        <Tooltip
          contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
          formatter={(value, name, item) => {
            const p = item?.payload as { grade?: string | null; students?: number } | undefined;
            if (name === "Mean points") return [`${value}${p?.grade ? ` (${p.grade})` : ""}`, name];
            return [`${value}% · ${p?.students ?? 0} students`, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line yAxisId="score" type="monotone" dataKey="meanScore" name="Mean score" stroke="#FF9500" strokeWidth={2} dot={{ r: 3 }} />
        <Line
          yAxisId="points"
          type="monotone"
          dataKey="meanPoints"
          name="Mean points"
          stroke="#06B6D4"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
