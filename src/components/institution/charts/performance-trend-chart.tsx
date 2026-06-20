"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PALETTE = ["#3730A3", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6"];

interface SeriesPoint {
  term: string;
  [subject: string]: string | number;
}

export function PerformanceTrendChart({
  points,
  height = 280,
}: {
  points: { term: string; termNum: number; year: number; subject: string; average: number }[];
  height?: number;
}) {
  const { data, subjects } = useMemo(() => {
    const termMap = new Map<string, SeriesPoint>();
    for (const p of points) {
      const key = p.term;
      if (!termMap.has(key)) termMap.set(key, { term: key });
      (termMap.get(key) as Record<string, string | number>)[p.subject] = p.average;
    }
    const subjSet = new Set<string>();
    for (const p of points) subjSet.add(p.subject);
    return {
      data: Array.from(termMap.values()).sort((a, b) => a.term.localeCompare(b.term)),
      subjects: Array.from(subjSet),
    };
  }, [points]);

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
        Upload some results to see the trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="term" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {subjects.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
