# MNC Studio Booking

Portal internal MNC Team untuk melihat katalog studio produksi, mengajukan jadwal, dan mengelola persetujuan booking. Aplikasi menggunakan React, TanStack Start/Router, TypeScript, Tailwind CSS, Supabase Auth, serta PostgreSQL melalui Supabase Data API. Tidak ada fitur harga atau pembayaran.

Panduan ini menjelaskan setup dari clone repository sampai menjalankan, menguji, dan menyiapkan aplikasi untuk deployment.

## Daftar isi

- [Fitur dan alur penggunaan](#fitur-dan-alur-penggunaan)
- [Persyaratan](#persyaratan)
- [1. Clone dan instalasi](#1-clone-dan-instalasi)
- [2. Buat dan konfigurasi Supabase](#2-buat-dan-konfigurasi-supabase)
- [3. Siapkan database](#3-siapkan-database)
- [4. Konfigurasi environment](#4-konfigurasi-environment)
- [5. Jalankan aplikasi](#5-jalankan-aplikasi)
- [6. Buat akun dan role Admin](#6-buat-akun-dan-role-admin)
- [7. Verifikasi data Supabase](#7-verifikasi-data-supabase)
- [8. Tes, lint, dan build](#8-tes-lint-dan-build)
- [9. Deployment](#9-deployment)
- [Keamanan](#keamanan)
- [Pemecahan masalah](#pemecahan-masalah)
- [Struktur database](#struktur-database)

## Fitur dan alur penggunaan

- Pengunjung dapat mendaftar, login, meminta reset password, dan memperbarui password melalui Supabase Auth.
- User yang login dapat melihat katalog studio aktif, status ketersediaan, fasilitas, dan jadwal booking.
- User dapat mengajukan booking untuk waktu mendatang dan membatalkan booking yang masih berstatus `pending`.
- Admin dapat mengelola studio dan memproses booking menjadi disetujui atau ditolak.
- Database mencegah bentrok jadwal untuk booking berstatus `pending` atau `approved`.
- Data studio dan booking dibaca dari Supabase. `localStorage` browser hanya digunakan Supabase SDK untuk menyimpan sesi autentikasi, bukan sebagai sumber data aplikasi.

## Persyaratan

- Node.js 20.19+ atau 22.12+.
- npm.
- Project Supabase aktif dengan Supabase Auth dan Data API/PostgREST.
- Akses ke Supabase Dashboard dengan hak untuk menjalankan SQL.

Periksa instalasi:

```sh
node --version
npm --version
```

## 1. Clone dan instalasi

Clone repository, kemudian masuk ke folder project:

```sh
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
npm ci
```

Ganti URL contoh dengan URL repository yang benar. `npm ci` menginstal dependency tepat berdasarkan `package-lock.json`.

## 2. Buat dan konfigurasi Supabase

1. Buat project di [Supabase](https://supabase.com/dashboard) atau pilih project yang sudah tersedia.
2. Pastikan project yang dipilih benar sebelum menjalankan SQL—perubahan migration akan mengubah schema database.
3. Di **Project Settings → Data API**, pastikan Data API aktif dan salin Project URL, misalnya `https://PROJECT_REF.supabase.co`. Gunakan URL dasar, bukan URL yang diakhiri `/rest/v1`.
4. Di **Project Settings → API Keys**, salin **Publishable key**. Key ini boleh digunakan pada browser bersama Row Level Security (RLS). Jangan gunakan secret/service-role key di browser.
5. Di **Authentication → URL Configuration**, untuk development tambahkan URL lokal aplikasi (umumnya `http://localhost:3000`) ke **Redirect URLs**. Untuk deployment, tambahkan domain produksi dan redirect URL reset password yang sesuai.
6. Pilih perilaku konfirmasi email sesuai kebutuhan. Jika konfirmasi email aktif, user harus mengonfirmasi melalui email sebelum dapat login.

## 3. Siapkan database

SQL migrations berada di `drizzle/migrations/`. Jalankan melalui **Supabase Dashboard → SQL Editor**. Buka file lokal, salin seluruh isinya ke query baru, pastikan project Supabase yang dipilih benar, kemudian jalankan. Jalankan file secara berurutan dan hanya sekali pada tiap tahap schema.

### Project Supabase yang benar-benar baru

Pada database yang belum memiliki tabel aplikasi, jalankan:

1. `drizzle/migrations/0000_migration.sql`
2. `drizzle/migrations/0001_supabase_booking_integration.sql`
3. `drizzle/migrations/0002_restore_studio_availability_column.sql`

Migration 0000 membuat schema awal dan memasukkan empat data studio contoh. Migration 0001 mengubah schema booking lama ke schema aplikasi saat ini. Migration 0002 mengembalikan nama kolom dan enum ketersediaan studio ke nama yang dipakai database aplikasi serta memperbarui trigger booking.

### Project yang sudah menjalankan migration 0000

Jika project sudah memiliki tabel `profiles`, `user_roles`, `studios`, `bookings` dan data studio contoh, **jangan jalankan ulang migration 0000**. Jalankan 0001, lalu 0002, secara berurutan.

Migration 0001 mengubah kolom booking dari tanggal dan jam terpisah menjadi timestamp dengan zona waktu `Asia/Jakarta`. Migration ini sengaja berhenti jika menemukan booking berstatus `completed`, agar riwayat tersebut tidak dikonversi tanpa keputusan eksplisit. Jika migration gagal, jangan langsung mengulang seluruh file atau menjalankan langkah berikutnya. Periksa error dan keadaan schema terlebih dahulu.

### Project yang sudah menjalankan migration 0001

Jalankan migration 0002 saja jika database masih memiliki `studios.status`/enum `studio_status` karena 0001 pernah mengubah nama status studio. Migration 0002 mengubahnya kembali menjadi `availability_status`/`studio_availability`, memperbarui trigger booking, lalu meminta PostgREST memuat ulang schema cache.

Jika schema sudah berada pada kondisi akhir, jangan menjalankan ulang migration 0001. Periksa nama kolom dan enum menggunakan query verifikasi di bagian [Verifikasi data Supabase](#7-verifikasi-data-supabase).

### Catatan migration

- Migration 0001 mengasumsikan schema awal yang dibuat oleh migration 0000. Jangan gunakan pada database dengan schema lain tanpa meninjau dan menyesuaikan SQL terlebih dahulu.
- `npx drizzle-kit check` hanya memeriksa metadata migration lokal. Perintah tersebut **tidak** menerapkan migration ke Supabase.
- Migration project memuat function, trigger, RLS policy, dan exclusion constraint. Jangan menggantinya dengan `drizzle-kit push` tanpa memastikan objek khusus itu tetap ada.
- Buat backup sebelum migrasi database yang berisi data penting. Jangan mematikan RLS untuk mengatasi error.

## 4. Konfigurasi environment

Buat file environment lokal dari template:

```sh
cp .env.example .env.local
```

Isi nilai berikut di `.env.local`:

```dotenv
# Dipakai browser/Vite. Ambil dari project Supabase yang akan dipakai.
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

# Server/runtime. Gunakan project URL dan publishable key yang sama.
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

# Hanya diperlukan untuk membuat akun demo melalui skrip seed.
# Secret ini melewati RLS, jangan pernah memberi prefix VITE_.
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_KEY
MNC_DEMO_ADMIN_PASSWORD=GUNAKAN_PASSWORD_KUAT
MNC_DEMO_USER_PASSWORD=GUNAKAN_PASSWORD_KUAT
```

`SUPABASE_PUBLISHABLE_KEY` server adalah key publishable yang sama, bukan service-role key. Beberapa nilai server tidak wajib untuk sekadar menjalankan UI; `SUPABASE_SERVICE_ROLE_KEY` dan password demo hanya diperlukan bila menjalankan seed akun demo.

Gunakan URL dari project yang sama untuk semua variable Supabase. Jangan menaruh secret di source code, screenshot, pesan, atau Git. File `.env.local` diabaikan Git melalui `.gitignore`. Jika environment diubah, hentikan lalu jalankan ulang dev server.

## 5. Jalankan aplikasi

Dari root project:

```sh
npm run dev
```

Buka alamat yang ditampilkan terminal. Konfigurasi Vite menggunakan port `3000` bila tersedia; jika port sudah dipakai, Vite dapat memilih port lain.

Untuk menghentikan server, tekan `Ctrl+C` pada terminal yang menjalankan dev server.

### Coba alur aplikasi

1. Buka halaman aplikasi, lalu pilih **Buat akun MNC Studio** untuk registrasi user, atau login dengan akun yang sudah dibuat.
2. Lengkapi nama, email, nomor telepon, divisi, dan password. Password minimal 6 karakter.
3. Jika konfirmasi email aktif, buka tautan di email sebelum login.
4. Setelah login, user dapat melihat katalog dan mengajukan booking pada studio yang tersedia.
5. Admin login melalui halaman yang sama; navigasi **Verifikasi** dan manajemen studio tampil jika akun memiliki role `admin`.
6. Gunakan **Booking Saya** untuk melihat dan membatalkan booking pending milik sendiri.

Pendaftaran dari UI hanya memberi role `user`. Role Admin harus diberikan oleh pemilik project melalui skrip seed atau proses server-side tepercaya.

## 6. Buat akun dan role Admin

### Opsi A: registrasi biasa

Daftar melalui halaman aplikasi. Akun baru otomatis memperoleh role `user` dari trigger `on_auth_user_created`; profil dibuat di `public.profiles`. Gunakan cara ini untuk akun user biasa.

### Opsi B: akun demo

Skrip `scripts/seed-demo-users.mjs` membuat atau memastikan akun demo `admin@mnc.com` (role Admin) dan `user@mnc.com` (role User). Skrip menggunakan Supabase Admin API, bukan insert langsung ke `auth.users`. Skrip tidak menampilkan password dan tidak mereset password user yang sudah ditemukan.

1. Isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MNC_DEMO_ADMIN_PASSWORD`, dan `MNC_DEMO_USER_PASSWORD` di `.env.local`.
2. Gunakan password demo yang kuat dan patuhi aturan password project Supabase. Jangan gunakan password demo pada produksi.
3. Jalankan:

   ```sh
   npm run seed:demo-users
   ```

4. Pastikan skrip selesai sukses. Periksa akun melalui **Authentication → Users** dan role melalui query verifikasi di bawah.

Jangan pernah menjalankan skrip seed dengan URL project produksi kecuali memang telah disetujui dan dipahami dampaknya. `SUPABASE_SERVICE_ROLE_KEY` memiliki hak istimewa tinggi dan hanya boleh digunakan pada lingkungan terpercaya.

## 7. Verifikasi data Supabase

### Periksa kolom status studio dan booking

Jalankan di Supabase SQL Editor:

```sql
select table_name, column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'studios' and column_name = 'availability_status')
    or (
      table_name = 'bookings'
      and column_name in (
        'start_time',
        'end_time',
        'pic_contact',
        'production_purpose',
        'notes'
      )
    )
  )
order by table_name, ordinal_position;
```

Schema aplikasi akhir memakai `studios.availability_status` dengan enum `studio_availability`. Tabel booking memakai `start_time` dan `end_time` bertipe timestamp serta kolom `pic_contact`, `production_purpose`, dan `notes`.

### Lihat studio

```sql
select id, name, category, availability_status, is_active
from public.studios
order by name;
```

### Lihat akun dan role

```sql
select u.id, u.email, r.role, p.full_name, p.division
from auth.users as u
left join public.profiles as p on p.id = u.id
left join public.user_roles as r on r.user_id = u.id
order by u.email, r.role;
```

### Lihat booking

```sql
select
  id,
  studio_id,
  user_id,
  requester_name,
  pic_name,
  pic_contact,
  division,
  production_purpose,
  start_time,
  end_time,
  status,
  notes
from public.bookings
order by start_time desc;
```

## 8. Tes, lint, dan build

Perintah yang tersedia:

```sh
npm test                 # Jalankan tes Vitest sekali
npm run test:watch       # Jalankan tes dalam mode watch
npm run lint             # Jalankan ESLint
npx tsc --noEmit         # Periksa tipe TypeScript
npx drizzle-kit check    # Periksa metadata migration lokal
npm run build            # Build aplikasi untuk produksi
npm run preview          # Sajikan hasil build secara lokal
```

Jalankan `npm run build` sebelum preview. `npm run preview` bukan pengganti hosting produksi.

Sebelum rilis, uji dengan project Supabase non-produksi: registrasi dan login, konfirmasi email (jika aktif), katalog, status studio `available` dan `maintenance`, booking waktu mendatang, penolakan jam lewat, pencegahan bentrok, pembatalan booking sendiri, approval/rejection admin, serta batasan akses user biasa. Tes unit lokal tidak menggantikan pengujian RLS pada Supabase.

## 9. Deployment

Hosting produksi belum ditetapkan di repository ini. Untuk deployment:

1. Pilih platform yang mendukung aplikasi TanStack Start dan runtime server hasil build.
2. Atur perintah build `npm ci` lalu `npm run build`, sesuai persyaratan Node.js di atas.
3. Konfigurasikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` pada environment build.
4. Konfigurasikan `SUPABASE_URL` serta `SUPABASE_PUBLISHABLE_KEY` di runtime server jika runtime/server middleware memerlukannya.
5. Jangan pasang `SUPABASE_SERVICE_ROLE_KEY` di environment browser. Atur hanya pada job/server tepercaya yang benar-benar memerlukan Supabase Admin API.
6. Terapkan migration ke project Supabase target dengan urutan dan pemeriksaan pada bagian [Siapkan database](#3-siapkan-database).
7. Tambahkan domain produksi ke Supabase Auth Redirect URLs dan uji login, reset password, RLS, serta alur user/admin.
8. Hapus/nonaktifkan akun demo dan pastikan akun Admin memakai kredensial individual yang kuat.

Jangan mengekspos dev server sebagai hosting publik. Sesuaikan runtime dan konfigurasi environment dengan dokumentasi platform deployment yang dipilih.

## Keamanan

- RLS aktif pada tabel data internal. User hanya boleh melihat booking miliknya; perubahan studio dan persetujuan booking dibatasi kepada Admin.
- Publishable key bukan pengganti RLS. Pertahankan RLS dan policies dari migration.
- Secret/service-role key melewati RLS. Jangan pernah mengirimnya ke client, memberi prefix `VITE_`, menyimpan di Git, atau menaruhnya di log.
- Jangan menambah role Admin pada metadata/form registrasi. Hak Admin berasal dari `public.user_roles`.
- Jangan membuat user dengan menulis langsung ke schema internal `auth`. Gunakan Supabase Auth atau Supabase Admin API.
- Simpan backup sebelum migration yang mengubah atau menghapus kolom.

## Pemecahan masalah

### Environment Supabase tidak ditemukan

Pastikan `.env.local` berada di root project, nama variable dan URL/key benar, dan URL/key berasal dari project yang sama. Restart Vite setelah mengubah file environment. Server middleware juga dapat memerlukan `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY`.

### Error `Could not find the '...' column ... in the schema cache`

Nama kolom di database belum sesuai dengan schema aplikasi, atau PostgREST belum memuat schema terbaru. Periksa kolom dengan query di bagian [Verifikasi data Supabase](#7-verifikasi-data-supabase), pastikan migration yang sesuai sudah berhasil, lalu muat ulang schema PostgREST bila diperlukan. Jangan sekadar menambahkan kolom tanpa memastikan nama dan tipe kolom lain juga cocok.

### Status studio berbeda dari database

Pastikan aplikasi dan Supabase Dashboard mengarah ke project yang sama. Schema akhir aplikasi membaca `public.studios.availability_status`, bukan `status`. Periksa nilai enum, browser DevTools → Network/Console, dan hasil query studio. Katalog tidak memakai mock data sebagai fallback.

### Tabel ada tetapi aplikasi gagal membaca data

- Pastikan Data API/PostgREST aktif dan user telah login.
- Periksa error Supabase di browser DevTools.
- Pastikan RLS policy dan role pengguna benar.
- Pastikan schema database sesuai dengan migration akhir.
- Jangan menonaktifkan RLS untuk mengatasi error.

### User terdaftar tetapi profil/role tidak ada

Periksa trigger `on_auth_user_created` dan function `handle_new_user()` di Supabase. User yang mendaftar lewat aplikasi memperoleh role `user`; akun Admin memerlukan proses pemberian role tepercaya.

### Admin tidak dapat membuka dashboard

Pastikan user memiliki baris `admin` di `public.user_roles`. Keluar lalu login kembali agar aplikasi memuat ulang role. Jangan mengubah role lewat browser.

### Booking gagal

Pastikan waktu mulai berada di masa depan, waktu selesai setelah waktu mulai, studio aktif dan tersedia, serta jadwal tidak bentrok. Jika error menyebut nama kolom tidak ditemukan, selesaikan pemeriksaan/migrasi schema terlebih dahulu.

### Reset password tidak kembali ke aplikasi

Pastikan domain yang sedang dipakai (termasuk `http://localhost:3000` untuk development) ada di **Authentication → URL Configuration → Redirect URLs** Supabase.

### Migration gagal

Jangan mengulang file migration dari awal secara membabi buta. Simpan pesan error lengkap, periksa kolom/enum/function/trigger yang sudah terbentuk, pastikan database target benar, dan buat backup sebelum memperbaiki state database. Migration 0001 mensyaratkan schema awal 0000 dan dapat berhenti jika ada booking `completed`.

## Struktur database

| Objek | Penggunaan |
|---|---|
| `auth.users` | Identitas dan autentikasi yang dikelola Supabase Auth. |
| `public.profiles` | Profil internal: nama, email, nomor kontak, divisi, dan waktu perubahan. |
| `public.user_roles` | Role `user`/`admin`, dengan primary key gabungan user dan role. |
| `public.studios` | Katalog studio: kategori, lokasi, kapasitas, fasilitas, divisi, foto, `availability_status`, dan `is_active`. |
| `public.bookings` | Jadwal, pemohon, PIC/kontak, divisi, keperluan, status, dan catatan. |
| `public.studio_equipment` | Inventaris studio, jumlah, kondisi, dan catatan. |
| `public.booking_logs` | Audit pembuatan booking dan perubahan status. |

Enum utama:

- `app_role`: `user`, `admin`
- `studio_category`: `tv`, `radio`, `podcast`, `dubbing`, `green_screen`
- `studio_availability`: `available`, `maintenance`
- `booking_status`: `pending`, `approved`, `rejected`, `cancelled`

Constraint exclusion di PostgreSQL mencegah booking dengan status `pending` atau `approved` bertumpuk untuk studio yang sama. Validasi browser membantu pengalaman pengguna, tetapi database tetap menjadi perlindungan terakhir terhadap request yang bersamaan.
