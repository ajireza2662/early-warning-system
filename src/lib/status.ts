export type SensorStatus = "AMAN" | "SIAGA" | "WASPADA" | "AWAS";

/**
 * Klasifikasi status berdasarkan nilai terkini & threshold per sensor.
 * - value < siaga            -> AMAN
 * - siaga <= value < waspada -> SIAGA
 * - waspada <= value < awas  -> WASPADA
 * - value >= awas            -> AWAS
 */
export function classifyStatus(
  value: number,
  siaga: number,
  waspada: number,
  awas: number
): SensorStatus {
  if (value >= awas) return "AWAS";
  if (value >= waspada) return "WASPADA";
  if (value >= siaga) return "SIAGA";
  return "AMAN";
}

export const STATUS_STYLES: Record<
  SensorStatus,
  { badge: string; ring: string; dot: string; label: string }
> = {
  AMAN: {
    badge: "bg-green-100 text-green-800 border-green-300",
    ring: "ring-green-200",
    dot: "bg-green-500",
    label: "Aman",
  },
  SIAGA: {
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ring: "ring-yellow-200",
    dot: "bg-yellow-500",
    label: "Siaga",
  },
  WASPADA: {
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    ring: "ring-orange-300",
    dot: "bg-orange-500",
    label: "Waspada",
  },
  AWAS: {
    badge: "bg-red-100 text-red-800 border-red-300",
    ring: "ring-red-400",
    dot: "bg-red-600",
    label: "Awas",
  },
};
