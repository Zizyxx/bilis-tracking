# Bilis Tracking UIN Jakarta

MVP full-stack berbasis Next.js, JWT, dan MongoDB untuk kebutuhan live tracking Bilis UIN Syarif Hidayatullah Jakarta, disiapkan agar cocok dideploy ke Vercel.

## Halaman

- `/` untuk mahasiswa memantau posisi bus, ETA, dan halte.
- `/driver` untuk sopir mengaktifkan transmisi GPS.
- `/admin` untuk admin mengelola halte, sopir, dan jadwal.

## Menjalankan project

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Environment

Project ini membutuhkan:

- `MONGO_URI`

Tambahkan di `.env` saat development lokal dan di Project Settings Vercel saat deploy.

Format yang benar:

```bash
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/bilis-tracking?retryWrites=true&w=majority
```

Penting:

- jangan ada spasi di nama key, harus persis `MONGO_URI=...`
- sebaiknya URI sudah menyertakan nama database, misalnya `/bilis-tracking`
- setelah mengubah `.env`, restart `npm run dev`

## Demo login

- Admin: `admin` / `admin123`
- Sopir: `driver1` / `driver123`

## Catatan Deploy Vercel

- Script lokal dan production sekarang memakai server bawaan Next.js, bukan custom server.
- State aplikasi akan disimpan ke MongoDB pada koleksi `app_state`.
- Halaman mahasiswa memakai polling ke `/api/public/state` agar tetap kompatibel dengan arsitektur serverless.

## Checklist Deploy

1. Push project ini ke repository Git.
2. Import repository ke Vercel.
3. Tambahkan environment variable `MONGO_URI` di Vercel Project Settings.
4. Pastikan value `MONGO_URI` memakai format yang valid dan mengarah ke database yang benar.
5. Jalankan deploy.
6. Setelah deploy pertama, buka `/admin` dan login dengan akun default:
   `admin` / `admin123`
7. Cek halaman `/driver` dan `/` untuk memastikan data tracking terbaca dari MongoDB.
