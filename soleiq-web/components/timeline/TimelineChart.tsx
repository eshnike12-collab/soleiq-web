"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function TimelineChart({
  data,
}: {
  data: { label: string; volume: number }[];
}) {
  return (
    <div className="h-48 w-full rounded-2xl border border-warmGray-100 bg-white p-3">
      <p className="mb-1 text-sm font-semibold text-warmGray-800">
        Wound volume (mm³)
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E5EBF0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#1B64CC"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#1B64CC" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
