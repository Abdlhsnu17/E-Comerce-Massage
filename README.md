# LokaMart — Website Penjualan

Website e-commerce responsif dengan frontend statis, REST API Node.js/Express, dan database MySQL/MariaDB.

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
npm run db:setup     # buat database lokamart_db + isi data awal
npm start            # jalankan server
```

Lalu buka **`http://localhost:3000`**.

> ⚠️ **Jangan buka lewat Live Server VS Code** (`127.0.0.1:5500/public/index.html`)
> atau klik ganda `index.html`. Keduanya hanya menyajikan file statis tanpa `/api`,
> sehingga tidak ada data yang masuk ke MySQL. Halaman akan menampilkan banner
> merah bila dibuka dari alamat yang keliru.

Akun demo: **demo@lokamart.id** / **demo1234**

### Menyiapkan database secara manual

Bila lebih suka lewat phpMyAdmin atau klien MySQL, impor dua berkas ini berurutan:

```bash
mysql -u root -h 127.0.0.1 -P 3306 < database/schema.sql
mysql -u root -h 127.0.0.1 -P 3306 lokamart_db < database/seed.sql
```

## Struktur database (`lokamart_db`)

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
| `v_catalog` | View katalog siap tampil untuk homepage |

## Endpoint API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/products?category=&q=&sort=` | Daftar produk (sort: `featured`, `lowest`, `highest`, `rating`) |
| GET | `/api/products/:id` | Detail satu produk |
| GET | `/api/categories` | Kategori beserta jumlah produk |
| POST | `/api/auth/register` | Daftar akun baru |
| POST | `/api/auth/login` | Masuk; JWT dikirim sebagai cookie httpOnly |
| POST | `/api/auth/logout` | Keluar dan menghapus cookie sesi |
| GET | `/api/auth/me` | Profil akun yang sedang masuk |
| GET | `/api/cart` | Isi keranjang beserta subtotal |
| POST | `/api/cart/items` | Tambah produk ke keranjang |
| PATCH | `/api/cart/items/:productId` | Ubah jumlah (0 = hapus) |
| DELETE | `/api/cart/items/:productId` | Hapus produk dari keranjang |
| GET | `/api/orders` | Riwayat pesanan (harus masuk) |
| POST | `/api/orders` | Buat pesanan dari keranjang (harus masuk) |
| GET | `/api/favorites` | Daftar produk favorit |
| POST | `/api/favorites/:productId` | Tambah/hapus favorit |
| POST | `/api/newsletter` | Daftar newsletter |

Seluruh endpoint keranjang dan favorit bisa dipakai tanpa masuk akun: pemiliknya
ditentukan dari cookie sesi. Saat pengunjung masuk atau mendaftar, keranjang dan
favorit tamunya otomatis dipindahkan ke akun tersebut.

## Struktur folder

```text
e-commerce/
├── public/                     # frontend statis
│   ├── index.html
│   └── assets/
│       ├── css/styles.css
│       ├── js/api.js           # pembungkus pemanggilan REST API
│       ├── js/app.js           # logika UI
│       └── img/*.svg
├── server/                     # REST API Express
│   ├── config/db.js            # connection pool mysql2
│   ├── controllers/            # product, auth, order, favorite
│   ├── middleware/auth.js      # JWT
│   ├── routes/index.js
│   └── server.js
├── database/
│   ├── schema.sql              # DDL seluruh tabel + view
│   ├── seed.sql                # data awal produk & akun demo
│   └── setup.js                # runner `npm run db:setup`
├── .env.example
└── package.json
```

## Catatan implementasi

**Tidak ada data yang disimpan di browser.** Keranjang, favorit, akun, dan pesanan
seluruhnya berada di MySQL. Browser hanya memegang dua cookie httpOnly yang tidak
bisa dibaca JavaScript:

- `lokamart_sid` — penanda sesi pengunjung, menautkan keranjang & favorit tamu ke barisnya di database.
- `lokamart_token` — JWT sesi login.

Saat checkout, isi keranjang dibaca server langsung dari tabel `cart_items`; harga,
ongkir, dan stok dihitung ulang di server, lalu pesanan dibuat, stok dikurangi, dan
keranjang dikosongkan dalam satu transaksi. Pembayaran masih simulasi dan belum
terhubung ke payment gateway.
