# RME Klinik Gigi — Rekam Medis Elektronik

Aplikasi web fullstack untuk **Rekam Medis Elektronik klinik gigi**: dashboard, pasien, rekam medis, **odontogram interaktif (FDI)**, appointment, pembayaran, laporan (PDF/Excel), autentikasi JWT, dan role **admin / dokter / resepsionis**.

## Stack

| Lapisan | Teknologi |
|--------|-----------|
| Frontend | React 18, Vite 6, TailwindCSS, React Router, Axios, React Hook Form, Zod, Zustand, Framer Motion, Recharts, Lucide React, Radix UI (gaya shadcn/ui), Sonner |
| Backend | Node.js 18+, Express, JWT, bcryptjs, multer, cors, helmet, express-rate-limit, Zod (validasi), MySQL2 |
| Database | MySQL 8+ |

## Struktur repo

```
├── backend/           # API Express — prefix /api/v1
├── frontend/          # SPA React + Vite
├── database/
│   └── schema.sql     # DDL database `rme_klinik_gigi`
└── README.md
```

## Prasyarat

- **Node.js** 18 atau lebih baru  
- **MySQL** (server berjalan dan user bisa membuat database)

## 1. Database

Jalankan skema SQL (buat database dan semua tabel):

```bash
mysql -u root -p < database/schema.sql
```

Atau salin isi `database/schema.sql` ke klien MySQL Anda.

## 2. Backend

```bash
cd backend
copy .env.example .env
```

Edit `.env` — set minimal:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=rme_klinik_gigi`
- `JWT_SECRET` — string acak **minimal ~32 karakter** untuk production
- `CORS_ORIGIN=http://localhost:5173` (origin frontend dev)

Install dan seed data dummy:

```bash
npm install
npm run seed
```

Jalankan API:

```bash
npm run dev
```

API default: `http://localhost:5000`  
Health check: `GET http://localhost:5000/health`

### Akun demo (setelah seed)

| Email | Password | Role |
|-------|----------|------|
| admin@klinik.test | password123 | admin |
| dokter@klinik.test | password123 | dokter |
| resepsionis@klinik.test | password123 | resepsionis |

## 3. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`.

Development menggunakan **proxy Vite** ke backend (`vite.config.js`): request ke `/api` dan `/uploads` diteruskan ke `http://localhost:5000`. Biarkan `VITE_API_URL` kosong di `.env` untuk mode ini.

Untuk production, build frontend dan set `VITE_API_URL` ke URL API Anda (tanpa trailing slash):

```bash
npm run build
```

Hasil di folder `frontend/dist`.

## Fitur utama

- **Dashboard**: statistik, grafik kunjungan & pemasukan (Recharts), jadwal hari ini, aktivitas terbaru  
- **Pasien**: CRUD, pencarian, filter gender, pagination  
- **Rekam medis**: kunjungan, diagnosis, tindakan, resep (seed), pembayaran terkait  
- **Odontogram**: gigi FDI klik-hingga-modal, warna per kondisi, PATCH realtime `/api/v1/medical-records/:id/teeth`  
- **Appointment**: filter tanggal & status, antrian otomatis per dokter per hari  
- **Pembayaran**: daftar, cetak invoice PDF (jspdf)  
- **Laporan**: ekspor PDF/Excel (data dari API `/api/v1/reports/*`)  
- **UI**: sidebar/topbar responsif, skeleton loading, toast (Sonner), konfirmasi hapus, **dark/light mode**  
- **Keamanan API**: JWT, bcrypt, validasi input (Zod), rate limit login, helmet, CORS  

## Environment (ringkasan)

**Backend** (`backend/.env`): lihat `backend/.env.example`.

**Frontend** (`frontend/.env`): lihat `frontend/.env.example` — untuk dev biasanya cukup kosong agar proxy Vite dipakai.

## Pemeliharaan

- Upload foto dokter disimpan di `backend/uploads/doctors/` dan dilayani statis di `/uploads/...`.
- Odontogram menyimpan `tooth_number` (FDI permanen 11–48) dan `condition_type` sesuai ENUM di skema.

## Lisensi

Proyek contoh siap dikembangkan lebih lanjut sesuai kebutuhan klinik Anda.
