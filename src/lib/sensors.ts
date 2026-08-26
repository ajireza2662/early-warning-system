import { pool } from "./db";
import { classifyStatus, SensorStatus } from "./status";

export type Sensor = {
  id: string;
  name: string;
  location: string;
  siaga: number;
  waspada: number;
  awas: number;
};

export type SensorWithStatus = Sensor & {
  latestValue: number | null;
  latestTs: string | null;
  status: SensorStatus | "TIDAK ADA DATA";
};

export type HistoryPoint = {
  ts: string;
  value: number;
};

/**
 * Ambil 3 sensor beserta reading paling akhir + status saat ini.
 * Pakai LEFT JOIN LATERAL supaya tetap muncul walau sensor belum punya reading.
 */
export async function getSensorsWithStatus(): Promise<SensorWithStatus[]> {
  const { rows } = await pool.query(`
    SELECT
      s.id, s.name, s.location, s.siaga, s.waspada, s.awas,
      r.value AS latest_value,
      r.ts AS latest_ts
    FROM sensors s
    LEFT JOIN LATERAL (
      SELECT value, ts FROM readings
      WHERE sensor_id = s.id
      ORDER BY ts DESC
      LIMIT 1
    ) r ON true
    ORDER BY s.id ASC
  `);

  return rows.map((row) => {
    const latestValue = row.latest_value !== null ? Number(row.latest_value) : null;
    const status =
      latestValue === null
        ? "TIDAK ADA DATA"
        : classifyStatus(latestValue, Number(row.siaga), Number(row.waspada), Number(row.awas));

    return {
      id: row.id,
      name: row.name,
      location: row.location,
      siaga: Number(row.siaga),
      waspada: Number(row.waspada),
      awas: Number(row.awas),
      latestValue,
      latestTs: row.latest_ts ? new Date(row.latest_ts).toISOString() : null,
      status,
    };
  });
}

/**
 * Ambil history 24 jam terakhir untuk satu sensor.
 * "24 jam terakhir" dihitung relatif terhadap reading TERBARU sensor tsb
 * (bukan jam sekarang di server), karena dataset yang dipakai bersifat historis/statis.
 */
export async function getSensorHistory(sensorId: string): Promise<HistoryPoint[]> {
  const { rows } = await pool.query(
    `
    SELECT value, ts
    FROM readings
    WHERE sensor_id = $1
      AND ts >= (SELECT MAX(ts) FROM readings WHERE sensor_id = $1) - INTERVAL '24 hours'
    ORDER BY ts ASC
    `,
    [sensorId]
  );

  return rows.map((row) => ({
    ts: new Date(row.ts).toISOString(),
    value: Number(row.value),
  }));
}
