-- Skema EWS Banjir - Kabupaten Malinau
-- Dijalankan otomatis (idempotent) oleh scripts/ingest.js saat aplikasi start pertama kali.

CREATE TABLE IF NOT EXISTS sensors (
  id        TEXT PRIMARY KEY,          -- contoh: WL-001
  name      TEXT NOT NULL,             -- contoh: Sungai Malinau
  location  TEXT NOT NULL,             -- contoh: Malinau Kota
  siaga     NUMERIC NOT NULL,          -- threshold cm
  waspada   NUMERIC NOT NULL,
  awas      NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  id        BIGSERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id),
  value     NUMERIC NOT NULL,
  unit      TEXT NOT NULL DEFAULT 'cm',
  ts        TIMESTAMPTZ NOT NULL
);

-- Cegah duplikasi reading yang sama (sensor + waktu) kalau ingest dijalankan ulang.
CREATE UNIQUE INDEX IF NOT EXISTS uq_readings_sensor_ts ON readings (sensor_id, ts);

-- Query "ambil reading terakhir per sensor" & "24 jam terakhir" sering filter+sort by sensor_id, ts.
CREATE INDEX IF NOT EXISTS idx_readings_sensor_ts_desc ON readings (sensor_id, ts DESC);

-- Seed 3 sensor + threshold sesuai brief. ON CONFLICT supaya aman dijalankan berulang.
INSERT INTO sensors (id, name, location, siaga, waspada, awas) VALUES
  ('WL-001', 'Sungai Malinau', 'Malinau Kota', 200, 250, 300),
  ('WL-002', 'Sungai Sesayap', 'Mentarang',    180, 230, 280),
  ('WL-003', 'Sungai Bahau',   'Bahau Hulu',   170, 220, 270)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  siaga = EXCLUDED.siaga,
  waspada = EXCLUDED.waspada,
  awas = EXCLUDED.awas;
