/**
 * scripts/wait-for-db.js
 * Exit code 0 kalau berhasil konek ke Postgres, 1 kalau gagal.
 * Dipakai docker-entrypoint.sh untuk polling sampai DB siap menerima koneksi.
 */
const { Client } = require("pg");

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

check();
