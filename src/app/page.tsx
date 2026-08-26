import { getSensorsWithStatus, getSensorHistory } from "@/lib/sensors";
import SensorCard from "@/components/SensorCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sensors = await getSensorsWithStatus();
  const histories = await Promise.all(
    sensors.map((s) => getSensorHistory(s.id))
  );

  const alertCount = sensors.filter(
    (s) => s.status === "WASPADA" || s.status === "AWAS"
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
          Pijartech · Early Warning System
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Dashboard Pemantauan Banjir — Kabupaten Malinau
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pemantauan real-time 3 sensor water level di Sungai Malinau, Sesayap,
          dan Bahau.
        </p>

        {alertCount > 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            ⚠ {alertCount} sensor sedang berstatus WASPADA/AWAS — perlu perhatian
            segera.
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
            ✓ Semua sensor dalam kondisi aman.
          </div>
        )}
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sensors.map((sensor, i) => (
          <SensorCard key={sensor.id} sensor={sensor} history={histories[i]} />
        ))}
      </section>

      <footer className="mt-10 text-center text-xs text-slate-400">
        Data diimpor dari readings.json (48 jam terakhir, 1 reading/menit per sensor).
      </footer>
    </main>
  );
}
