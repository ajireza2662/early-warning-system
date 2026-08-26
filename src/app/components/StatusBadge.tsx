import { SensorStatus, STATUS_STYLES } from "@/lib/status";

export default function StatusBadge({
  status,
}: {
  status: SensorStatus | "TIDAK ADA DATA";
}) {
  if (status === "TIDAK ADA DATA") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Tidak Ada Data
      </span>
    );
  }

  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label.toUpperCase()}
    </span>
  );
}
