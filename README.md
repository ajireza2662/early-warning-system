# EWS Banjir — Kabupaten Malinau

Dashboard pemantauan water level untuk 3 sensor sungai di Kabupaten Malinau
(`WL-001` Sungai Malinau, `WL-002` Sungai Sesayap, `WL-003` Sungai Bahau),
dibangun dengan **Next.js (App Router) + PostgreSQL**, dijalankan via
**Docker Compose**.

---

## 1. Cara Menjalankan

### Prasyarat

- Docker & Docker Compose (v2, plugin `docker compose`) sudah terpasang.
- Tidak perlu install Node.js/PostgreSQL di host — semua jalan di dalam container.
- Port `3000` (web) dan `5432` (db) di host harus bebas.

### Menjalankan aplikasi

```bash
git clone <url-repo-ini>
cd ews-banjir-malinau
docker compose up
```

Yang terjadi secara otomatis:

1. `db` (PostgreSQL 16) start, tunggu sampai `healthy`.
2. `web` (Next.js) dibangun (`npm install` + `npm run build`), lalu saat container
   jalan: menunggu DB siap → membuat schema (`db/init.sql`) → **import
   `data/readings.json`** ke tabel `readings` → menjalankan `npm run start`.
3. Proses ingest **idempotent**: kalau tabel `readings` sudah berisi data
   (mis. `docker compose up` dijalankan ulang / container di-restart), import
   di-skip — data tidak dobel.

Buka **http://localhost:3000** setelah log menunjukkan `Ready` / import selesai.

Untuk menjalankan di background: `docker compose up -d`, lihat log dengan
`docker compose logs -f web`.

Untuk reset total (hapus volume DB dan mulai dari nol):

```bash
docker compose down -v
docker compose up
```

### Struktur singkat

```
├── src/app/                 → halaman & API routes (Next.js App Router)
│   ├── page.tsx              → dashboard utama (Server Component, query DB langsung)
│   └── api/sensors/...       → REST endpoint (dipakai kalau butuh akses dari luar)
├── src/components/           → SensorCard, SensorChart (recharts), StatusBadge
├── src/lib/                  → db.ts (pg Pool), sensors.ts (query), status.ts (klasifikasi)
├── db/init.sql                → schema + seed 3 sensor & threshold
├── scripts/ingest.js          → import readings.json ke Postgres (jalan saat container start)
├── data/readings.json         → data mentah yang disediakan
├── docker-entrypoint.sh       → wait-for-db → ingest → next start
└── docker-compose.yml
```

---

## 2. Tugas Analisa

### 2.1. Dari Batch ke Realtime

Di test ini data masuk lewat file statis yang diimpor sekali saat start. Di
produksi, sensor akan mengirim data terus-menerus lewat API tiap 1 menit.
Komponen yang perlu ditambahkan:

- **Ingestion endpoint** — sebuah API route (mis. `POST /api/ingest`) yang
  menerima payload dari sensor/gateway IoT, memvalidasi, lalu insert ke
  tabel `readings` (skema sama, tinggal ganti sumber data: dari `readings.json`
  jadi HTTP request masuk). Kalau sensor tidak bisa push langsung ke server
  (lewat NB-IoT/LoRa ke gateway), gateway itu yang jadi pemanggil endpoint ini.
- **Message queue/broker** (mis. Redis Streams, RabbitMQ, atau Kafka kalau skalanya
  besar) di antara ingestion endpoint dan proses penyimpanan — supaya endpoint
  ingestion tetap cepat merespons sensor (idealnya < 1 detik) walau proses
  simpan+cek-threshold+notifikasi agak berat, dan supaya tidak ada data hilang
  kalau DB sedang lambat.
- **Worker/consumer** yang mengambil pesan dari queue, insert ke `readings`,
  menghitung status terbaru, dan (kalau naik ke WASPADA/AWAS) memicu flow
  notifikasi (lihat 2.2).
- **Realtime channel ke UI** — dashboard perlu tahu ada data baru tanpa
  refresh manual. Pilihannya:
  - **WebSocket / Server-Sent Events (SSE)**: server push ke browser tiap ada
    reading baru — paling responsif, cocok untuk dashboard monitoring.
  - **Polling ringan** (client fetch `/api/sensors` tiap 15–30 detik pakai
    `setInterval` / SWR/React Query dengan `refetchInterval`) — jauh lebih
    sederhana untuk diimplementasi dan cukup untuk kebutuhan "1 update/menit"
    ini, hanya kurang instan dibanding WebSocket.
  - Untuk skala test/kecil, saya akan mulai dari polling dulu (lebih murah &
    lebih sedikit failure mode), baru naik ke SSE/WebSocket kalau requirement
    "realtime" jadi lebih ketat (misalnya perlu update < 5 detik).

Ringkasnya, alurnya jadi: Sensor/Gateway → Ingestion API → Queue → Worker
(simpan + cek threshold + notifikasi) → Postgres → Dashboard (polling/SSE).

### 2.2. Flow Notifikasi

Kapan notifikasi dikirim?
Bukan tiap reading baru (akan spam — 1 menit sekali walau statusnya AWAS terus),
dan bukan periode tetap (mis. tiap 1 jam) karena telat untuk kejadian
darurat. Yang paling masuk akal: dikirim saat terjadi transisi status ke
level yang lebih tinggi dan lebih berbahaya (AMAN→SIAGA, SIAGA→WASPADA,
WASPADA→AWAS, dst.) — dibandingkan status tersimpan terakhir yang sudah
dinotifikasi, bukan dibanding reading sebelumnya secara mentah.

Mencegah notifikasi berulang saat nilai naik-turun di sekitar threshold
(flapping, mis. 199→201→199→201):

- Simpan status "resmi" terakhir yang sudah dinotifikas per sensor
  (kolom `last_notified_status` + `last_notified_at`), terpisah dari status
  hasil klasifikasi mentah tiap reading. Notifikasi baru dikirim kalau status
  resmi ini berubah.
- Hysteresis / debounce berbasis waktu: status baru dianggap "resmi"
  hanya kalau bertahan minimal N menit (mis. 5 menit) berturut-turut — bukan
  1 reading tunggal. Ini menyaring lonjakan sesaat akibat gelombang/noise sensor.
- Cooldown per sensor: setelah notifikasi terkirim, tidak kirim notifikasi
  baru untuk sensor yang sama dalam X menit ke depan (mis. 15–30 menit),
  *kecuali* statusnya naik ke level yang lebih parah lagi (WASPADA→AWAS tetap
  harus tembus cooldown, karena itu makin darurat).
- Kombinasi hysteresis (arah naik) + cooldown (arah turun-naik cepat) ini yang
  mencegah kasus 199→201→199→201 memicu 4 notifikasi terpisah.

Komponen yang bertanggung jawab:
Logika ini ada di worker/consumer (bagian dari alur 2.1) — bukan di
ingestion endpoint (yang tugasnya cuma terima & simpan cepat) dan bukan di
frontend. Worker: simpan reading → hitung status → bandingkan dengan status
resmi terakhir + cek hysteresis/cooldown → kalau lolos, panggil **Notification
Service** terpisah (integrasi ke WhatsApp Business API / SMS gateway) yang
juga mencatat log pengiriman (untuk audit & mencegah duplikasi kalau worker
retry).

### 2.3. Sensor Mati

Deteksi:
Setiap reading masuk mengandung timestamp. Ada job terjadwal (cron
tiap 1–5 menit, atau dicek langsung setiap kali dashboard/API diakses) yang
membandingkan `now() - last_reading_ts` tiap sensor terhadap batas toleransi
(mis. 2–3× interval normal → kalau normalnya 1 reading/menit, dianggap
**STALE** kalau tidak ada data > 3–5 menit). Kalau lewat batas itu, sensor
ditandai `STALE` — terpisah dari 4 status AMAN/SIAGA/WASPADA/AWAS yang
berbasis nilai, karena secara semantik ini bukan "aman", tapi "tidak
diketahui".

**Tampilan di dashboard:**
Kartu sensor tersebut diberi status/badge kelima yang jelas berbeda secara
visual dari status berbasis nilai, misalnya **"⚠ SENSOR TIDAK RESPON"** (abu-abu
dengan ikon warning, bukan hijau/kuning/oranye/merah), plus keterangan "data
terakhir masuk pukul ..." supaya petugas tahu sudah berapa lama sensor sunyi.
Grafik tetap menampilkan history terakhir yang ada, tapi dengan garis
terputus/area kosong di akhir supaya kelihatan jelas ada gap.

**Apakah memicu notifikasi tersendiri?**
Ya — ini justru salah satu skenario paling kritis (banjir bisa datang tepat
saat sensor mati karena kerusakan fisik akibat air naik). Worker mengirim
notifikasi terpisah jenis **"SENSOR OFFLINE"** (bukan notifikasi
AMAN/SIAGA/WASPADA/AWAS) ke petugas BPBD, dengan cooldown lebih longgar (mis.
sekali per jam selama masih offline, bukan berulang tiap menit) supaya tidak
spam tapi petugas tetap diingatkan selama masalah belum ditangani.

---

## 3. Yang Belum Selesai / Rencana Lanjutan

Bagian coding dashboard (ingest, klasifikasi status, chart 24 jam,
highlight WASPADA/AWAS) sudah jalan penuh sesuai brief. Yang **belum
diimplementasikan sebagai kode** (sesuai brief, bagian ini memang cukup
dijawab sebagai analisa, tidak wajib di-coding):

- Deteksi sensor mati (STALE) secara live di dashboard — saat ini dashboard
  hanya menampilkan status berbasis reading terakhir di data statis, belum
  ada job pengecekan "sudah berapa lama tidak ada data" karena datasetnya
  historis (bukan live clock).
- Endpoint ingestion realtime (`POST /api/ingest`), queue/worker, dan
  integrasi notifikasi WhatsApp/SMS — di luar scope test ini (data yang
  disediakan berupa file statis), sudah dijelaskan desainnya di bagian analisa.
- Auto-refresh dashboard (polling/SSE) — saat ini dashboard adalah Server
  Component yang re-render tiap request; belum ada auto-refresh client-side.

Kalau ada waktu lebih, urutan yang akan saya kerjakan berikutnya:

1. Tambah polling ringan di client (SWR, `refetchInterval` beberapa detik)
   supaya dashboard update tanpa reload manual — paling murah, dampaknya
   paling terasa untuk use-case monitoring.
2. Implementasi deteksi STALE di `getSensorsWithStatus()` (bandingkan
   `latestTs` terhadap "waktu now" versi dataset, atau terhadap jam sistem
   kalau sudah live) + badge kelima di UI.
3. Endpoint `POST /api/ingest` sebagai simulasi sumber data realtime,
   menggantikan/melengkapi `readings.json`.
4. Tabel log notifikasi + implementasi hysteresis/cooldown sesuai desain di
   bagian 2.2, sebagai proof-of-concept sebelum benar-benar integrasi ke
   WhatsApp/SMS gateway pihak ketiga.
