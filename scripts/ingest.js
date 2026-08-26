/**
 * scripts/ingest.js
 *
 * Dijalankan sekali saat container `web` start (lihat docker-entrypoint.sh).
 * 1. Membuat schema (db/init.sql) kalau belum ada + seed 3 sensor.
 * 2. Mengimpor data/readings.json ke tabel `readings` — HANYA kalau tabel
 *    readings masih kosong, supaya `docker compose up` yang dijalankan
 *    berkali-kali tidak menduplikasi data (idempotent).
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[ingest] ENV DATABASE_URL tidak ditemukan.");
  process.exit(1);
}

const BATCH_SIZE = 1000;

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log("[ingest] Menjalankan schema (db/init.sql)...");
    const schemaSql = fs.readFileSync(
      path.join(__dirname, "..", "db", "init.sql"),
      "utf-8"
    );
    await client.query(schemaSql);

    const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM readings");
    const existing = rows[0].n;

    if (existing > 0) {
      console.log(
        `[ingest] Tabel readings sudah berisi ${existing} baris. Skip import (idempotent).`
      );
      return;
    }

    const dataPath = path.join(__dirname, "..", "data", "readings.json");
    if (!fs.existsSync(dataPath)) {
      console.error(`[ingest] File tidak ditemukan: ${dataPath}`);
      process.exit(1);
    }

    console.log("[ingest] Membaca data/readings.json...");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const readings = JSON.parse(raw);
    console.log(`[ingest] Ditemukan ${readings.length} reading. Mulai import...`);

    await client.query("BEGIN");
    try {
      for (let i = 0; i < readings.length; i += BATCH_SIZE) {
        const batch = readings.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = batch
          .map((r, idx) => {
            const base = idx * 4;
            values.push(r.sensor_id, r.value, r.unit || "cm", r.timestamp);
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
          })
          .join(",");

        await client.query(
          `INSERT INTO readings (sensor_id, value, unit, ts)
           VALUES ${placeholders}
           ON CONFLICT (sensor_id, ts) DO NOTHING`,
          values
        );

        process.stdout.write(
          `\r[ingest] Progress: ${Math.min(i + BATCH_SIZE, readings.length)}/${readings.length}`
        );
      }
      await client.query("COMMIT");
      console.log("\n[ingest] Import selesai.");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const { rows: countRows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM readings"
    );
    console.log(`[ingest] Total baris di tabel readings sekarang: ${countRows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[ingest] Gagal:", err);
  process.exit(1);
});
