# Sentuhan Kecil — Website Layanan Pijat Bayi

Website layanan pijat bayi dengan frontend responsif, REST API Node.js/Express, dan database MySQL/MariaDB.

## Cakupan fitur

- **Beranda & Katalog**: hero, kategori, pencarian, pengurutan, kartu produk, produk favorit — seluruh data diambil dari database.
- **Keranjang Belanja**: tambah produk, ubah jumlah, hapus produk, hitung subtotal.
- **Pemesanan & Checkout**: alamat penerima, pilihan pengiriman, ringkasan pesanan. Harga dan ongkir dihitung ulang di server.
- **Pembayaran**: simulasi QRIS, Virtual Account, dan kartu debit/kredit.
- **Autentikasi**: daftar & masuk dengan password ter-hash (bcrypt) dan sesi JWT.
- **Riwayat Pesanan**: pesanan tersimpan permanen di tabel `orders` dan `order_items`.

## Prasyarat

- Node.js 18 atau lebih baru
- MySQL / MariaDB berjalan di `localhost:3306` (mis. XAMPP, Laragon, atau Homebrew MySQL)

## Menjalankan

```bash
npm install          # pasang dependensi
cp .env.example .env # sesuaikan kredensial database bila perlu
npm start            # jalankan server
```

Sebelum menjalankan server, impor `database/schema.sql` untuk membuat database
beserta seluruh tabel dan view-nya.

Setelah itu, jalankan `database/migrations/001_baby_massage_catalog.sql` pada
`sentuhan_kecil_db` untuk menambahkan kategori serta draft layanan pijat bayi.
Migration ini menonaktifkan katalog demo lama tanpa menghapus datanya.

Untuk database yang sudah berjalan, jalankan migration berikut secara berurutan
agar konten situs, jadwal booking, durasi layanan, dan pilihan spa/massage tersedia:

```bash
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/002_site_content.sql
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/003_appointments_and_payments.sql
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/004_massage_services.sql
mysql -u root -h 127.0.0.1 -P 3306 sentuhan_kecil_db < database/migrations/005_seed_spa_massage_services.sql
```

Migration `005` aman dijalankan ulang; data dummy akan diperbarui berdasarkan slug layanan.

Untuk database lama, jalankan `database/migrations/003_appointments_and_payments.sql`
satu kali agar pesanan menyimpan tanggal/jam sesi serta status pembayaran.
Instalasi baru sudah mendapat kolom tersebut melalui `schema.sql`.

Untuk membuat admin pertama, isi `BOOTSTRAP_ADMIN_EMAIL` dan
`BOOTSTRAP_ADMIN_PASSWORD` (minimal 12 karakter) di `.env`, lalu jalankan
`npm run admin:create`. Bootstrap tidak akan mengubah akun yang sudah ada.
Admin dapat mengganti password setelah masuk melalui menu **Akun & keamanan**.

Lalu buka **`http://localhost:3000`**.

> ⚠️ **Jangan buka lewat Live Server VS Code** (`127.0.0.1:5500/public/index.html`)
> atau klik ganda `index.html`. Keduanya hanya menyajikan file statis tanpa `/api`,
> sehingga tidak ada data yang masuk ke MySQL. Halaman akan menampilkan banner
> merah bila dibuka dari alamat yang keliru.

### Menyiapkan database secara manual

Bila lebih suka lewat phpMyAdmin atau klien MySQL, impor skema berikut:

```bash
mysql -u root -h 127.0.0.1 -P 3306 < database/schema.sql
```

`schema.sql` adalah sumber skema database yang lengkap dan menjadi acuan saat
database dibuat ulang. Jika ada perubahan struktur database, buat berkas
migrasi baru di `database/`, jalankan migrasi tersebut pada database yang sudah
berjalan, lalu terapkan perubahan yang sama ke `schema.sql` agar keduanya tetap
sinkron. Data awal/demo tidak dikelola sebagai berkas terpisah.

## Struktur database (`sentuhan_kecil_db`)

| Tabel | Isi |
| --- | --- |
| `categories` | Kategori produk (Elektronik, Fashion, Rumah) |
| `products` | Produk katalog: harga, harga coret, rating, stok, badge, gambar |
| `users` | Akun pelanggan beserta hash password |
| `carts` | Satu keranjang per akun, atau per pengunjung tamu (`session_token`) |
| `cart_items` | Isi keranjang: produk dan jumlahnya |
| `favorites` | Wishlist milik akun atau sesi tamu |
| `orders` | Header pesanan: kode, status, subtotal, ongkir, total, alamat |
| `order_items` | Rincian item pesanan; `line_total` kolom terhitung otomatis |
| `newsletter_subscribers` | Email pendaftar newsletter |
| `announcements` | Berita/pengumuman admin, draft atau diterbitkan |
| `v_catalog` | View katalog siap tampil untuk homepage |

## Endpoint API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/products?category=&q=&sort=` | Daftar produk (sort: `featured`, `lowest`, `highest`, `rating`) |
| GET | `/api/products/:id` | Detail satu produk |
| GET | `/api/categories` | Kategori beserta jumlah produk |
| GET | `/api/announcements` | Berita/pengumuman yang sudah diterbitkan |
| POST | `/api/auth/register` | Daftar akun baru |
| POST | `/api/auth/login` | Masuk; JWT dikirim sebagai cookie httpOnly |
| POST | `/api/auth/logout` | Keluar dan menghapus cookie sesi |
| GET | `/api/auth/me` | Profil akun yang sedang masuk |
| PATCH | `/api/auth/password` | Ganti password akun yang sedang masuk |
| GET | `/api/cart` | Isi keranjang beserta subtotal |
| POST | `/api/cart/items` | Tambah produk ke keranjang |
| PATCH | `/api/cart/items/:productId` | Ubah jumlah (0 = hapus) |
| DELETE | `/api/cart/items/:productId` | Hapus produk dari keranjang |
| GET | `/api/orders` | Riwayat pesanan (harus masuk) |
| POST | `/api/orders` | Buat pesanan dari keranjang (harus masuk) |
| GET | `/api/favorites` | Daftar produk favorit |
| POST | `/api/favorites/:productId` | Tambah/hapus favorit |
| POST | `/api/newsletter` | Daftar newsletter |
| POST | `/api/admin/uploads/images` | Upload gambar JPG/PNG/WEBP/GIF (maks. 5 MB, admin) |
| GET/POST | `/api/admin/announcements` | Daftar dan buat berita/pengumuman (admin) |
| PATCH/DELETE | `/api/admin/announcements/:id` | Ubah atau hapus berita/pengumuman (admin) |
| PATCH | `/api/admin/orders/:id/payment-status` | Catat status pembayaran manual (admin) |
| PATCH | `/api/admin/orders/:id/appointment-status` | Ubah status konfirmasi sesi (admin) |

Seluruh endpoint keranjang dan favorit bisa dipakai tanpa masuk akun: pemiliknya
ditentukan dari cookie sesi. Saat pengunjung masuk atau mendaftar, keranjang dan
favorit tamunya otomatis dipindahkan ke akun tersebut.

## Struktur folder

```text
e-commerce/
├── public/                     # frontend statis
│   ├── index.html              # halaman toko
│   ├── dashboard.html          # panel admin
│   ├── css/                    # stylesheet halaman aktif
│   ├── js/                     # JavaScript halaman aktif
│   └── assets/                 # gambar dan stylesheet bersama
├── server/                     # REST API Express
│   ├── config/db.js            # connection pool mysql2
│   ├── controllers/            # logika request per domain
│   ├── middleware/auth.js      # JWT
│   ├── middleware/imageUpload.js # validasi dan penyimpanan upload gambar
│   ├── routes/                 # public, auth, commerce, dan admin
│   │   ├── index.js
│   │   ├── publicRoutes.js
│   │   ├── authRoutes.js
│   │   ├── commerceRoutes.js
│   │   └── adminRoutes.js
│   └── server.js
├── database/
│   ├── schema.sql              # DDL seluruh tabel + view
├── .env.example
└── package.json
```

## Catatan implementasi

Unggahan gambar disimpan di `public/uploads/` dan dibatasi ke JPG, PNG, WEBP, atau GIF maksimal 5 MB. Berkas upload lokal diabaikan oleh Git.

**Tidak ada data yang disimpan di browser.** Keranjang, favorit, akun, dan pesanan
seluruhnya berada di MySQL. Browser hanya memegang dua cookie httpOnly yang tidak
bisa dibaca JavaScript:

- `lokamart_sid` — penanda sesi pengunjung, menautkan keranjang & favorit tamu ke barisnya di database.
- `lokamart_token` — JWT sesi login.

Saat checkout, isi keranjang dibaca server langsung dari tabel `cart_items`; harga,
ongkir, dan stok dihitung ulang di server, lalu pesanan dibuat, stok dikurangi, dan
keranjang dikosongkan dalam satu transaksi. Jadwal sesi masih merupakan permintaan
yang menunggu konfirmasi admin. Pembayaran dicatat manual dan belum terhubung ke
payment gateway atau notifikasi otomatis.
