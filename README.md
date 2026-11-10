# MNC Studio Booking

Portal operasional internal MNC Team untuk mengelola katalog studio dan pengajuan jadwal produksi. Aplikasi menggunakan **Supabase Authentication dan PostgreSQL melalui Supabase Data API** untuk login, profil, role, studio, booking, inventaris, dan audit approval. Tidak ada atribut harga atau pembayaran.

## Status integrasi

- Login, registrasi, pemulihan password, sesi, dan role menggunakan Supabase Auth/Database.
- Katalog, booking, approval, CRUD studio, dan jadwal bentrok memakai tabel/RPC Supabase dengan Row Level Security (RLS).
- `localStorage` browser digunakan oleh Supabase SDK untuk menyimpan sesi auth, **bukan** sebagai penyimpanan akun, studio, atau booking aplikasi.
- Migration `0000_migration.sql` adalah skema awal. Migration `0001_supabase_booking_integration.sql` meng-upgrade skema awal ke kontrak database yang dipakai aplikasi saat ini.
- Pembuatan user demo dilakukan melalui Supabase Admin API dari skrip server-side. **Jangan memasukkan row secara manual ke tabel internal `auth.users` dengan SQL.**

## Daftar isi

- [Persyaratan](#persyaratan)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Menjalankan migration](#menjalankan-migration)
- [Membuat akun demo](#membuat-akun-demo)
- [Memeriksa akun dan role](#memeriksa-akun-dan-role)
- [Struktur database](#struktur-database)
- [Keamanan dan role](#keamanan-dan-role)
- [Tes dan pemeriksaan](#tes-dan-pemeriksaan)
- [Deployment](#deployment)
- [Pemecahan masalah](#pemecahan-masalah)

## Persyaratan

- Node.js 22.12+ (atau Node.js 20.19+).
- npm.
- Proyek Supabase aktif dengan Auth dan Data API/PostgREST tersedia.
- Akses pemilik/admin Supabase untuk migration dan pembuatan akun demo.

Periksa versi:

```sh
node --version
npm --version
```

## Menjalankan aplikasi

1. Clone/buka repository lalu masuk ke root project.
2. Buat file `.env.local` mengikuti [.env.example](./.env.example). Isi Project URL dan publishable key dari **proyek Supabase yang sama**. Jangan masukkan secret/service-role key ke variable `VITE_*`.
3. Pasang package sesuai lockfile dan jalankan Vite:

   ```sh
   npm ci
   npm run dev
   ```

4. Buka URL yang ditampilkan terminal (umumnya `http://localhost:3000`).

Perintah lain:

```sh
npm run build       # Build produksi
npm run preview     # Preview build produksi lokal
npm test            # Tes sekali
npm run test:watch  # Tes dalam mode watch
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript
npx drizzle-kit check
```

Server dev hanya untuk development. Jangan mengekspos server tersebut sebagai hosting publik.

## Konfigurasi Supabase

### 1. Pastikan project yang dipilih benar

Di Supabase Dashboard, pilih project yang akan digunakan, lalu buka **Project Settings → Data API**:

- Pastikan **Data API** aktif.
- Salin **Project URL/API URL** dan gunakan URL dasar, contohnya `https://YOUR_PROJECT_REF.supabase.co`.
- Jika dashboard menampilkan endpoint dengan suffix `/rest/v1/`, hapus suffix itu saat mengisi `SUPABASE_URL`; Supabase JS menambahkan endpoint REST sendiri.

Di **Project Settings → API Keys**, gunakan **Publishable key** untuk browser. Jangan gunakan key pada bagian **Secret keys** di browser.

### 2. Buat `.env.local`

Salin template:

```sh
cp .env.example .env.local
```

Isi variabelnya:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

# Server-only; dipakai skrip seed demo, tidak boleh memakai prefix VITE_.
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY

# Dipakai hanya ketika membuat akun demo.
MNC_DEMO_ADMIN_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT
MNC_DEMO_USER_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT
```

Gunakan Project URL yang sama untuk variabel browser dan server. Nama variabel harus persis seperti di atas. `.env.local` sudah diabaikan Git; tetap jangan mengunggah atau menyalin nilainya ke chat, issue, screenshot, atau source code.

`SUPABASE_SERVICE_ROLE_KEY` pada SDK boleh berisi secret key Supabase modern (`sb_secret_...`) yang baru dibuat. Key ini melewati RLS dan hanya boleh digunakan pada skrip/server tepercaya. Jika secret key pernah dibagikan atau ter-commit, revoke lalu buat ulang sebelum melanjutkan.

Restart `npm run dev` setelah perubahan environment.

## Menjalankan migration

Migration berisi perubahan database yang nyata. Pastikan project Supabase dan environment yang dipilih benar, buat backup bila database berisi data penting, dan jalankan setiap migration hanya satu kali.

### Database yang sudah memiliki tabel awal `profiles`, `user_roles`, `studios`, `bookings`

Jika project sudah pernah menerima `0000_migration.sql` dan sudah menampilkan empat tabel dengan empat studio seed, **jangan jalankan ulang migration 0000**. Terapkan hanya:

[`drizzle/migrations/0001_supabase_booking_integration.sql`](./drizzle/migrations/0001_supabase_booking_integration.sql)

Langkah di Supabase Dashboard:

1. Buka **SQL Editor** pada project yang benar.
2. Buat query baru.
3. Salin seluruh isi file migration 0001 ke SQL Editor.
4. Periksa sekali lagi nama project/database, lalu jalankan query.
5. Pastikan query selesai tanpa error.
6. Di **Database → Tables**, verifikasi tabel `profiles`, `user_roles`, `studios`, `bookings`, `studio_equipment`, dan `booking_logs`.
7. Periksa **Database → Policies**, **Functions**, dan **Triggers** untuk memastikan RLS, RPC jadwal, trigger pembuatan profile, serta audit trail terpasang.

Migration mengubah format jadwal booking dari kolom tanggal dan jam terpisah menjadi timestamp dengan zona waktu `Asia/Jakarta`. Migration **berhenti dengan error** jika menemukan booking berstatus `completed`, agar riwayat tersebut tidak dikonversi diam-diam. Jika kondisi ini terjadi, arsipkan atau migrasikan booking tersebut secara eksplisit sebelum mencoba ulang.

### Database Supabase baru

Pada database yang benar-benar kosong, jalankan file SQL berurutan:

1. `drizzle/migrations/0000_migration.sql`
2. `drizzle/migrations/0001_supabase_booking_integration.sql`

Jangan jalankan 0000 pada database yang sudah berisi objek dengan nama sama. Supabase menyediakan schema `auth`, role database, dan fungsi `auth.uid()` yang dibutuhkan.

> `npx drizzle-kit check` hanya memeriksa metadata migration di repository; ia tidak menerapkan migration ke Supabase. Migration di project ini memuat function, trigger, exclusion constraint, dan policy SQL khusus. Tinjau SQL hasil generator sebelum menggunakan `drizzle-kit push` atau membuat ulang migration agar objek khusus tidak hilang.

## Membuat akun demo

### Kredensial demo

| Role | Email | Password awal |
|---|---|---|
| Admin | `admin@mnc.com` | `password123` |
| User | `user@mnc.com` | `password123` |

Password tersebut lemah dan hanya ditujukan untuk development/demo tertutup. Atur password melalui environment saat menjalankan seed; gunakan password kuat yang berbeda di deployment nyata. Jangan gunakan akun demo pada sistem produksi.

### Menjalankan seed

Skrip `scripts/seed-demo-users.mjs` menggunakan Supabase Admin API agar user dibuat melalui mekanisme Auth yang didukung, termasuk password hashing dan trigger profile/role. Skrip **tidak** menulis password plaintext ke SQL atau database aplikasi. Ia juga idempotent untuk email yang sudah ada: tidak mereset password user yang sudah ada, tetapi memastikan role yang benar.

1. Pastikan `.env.local` berisi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MNC_DEMO_ADMIN_PASSWORD`, dan `MNC_DEMO_USER_PASSWORD`.
2. Untuk kredensial awal demo di tabel di atas, gunakan `password123` sebagai nilai kedua variabel password tersebut hanya pada lingkungan demo yang terkendali.
3. Jalankan:

   ```sh
   npm run seed:demo-users
   ```

4. Skrip menampilkan email dan role yang di-seed, bukan password atau secret.
5. Di dashboard, cek **Authentication → Users** untuk melihat akun. Trigger `on_auth_user_created` otomatis membuat profil dan role default `user`; seed lalu menetapkan role Admin untuk akun Admin serta role `user` untuk akun User.

Jika Auth mengaktifkan proteksi password lemah atau aturan panjang/kekuatan password yang lebih tinggi, pilih password yang memenuhi aturan tersebut. Registrasi dari aplikasi selalu membuat role `user`; tidak ada field role Admin pada form.

## Memeriksa akun dan role

Di Supabase Dashboard → **SQL Editor**, gunakan query berikut:

```sql
SELECT u.id, u.email, r.role, p.full_name, p.division
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles r ON u.id = r.user_id
ORDER BY u.email, r.role;
```

Untuk melihat studio:

```sql
SELECT id, name, category, capacity, facilities, status
FROM public.studios
ORDER BY name;
```

Untuk melihat booking dan identitas PIC:

```sql
SELECT id, studio_id, user_id, requester_name, pic_name, pic_contact,
       division, production_purpose, start_time, end_time, status, notes
FROM public.bookings
ORDER BY start_time DESC;
```

## Struktur database

Migration akhir menyediakan objek berikut:

| Tabel | Penggunaan |
|---|---|
| `auth.users` | Identitas dan kredensial yang dikelola Supabase Auth; jangan mengedit/seed langsung lewat SQL. |
| `public.profiles` | Profil internal: nama, email, nomor kontak, divisi, waktu dibuat/diubah. |
| `public.user_roles` | Role akun (`user`/`admin`) dengan primary key gabungan user dan role. |
| `public.studios` | Katalog internal tanpa atribut harga. Termasuk kapasitas, fasilitas, lokasi/divisi terkait, status, serta foto. |
| `public.bookings` | Rentang waktu, pemohon, PIC/kontak, divisi, keperluan produksi, status, dan catatan. |
| `public.studio_equipment` | Inventaris studio, jumlah, kondisi, dan catatan. |
| `public.booking_logs` | Audit trail pembuatan booking dan perubahan status approval. |

Enum:

- `app_role`: `user`, `admin`
- `studio_category`: `tv`, `radio`, `podcast`, `dubbing`, `green_screen`
- `studio_status`: `available`, `maintenance`
- `booking_status`: `pending`, `approved`, `rejected`, `cancelled`

Constraint exclusion di PostgreSQL mencegah booking dengan status `pending`/`approved` bertumpuk pada studio yang sama. Validasi di browser hanya untuk UX; constraint database adalah perlindungan terakhir terhadap request bersamaan.

## Keamanan dan role

- RLS aktif di tabel yang memuat data internal.
- User biasa hanya dapat membaca booking miliknya, membuat booking untuk dirinya, dan membatalkan booking pending miliknya.
- Admin dapat membaca semua booking dan melakukan approval/rejection. Status dan perubahan dicatat di `booking_logs`.
- Katalog dapat dibaca oleh user yang sudah terautentikasi; perubahan studio dan inventaris dibatasi ke Admin.
- Role Admin harus diberikan melalui seed Admin API atau proses backend tepercaya. Jangan menerima nilai `admin` dari metadata/form pendaftaran.
- Publishable key dapat digunakan oleh browser hanya bersama RLS dan policy yang benar.
- Secret/service-role key tidak boleh masuk ke bundle browser, Git, atau log. Jangan mengimpor `client.server.ts` ke komponen/route browser.

## Tes dan pemeriksaan

Sebelum rilis:

```sh
npx tsc --noEmit
npm test
npm run lint
npm run build
npx drizzle-kit check
```

Sesudah migration di Supabase, uji login dengan akun User dan Admin, akses katalog, booking tidak bertabrakan, penolakan/approval, batal booking sendiri, dan pastikan User tidak dapat mengakses fungsi Admin. Tes lokal tidak menggantikan pemeriksaan RLS di project Supabase.

## Deployment

Project menyediakan build, tetapi hosting belum ditetapkan. Untuk deployment:

1. Konfigurasikan `VITE_SUPABASE_URL` dan publishable key pada environment build/hosting.
2. Konfigurasikan server-only `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` hanya jika fungsi server memang membutuhkannya. Jangan pasang service-role key sebagai environment browser.
3. Jalankan tes/build di pipeline.
4. Terapkan migration secara terkontrol pada database target.
5. Nonaktifkan atau hapus akun demo dan pastikan semua Admin memakai kredensial individual yang kuat.

## Pemecahan masalah

### `Missing Supabase environment variable(s)`

Pastikan `.env.local` berada di root project, nama variable tepat, Project URL dan publishable key berasal dari project yang sama, lalu restart Vite.

### Tabel ada tetapi aplikasi gagal membaca data

- Pastikan Data API/PostgREST aktif.
- Pastikan migration 0001 sudah dijalankan penuh.
- Periksa browser DevTools Network/Console dan error Supabase.
- Pastikan user sudah terautentikasi dan policy RLS sesuai role.
- Jangan menonaktifkan RLS untuk mengatasi error.

### User terdaftar tetapi tidak memiliki profile/role

Periksa trigger `on_auth_user_created` dan function `handle_new_user()` di Supabase. Pendaftaran aplikasi mengandalkan trigger tersebut.

### Admin tidak dapat membuka dashboard

Pastikan query pemeriksaan role menghasilkan baris `admin` untuk user tersebut. Keluar lalu masuk kembali agar sesi dan role dimuat ulang. Jangan mengubah role lewat browser.

### Migration gagal

Jangan mengulang seluruh file secara membabi buta. Catat error, periksa objek yang sudah berhasil dibuat, backup database jika ada data, lalu buat migration korektif yang sesuai keadaan database saat ini.
