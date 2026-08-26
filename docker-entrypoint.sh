#!/bin/sh
set -e

echo "[entrypoint] Menunggu PostgreSQL siap..."
attempt=0
until node scripts/wait-for-db.js; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "[entrypoint] Gagal konek ke DB setelah 30x percobaan. Keluar."
    exit 1
  fi
  echo "[entrypoint] DB belum siap, coba lagi dalam 2 detik... ($attempt/30)"
  sleep 2
done
echo "[entrypoint] PostgreSQL siap."

echo "[entrypoint] Menjalankan ingest (schema + import readings.json, idempotent)..."
node scripts/ingest.js

echo "[entrypoint] Menjalankan aplikasi Next.js..."
exec npm run start
