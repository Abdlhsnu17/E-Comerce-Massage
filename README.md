# Aera Baby Spa

Aera Baby Spa adalah platform booking dan penjualan layanan pijat bayi serta spa keluarga berbasis web. Aplikasi ini dibangun dengan Node.js, Express, dan MySQL, dengan arsitektur API dan frontend statis yang memudahkan pengelolaan katalog, keranjang belanja, checkout, dan panel admin.

## Ringkasan proyek

Proyek ini dirancang untuk bisnis layanan pijat bayi yang ingin menawarkan:

- katalog layanan dengan deskripsi, durasi, harga, dan stok;
- fitur keranjang belanja berbasis sesi untuk pengunjung dan akun terdaftar;
- proses checkout dan pemesanan dengan detail jadwal, lokasi, serta metode pembayaran;
- dashboard admin untuk mengelola layanan, pengumuman, dan status pesanan;
- autentikasi pengguna dan pengelola dengan sesi serta password terenkripsi.

## Fitur utama

- Beranda dan katalog layanan pijat bayi
- Search, kategori, dan detail produk/layanan
- Keranjang belanja dan wishlist
- Checkout dengan data penerima dan metode pembayaran
- Manajemen tanggal, waktu, dan lokasi sesi layanan
- Autentikasi pengguna (register/login/logout)
- Dashboard admin untuk mengelola konten dan order
- Pengumuman dan newsletter
- Upload gambar produk/layanan oleh admin

## Stack teknologi

- Node.js
- Express.js
- MySQL / MariaDB
- mysql2
- bcryptjs
- JWT
- cookie-parser
- multer

## Prasyarat

- Node.js 20+ (sesuai kebutuhan Nodemailer 10)
- MySQL / MariaDB yang berjalan di localhost:3306
- Access ke database dengan user yang memiliki hak membuat database dan tabel

## Persiapan lingkungan

Salin file contoh konfigurasi ke file `.env`:

```bash
cp .env.example .env
```

Lalu sesuaikan nilai berikut sesuai environment lokal Anda:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sentuhan_kecil_db
JWT_SECRET=isi_dengan_string_acak_minimal_32_karakter
JWT_EXPIRES_IN=7d
BOOTSTRAP_ADMIN_EMAIL=admin@email.com
BOOTSTRAP_ADMIN_NAME=Administrator Aera Baby Spa
BOOTSTRAP_ADMIN_PASSWORD=PasswordMinimal12Karakter
APP_URL=http://localhost:3000
# Konfigurasi SMTP untuk fitur lupa password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=username
SMTP_PASS=password-aplikasi-atau-api-key
MAIL_FROM="Aera Baby Spa <no-reply@example.com>"
# Instruksi pembayaran yang tampil pada checkout/riwayat
BANK_NAME="Bank Mandiri"
BANK_ACCOUNT_NUMBER=9000050103739
BANK_ACCOUNT_HOLDER="HAFSAH QUROTUN AINI"
# URL publik gambar QRIS merchant yang aktif (PNG/JPG); kosong memakai tampilan penanda QRIS.
QRIS_IMAGE_URL=https://domain-anda/assets/img/qris-merchant.png
```

## Menjalankan aplikasi

1. Install dependency:

```bash
npm install
```

2. Impor skema database:

```bash
mysql -u root -h 127.0.0.1 -P 3306 < database/schema.sql
```

Setelah `git pull`, jalankan migrasi sebelum me-restart aplikasi. Perintah ini
aman dijalankan berulang karena migrasi yang berhasil dicatat di tabel
`schema_migrations`:

```bash
npm run db:migrate
sudo systemctl restart aera-baby-spa
```

Jika konfigurasi database hanya tersimpan di `/etc/aera-baby-spa.env`, jalankan
migrasi manual dengan environment tersebut:

```bash
sudo ENV_FILE=/etc/aera-baby-spa.env npm run db:migrate
```

Untuk deployment systemd berikutnya, seluruh langkah tersebut dapat dijalankan
dengan satu perintah dari folder aplikasi (default branch `main`):

```bash
npm run deploy:update
```

Skrip juga memasang ulang unit systemd sehingga `EnvironmentFile` yang benar
dipakai oleh migrasi sebelum aplikasi start. Skrip akan berhenti bila ada
perubahan lokal di VPS agar file produksi tidak tertindih tanpa sengaja. Jika
branch deployment berbeda, gunakan `DEPLOY_BRANCH=nama-branch npm run deploy:update`.

Untuk database lama yang sudah berjalan, terapkan migrasi jadwal terbaru:

```bash
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/013_booking_schedule.sql
```

Lalu terapkan audit log admin:

```bash
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/014_admin_audit_logs.sql
```

Lalu terapkan pembatalan sesi setelah perubahan password:

```bash
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/015_session_version.sql
```

Lalu terapkan dukungan multi-terapis:

```bash
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/016_therapists.sql
```

3. Jalankan server:

```bash
npm start
```

Untuk mode development:

```bash
npm run dev
```

Aplikasi akan berjalan di:

```text
http://localhost:3000
```

## Deploy ke VPS (Ubuntu + Nginx)

Gunakan Node.js 20+, MySQL/MariaDB, dan Nginx. Aplikasi hanya mendengarkan di `127.0.0.1`, sehingga akses publik harus melalui Nginx dan HTTPS.

1. Salin kode ke `/var/www/aera-baby-spa`, jalankan `npm ci --omit=dev`, lalu impor `database/schema.sql` pada database baru.
2. Buat `/etc/aera-baby-spa.env` dengan permission `600` dan milik user root. Isi setidaknya `NODE_ENV=production`, `PORT=3000`, `TRUST_PROXY=1`, koneksi database, `JWT_SECRET` acak minimal 32 karakter, `APP_URL=https://domain-anda`, dan seluruh variabel SMTP.
3. Buat direktori upload dan berikan akses hanya ke user aplikasi: `sudo install -d -o www-data -g www-data /var/www/aera-baby-spa/public/uploads`.
4. Salin [unit systemd](deploy/aera-baby-spa.service) ke `/etc/systemd/system/aera-baby-spa.service`; sesuaikan path Node bila perlu. Lalu jalankan `sudo systemctl daemon-reload && sudo systemctl enable --now aera-baby-spa`.
5. Salin [konfigurasi Nginx](deploy/nginx-aera-baby-spa.conf), ganti domain dan lokasi sertifikat TLS, validasi dengan `sudo nginx -t`, lalu reload Nginx.
6. Pastikan `https://domain-anda/health` membalas `{"status":"ok"}` dan `https://domain-anda/ready` membalas `{"status":"ready"}`. Endpoint `ready` juga memeriksa koneksi database. Backup database dan `public/uploads/` secara berkala.

Jangan membuka port 3000 dari internet. Buka hanya 80/443 pada firewall dan gunakan sertifikat TLS yang aktif sebelum mengarahkan domain produksi.

## Backup harian

Skrip [backup-aera-baby-spa.sh](deploy/backup-aera-baby-spa.sh) membuat backup MySQL dan folder upload bertanggal. Tambahkan `BACKUP_DIR`, `UPLOADS_DIR`, dan `BACKUP_RETENTION_DAYS` pada file environment server, lalu jadwalkan setiap hari, misalnya pukul 02.15:

```cron
15 2 * * * /var/www/aera-baby-spa/deploy/backup-aera-baby-spa.sh /etc/aera-baby-spa.env >> /var/log/aera-backup.log 2>&1
```

Lakukan uji pemulihan backup secara berkala di database terpisah sebelum mengandalkannya untuk produksi.

## Deploy dengan Docker Compose

Alternatif deployment yang dapat direproduksi tersedia melalui Docker Compose. Compose menjalankan aplikasi Node.js dan MariaDB, sementara Nginx pada host tetap menangani HTTPS dan meneruskan trafik ke `127.0.0.1:3000`.

1. Instal Docker Engine dan Docker Compose plugin di VPS.
2. Masuk ke folder `docker/`, lalu salin `.env.example` menjadi `.env`; isi seluruh secret, domain HTTPS, dan SMTP. Jangan gunakan password contoh atau commit file `.env`.
3. Pastikan konfigurasi Nginx pada [deploy/nginx-aera-baby-spa.conf](deploy/nginx-aera-baby-spa.conf) sudah memakai domain dan sertifikat Anda.
4. Dari folder `docker/`, jalankan `docker compose up -d --build`. Container
   aplikasi otomatis menjalankan `npm run db:migrate` sebelum server dimulai.
5. Cek dengan `docker compose ps`, `docker compose logs -f app`, dan `curl https://domain-anda/health`.

Database dan gambar upload disimpan pada Docker volume `mariadb_data` dan `app_uploads`. Keduanya harus masuk prosedur backup. Jangan menjalankan `docker compose down -v` di production karena perintah tersebut menghapus volume database dan upload.

> Penting: jangan membuka file HTML langsung dari browser melalui Live Server atau double-click pada file `public/index.html`. Aplikasi membutuhkan server Express dan API di `/api` agar data dan sesi bisa berjalan dengan benar.

## Membuat admin pertama

Setelah `.env` diisi, jalankan perintah berikut:

```bash
npm run admin:create
```

Perintah ini akan membuat akun admin pertama bila belum ada. Jika admin sudah terdaftar, proses bootstrap akan berhenti tanpa mengganti akun yang ada.

## Struktur proyek

```text
E-Comerce/
├── database/
│   ├── schema.sql
│   └── migrations/
├── public/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── dashboard.html
│   └── index.html
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── app.js
│   ├── server.js
│   └── ...
├── .env.example
├── package.json
├── README.md
└── PRD.md
```

## API utama

Berikut endpoint penting yang tersedia di aplikasi:

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/products` | Daftar produk/layanan |
| GET | `/api/products/:id` | Detail satu layanan |
| GET | `/api/categories` | Daftar kategori |
| GET | `/api/announcements` | Pengumuman publik |
| POST | `/api/auth/register` | Registrasi pengguna |
| POST | `/api/auth/login` | Login ke aplikasi |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/password-reset` | Meminta tautan reset password via email |
| POST | `/api/auth/password-reset/confirm` | Menyimpan password baru memakai token reset |
| GET | `/api/auth/me` | Profil user yang sedang login |
| GET | `/api/cart` | Data keranjang |
| POST | `/api/cart/items` | Tambah item ke keranjang |
| PATCH | `/api/cart/items/:productId` | Ubah jumlah item |
| DELETE | `/api/cart/items/:productId` | Hapus item |
| GET | `/api/orders` | Riwayat pesanan user |
| POST | `/api/orders` | Buat pesanan baru |
| POST | `/api/orders/:id/payment-proof` | Unggah bukti transfer bank |
| POST | `/api/orders/:id/payment/refresh` | Sinkronkan status QRIS dengan gateway |
| POST | `/api/orders/:id/change-request` | Ajukan perubahan jadwal atau pembatalan |
| GET | `/api/favorites` | Daftar wishlist |
| POST | `/api/favorites/:productId` | Tambah atau hapus favorit |
| POST | `/api/newsletter` | Daftar newsletter |
| GET/POST | `/api/admin/announcements` | Kelola pengumuman admin |
| PATCH/DELETE | `/api/admin/announcements/:id` | Edit atau hapus pengumuman |
| GET/POST | `/api/admin/products` | Lihat atau tambah layanan di katalog |
| PATCH/DELETE | `/api/admin/products/:id` | Edit atau hapus layanan |
| PATCH | `/api/admin/orders/:id/payment-status` | Update status pembayaran |
| PATCH | `/api/admin/orders/:id/appointment-status` | Update status sesi |
| GET/PATCH | `/api/admin/order-change-requests[/:id]` | Lihat dan proses permintaan perubahan pelanggan |
| GET/POST/PATCH/DELETE | `/api/admin/coupons[/:id]` | Kelola voucher dan periode promo |
| GET/PATCH | `/api/admin/schedule-settings` | Kelola jam dan hari operasional booking |
| GET/DELETE | `/api/admin/newsletter-subscribers[/:id]` | Lihat atau hapus subscriber newsletter |
| GET | `/api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD` | Laporan penjualan berdasarkan periode |
| GET | `/api/admin/audit-logs` | Riwayat perubahan yang dilakukan admin |
| GET/POST/PATCH/DELETE | `/api/admin/therapists[/:id]` | Kelola terapis aktif dan kapasitas booking |

## Data dan aturan bisnis

- Data produk, user, keranjang, wishlist, pesanan, dan pengumuman disimpan di MySQL.
- Keranjang dan favorit dapat ditautkan ke sesi tamu maupun user yang sudah login.
- Saat user login, keranjang tamu akan dicatat dan dipindahkan ke akun tersebut.
- Harga, ongkir, dan ketersediaan dihitung di server sebelum order dibuat.
- Jadwal layanan memerlukan konfirmasi admin sebelum status sesi diperbarui.
- QRIS berlaku 15 menit dan dikonfirmasi otomatis oleh webhook Midtrans. Transfer bank berlaku 24 jam, kemudian bukti transfer diverifikasi admin. Booking yang tidak dibayar akan kedaluwarsa dan slot serta stok dilepas otomatis.
- Pembayaran tunai hanya tersedia untuk sesi di studio. Invoice tersedia setelah pembayaran dikonfirmasi; sebelumnya pelanggan melihat ringkasan booking.

## Catatan penting

- Upload gambar disimpan di folder `public/uploads/`.
- File gambar yang diunggah dibatasi ke format JPG, PNG, WEBP, atau GIF.
- File upload lokal biasanya diabaikan oleh Git.
- Aplikasi menggunakan cookie HTTP-only untuk sesi dan autentikasi.
- Semua request API yang mengubah data memakai token CSRF pada header; frontend mengelolanya otomatis. Webhook pembayaran Midtrans tetap diamankan oleh signature gateway.
- Reset password menggunakan token sekali pakai yang berlaku 30 menit. Atur variabel SMTP di `.env` untuk pengiriman email. Dalam development tanpa SMTP, tautan reset dicetak di terminal server; production akan menolak pengiriman sampai SMTP dikonfigurasi.
- Dengan SMTP aktif, pelanggan menerima email setelah booking dibuat, status pesanan/pembayaran/jadwal diubah, serta permintaan ubah jadwal atau pembatalan diproses. Pengiriman email berjalan setelah transaksi tersimpan sehingga gangguan SMTP tidak membatalkan pesanan.

## Troubleshooting

### Database tidak terhubung

Pastikan MySQL/MariaDB sudah berjalan dan file `database/schema.sql` sudah diimpor.

### Error `JWT_SECRET` kosong

Isi field `JWT_SECRET` di `.env` dengan string acak yang aman.

### Halaman kosong atau error saat akses

Pastikan aplikasi dibuka melalui `http://localhost:3000`, bukan dari file HTML langsung.

## Lisensi

Project ini dibuat untuk kebutuhan internal bisnis dan dapat dikembangkan lebih lanjut sesuai kebutuhan operasional.

## Pembayaran QRIS dinamis

QRIS memakai Midtrans Core API agar nominal mengikuti total keranjang dan status dibayar berasal dari notifikasi gateway. Jalankan migrasi `database/migrations/009_dynamic_qris.sql`, lalu isi:

Jika migrasi `009` sudah pernah dijalankan sebelumnya, jalankan juga `database/migrations/010_mandiri_payment_settings.sql` untuk memasukkan rekening Mandiri ke database.

Untuk instalasi yang sudah berjalan, jalankan juga `database/migrations/012_payment_lifecycle.sql` agar tenggat pembayaran, bukti transfer, dan status booking baru tersedia.

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_QRIS_ACQUIRER=gopay
QRIS_PAYMENT_MINUTES=15
TRANSFER_PAYMENT_HOURS=24
BANK_NAME=Bank Mandiri
BANK_ACCOUNT_NUMBER=9000050103739
BANK_ACCOUNT_HOLDER=HAFSAH QUROTUN AINI
```

Atur Payment Notification URL pada dashboard Midtrans ke:

```text
https://domain-anda.example/api/payments/midtrans/notification
```

Untuk produksi, gunakan Server Key produksi, set `MIDTRANS_IS_PRODUCTION=true`, dan pastikan endpoint memakai HTTPS publik.
