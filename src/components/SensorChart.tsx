"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { HistoryPoint } from "@/lib/sensors";

type Props = {
  history: HistoryPoint[];
  siaga: number;
  waspada: number;
  awas: number;
  colorClass: string; // hex warna garis, disesuaikan dengan status terkini
};

export default function SensorChart({ history, siaga, waspada, awas, colorClass }: Props) {
  const data = history.map((h) => ({
    ts: h.ts,
    value: h.value,
    label: new Date(h.ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        Belum ada data history.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorClass} stopOpacity={0.35} />
            <stop offset="95%" stopColor={colorClass} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          width={40}
          domain={["dataMin - 10", "dataMax + 10"]}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)} cm`, "Water level"]}
          labelFormatter={(label) => `Jam ${label}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <ReferenceLine y={siaga} stroke="#eab308" strokeDasharray="4 4" label={{ value: "SIAGA", fontSize: 10, fill: "#a16207", position: "insideTopLeft" }} />
        <ReferenceLine y={waspada} stroke="#f97316" strokeDasharray="4 4" label={{ value: "WASPADA", fontSize: 10, fill: "#c2410c", position: "insideTopLeft" }} />
        <ReferenceLine y={awas} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "AWAS", fontSize: 10, fill: "#991b1b", position: "insideTopLeft" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colorClass}
          strokeWidth={2}
          fill={`url(#grad-${colorClass})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
