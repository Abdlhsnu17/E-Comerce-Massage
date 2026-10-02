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

- Node.js 18+
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
| GET | `/api/favorites` | Daftar wishlist |
| POST | `/api/favorites/:productId` | Tambah atau hapus favorit |
| POST | `/api/newsletter` | Daftar newsletter |
| GET/POST | `/api/admin/announcements` | Kelola pengumuman admin |
| PATCH/DELETE | `/api/admin/announcements/:id` | Edit atau hapus pengumuman |
| GET/POST | `/api/admin/products` | Lihat atau tambah layanan di katalog |
| PATCH/DELETE | `/api/admin/products/:id` | Edit atau hapus layanan |
| PATCH | `/api/admin/orders/:id/payment-status` | Update status pembayaran |
| PATCH | `/api/admin/orders/:id/appointment-status` | Update status sesi |

## Data dan aturan bisnis

- Data produk, user, keranjang, wishlist, pesanan, dan pengumuman disimpan di MySQL.
- Keranjang dan favorit dapat ditautkan ke sesi tamu maupun user yang sudah login.
- Saat user login, keranjang tamu akan dicatat dan dipindahkan ke akun tersebut.
- Harga, ongkir, dan ketersediaan dihitung di server sebelum order dibuat.
- Jadwal layanan memerlukan konfirmasi admin sebelum status sesi diperbarui.
- Pembayaran saat ini dicatat secara manual; belum terhubung ke gateway pembayaran pihak ketiga.

## Catatan penting

- Upload gambar disimpan di folder `public/uploads/`.
- File gambar yang diunggah dibatasi ke format JPG, PNG, WEBP, atau GIF.
- File upload lokal biasanya diabaikan oleh Git.
- Aplikasi menggunakan cookie HTTP-only untuk sesi dan autentikasi.
- Reset password menggunakan token sekali pakai yang berlaku 30 menit. Atur variabel SMTP di `.env` untuk pengiriman email. Dalam development tanpa SMTP, tautan reset dicetak di terminal server; production akan menolak pengiriman sampai SMTP dikonfigurasi.

## Troubleshooting

### Database tidak terhubung

Pastikan MySQL/MariaDB sudah berjalan dan file `database/schema.sql` sudah diimpor.

### Error `JWT_SECRET` kosong

Isi field `JWT_SECRET` di `.env` dengan string acak yang aman.

### Halaman kosong atau error saat akses

Pastikan aplikasi dibuka melalui `http://localhost:3000`, bukan dari file HTML langsung.

## Lisensi

Project ini dibuat untuk kebutuhan internal bisnis dan dapat dikembangkan lebih lanjut sesuai kebutuhan operasional.
