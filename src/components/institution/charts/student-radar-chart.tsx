"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function StudentRadarChart({
  data,
  height = 280,
}: {
  data: { subject: string; marks: number; flag: string }[];
  height?: number;
}) {
  const points = useMemo(
    () => data.map((d) => ({ subject: d.subject, marks: d.marks })),
    [data],
  );

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>
        No subjects for this term.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={points}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
        <Radar
          name="Marks"
          dataKey="marks"
          stroke="#3730A3"
          fill="#3730A3"
          fillOpacity={0.35}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
