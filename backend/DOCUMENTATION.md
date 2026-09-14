# SIM Klinik (Sistem Informasi Manajemen Klinik)

## Fitur & Modul Utama

SIM Klinik mencakup seluruh alur pelayanan klinik dari pendaftaran hingga kasir dan pelaporan:

1. **Registrasi & Antrean Pasien** (`modules/registrasi/`)
   - Pendaftaran pasien baru & lama (penomoran No. Rekam Medis otomatis).
   - Pengelolaan antrean per poli (Umum, Gigi, KIA/KB, Spesialis, Fisioterapi).
   - Cetak kartu pasien dan bukti pendaftaran.

2. **Pelayanan Medis & Rawat Jalan** (`modules/pelayanan/`)
   - Pemeriksaan dokter, anamnesis, vital sign, dan diagnosis (ICD-10).
   - Tindakan medis dan pembuatan resep elektronik (e-resep).

3. **Rekam Medis Elektronik (RME / EMR)** (`modules/rekam_medis/`)
   - Riwayat kunjungan, rekam pemeriksaan terdahulu, riwayat alergi, dan catatan medis pasien.

4. **Farmasi & Apotek** (`modules/inventory/`)
   - Penyerahan resep, verifikasi obat, dan aturan pakai.
   - Manajemen stok obat/alat kesehatan, kartu stok, batch & expired date, serta penerimaan barang.

5. **Kasir & Billing** (`modules/billing/`)
   - Kalkulasi tagihan otomatis (biaya pendaftaran, tindakan, jasa medis, dan obat).
   - Penerbitan kwitansi dan rincian pembayaran.

6. **Keuangan & Akuntansi Klinik** (`modules/keuangan/`)
   - Pencatatan pemasukan & pengeluaran operasional.
   - Pengelolaan kas dan buku kas harian.

7. **Laporan & Rekapitulasi** (`modules/laporan/`)
   - Laporan kunjungan pasien harian/bulanan.
   - Laporan pendapatan kasir dan omset obat.
   - Laporan 10 besar penyakit (morbiditas) berbasis ICD-10.

8. **Master Data & Pengaturan Hak Akses** (`modules/master/` & `modules/pengaturan/`)
   - Data dokter, perawat, pegawai, poliklinik, tindakan, tarif, kelompok pasien/asuransi.
   - Manajemen akun pengguna berbasis Role-Based Access Control (RBAC).

---

## Arsitektur Sistem

- **Backend Framework**: Laravel 13 (PHP 8.4+).
- **Frontend Layer**: Laravel Blade Views, Tailwind CSS v4, dan Vite bundler.
- **Legacy Module**: Modul operasional klinik PHP native yang berjalan melalui reverse proxy internal controller (`/legacy/{path}`) dengan session dan autentikasi terpusat di Laravel.
- **Aset Statis**: jQuery & DataTables untuk interaksi tabel cepat, serta custom CSS modern bertema profesional.

---

## Kebutuhan Sistem (Prerequisites)

Sebelum menjalankan aplikasi, pastikan perangkat Anda telah terpasang:

- **PHP**: `^8.4.1` atau lebih baru
  - Ekstensi PHP wajib: `pdo_mysql`, `mbstring`, `openssl`, `bcmath`, `curl`, `xml`, `fileinfo`, `gd`
- **Node.js**: `v18.0` atau lebih baru (disarankan v20 LTS atau v24) & **NPM**
- **Database**: MySQL `5.7` / `8.0+` atau MariaDB `10.4+`
- **Composer**: `2.x`

---

## Panduan Instalasi & Setup

### 1. Masuk ke Direktori Projek
```bash
cd simklinik
```

### 2. Pasang Dependensi Backend & Frontend
```bash
# Pasang paket PHP (Composer)
composer install

# Pasang paket JavaScript (NPM)
npm install
```

### 3. Konfigurasi Environment File
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan sesuaikan kredensial database MySQL Anda:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sim_klinik_db
DB_USERNAME=root
DB_PASSWORD=
```
> **Catatan:** Pastikan database `sim_klinik_db` sudah dibuat di MySQL Anda (`CREATE DATABASE sim_klinik_db;`).

### 4. Generate Application Key
```bash
php artisan key:generate
```

### 5. Jalankan Database Migration & Seeder
Perintah ini akan membuat struktur tabel dan mengisi data master, wilayah Indonesia, role, diagnostik fisioterapi, dan akun demo:
```bash
php artisan migrate --seed
```

### 6. Build Aset Frontend
Kompilasi CSS dan fonts produksi menggunakan Vite:
```bash
npm run build
```

---

## Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Seluruh Service Sekaligus (Direkomendasikan)
Gunakan perintah satu pintu dari composer:
```bash
composer dev
```
Perintah ini secara otomatis menjalankan:
1. **Laravel Web Server** (`http://127.0.0.1:8000`)
2. **Vite Dev Server** dengan Hot Module Reloading (`http://localhost:5173`)
3. **Queue Worker** untuk background jobs
4. **Pail Log Viewer** untuk memantau log secara real-time

### Opsi 2: Menjalankan Secara Terpisah (Dua Terminal)
Buka 2 tab terminal di folder `simklinik`:

- **Terminal 1 (Server Laravel)**:
  ```bash
  php artisan serve
  ```
  Aplikasi dapat diakses di: `http://127.0.0.1:8000`

- **Terminal 2 (Vite Hot-Reload untuk Development UI)**:
  ```bash
  npm run dev
  ```

---


## Struktur Folder

```
simklinik/
├── app/                  # Logika aplikasi Laravel (Controllers, Models, Middleware, Services)
├── config/               # File konfigurasi aplikasi Laravel (database, view, auth, dll)
├── database/
│   ├── factories/        # Factory data pengujian
│   ├── migrations/       # Skema database terstruktur
│   └── seeders/          # Seeder master data, wilayah, role, dan user demo
├── docker/               # Konfigurasi containerization (Apache & Entrypoint)
├── lang/                 # File lokalisasi bahasa (ID / EN)
├── legacy/               # Modul operasional klinik PHP native
│   ├── auth/             # Modul login native
│   ├── config/           # Konfigurasi koneksi database & path legacy
│   ├── includes/         # Layout header, sidebar, navbar, helpers
│   ├── modules/          # Modul fungsional (registrasi, billing, master, laporan, dll)
│   └── uploads/          # Direktori berkas unggahan
├── public/               # Document root web server
│   ├── assets/           # CSS kustom (style.css, login.css), JS vendor, gambar logo
│   ├── build/            # Output kompilasi Vite (CSS Tailwind terbundle, font, JS)
│   └── index.php         # Entry point aplikasi
├── resources/            # Aset mentah frontend
│   ├── css/app.css       # Titik masuk Tailwind CSS v4 & font configuration
│   ├── js/app.js         # Titik masuk JavaScript
│   └── views/            # Template Blade (layout, auth, dashboard, components)
├── routes/               # Definisi routing web (routes/web.php)
├── storage/              # File cache, logs, dan upload Laravel
├── tests/                # Unit & Feature automated tests
├── composer.json         # Konfigurasi dependensi PHP & scripts
├── package.json          # Konfigurasi dependensi JavaScript & Vite
└── vite.config.js        # Konfigurasi bundling Vite + Tailwind CSS v4
```

---

## Perintah Berguna (Artisan & NPM)

### Pembersihan Cache
Gunakan jika Anda melakukan perubahan konfigurasi, route, atau template:
```bash
# Bersihkan seluruh cache
php artisan optimize:clear

# Bersihkan cache view / Blade
php artisan view:clear

# Bersihkan cache konfigurasi
php artisan config:clear
```

### Database & Migrasi
```bash
# Cek status migrasi
php artisan migrate:status

# Reset database dan isi ulang data awal (PERHATIAN: menghapus data yang ada)
php artisan migrate:fresh --seed
```

### Routing
```bash
# Menampilkan seluruh route yang terdaftar
php artisan route:list
```

### Frontend Assets
```bash
# Menjalankan build produksi aset frontend
npm run build
```

---
