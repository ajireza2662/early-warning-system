import { SensorWithStatus, HistoryPoint } from "@/lib/sensors";
import StatusBadge from "./StatusBadge";
import SensorChart from "./SensorChart";

const STATUS_LINE_COLOR: Record<string, string> = {
  AMAN: "#16a34a",
  SIAGA: "#eab308",
  WASPADA: "#f97316",
  AWAS: "#dc2626",
  "TIDAK ADA DATA": "#94a3b8",
};

const CARD_HIGHLIGHT: Record<string, string> = {
  AMAN: "border-slate-200",
  SIAGA: "border-yellow-300",
  WASPADA: "border-orange-400 ring-2 ring-orange-200 shadow-orange-100",
  AWAS: "border-red-500 ring-2 ring-red-300 shadow-red-200 animate-pulse",
  "TIDAK ADA DATA": "border-slate-200",
};

export default function SensorCard({
  sensor,
  history,
}: {
  sensor: SensorWithStatus;
  history: HistoryPoint[];
}) {
  const isHighlighted = sensor.status === "WASPADA" || sensor.status === "AWAS";

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${CARD_HIGHLIGHT[sensor.status]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400">{sensor.id}</p>
          <h2 className="text-lg font-bold text-slate-800">{sensor.name}</h2>
          <p className="text-sm text-slate-500">{sensor.location}</p>
        </div>
        <StatusBadge status={sensor.status} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-900">
          {sensor.latestValue !== null ? sensor.latestValue.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-slate-500">cm</span>
        {isHighlighted && (
          <span className="ml-auto text-xs font-semibold text-red-600">
            ⚠ Perlu perhatian
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Update terakhir:{" "}
        {sensor.latestTs
          ? new Date(sensor.latestTs).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "-"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-yellow-50 py-1 text-yellow-700">
          SIAGA ≥ {sensor.siaga}cm
        </div>
        <div className="rounded-lg bg-orange-50 py-1 text-orange-700">
          WASPADA ≥ {sensor.waspada}cm
        </div>
        <div className="rounded-lg bg-red-50 py-1 text-red-700">
          AWAS ≥ {sensor.awas}cm
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-slate-500">
          Water level — 24 jam terakhir
        </p>
        <SensorChart
          history={history}
          siaga={sensor.siaga}
          waspada={sensor.waspada}
          awas={sensor.awas}
          colorClass={STATUS_LINE_COLOR[sensor.status]}
        />
      </div>
    </div>
  );
}
