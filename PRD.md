# PRD - Sentuhan Kecil

## 1. Ringkasan produk

Sentuhan Kecil adalah platform booking dan penjualan layanan pijat bayi serta spa keluarga yang ditujukan untuk orang tua yang ingin mencari layanan perawatan bayi yang aman, nyaman, dan terjamin. Produk ini menggabungkan katalog layanan, proses checkout, manajemen order, serta panel admin dalam satu sistem berbasis web.

Tujuan utama produk ini adalah mempercepat proses booking layanan, memperjelas informasi layanan, dan memudahkan admin dalam mengelola pesanan dan konten website.

## 2. Latar belakang masalah

Bisnis layanan pijat bayi sering menghadapi beberapa kendala operasional:

- calon pelanggan sulit melihat daftar layanan secara terstruktur;
- jadwal dan lokasi sesi perlu dikonfirmasi secara manual;
- proses pemesanan belum terdokumentasi dengan rapi;
- admin harus mengelola pesanan, promo, dan publikasi konten secara terpisah;
- sistem belum memiliki penanganan sesi tamu dan pelanggan terdaftar secara terintegrasi.

Dengan adanya platform ini, proses bisnis menjadi lebih konsisten, berlapis, dan mudah dikelola tanpa mengandalkan spreadsheet atau komunikasi manual yang berulang.

## 3. Visi produk

Menjadi platform layanan pijat bayi dan spa keluarga yang terpercaya, nyaman digunakan, dan mudah dikelola oleh pemilik usaha serta pelanggan.

## 4. Tujuan bisnis

- Meningkatkan jumlah booking layanan melalui katalog yang lebih terstruktur.
- Mempercepat proses checkout dan pemesanan.
- Meminimalkan kesalahan input data pelanggan dan sesi layanan.
- Memberikan pengalaman yang lebih aman dan profesional bagi pelanggan.
- Membantu admin dalam mengelola pesanan dan konten website tanpa memerlukan tools tambahan.

## 5. Target pengguna

### 5.1 Pelanggan umum

- orang tua dengan bayi atau anak kecil;
- mencari layanan pijat bayi, spa ringan, atau sesi relaksasi;
- butuh informasi cepat mengenai durasi, harga, dan jadwal.

### 5.2 Pelanggan yang sudah terdaftar

- ingin menyimpan riwayat pesanan;
- ingin login untuk melihat status order;
- ingin menggunakan keranjang dan wishlist yang terhubung dengan akun.

### 5.3 Admin / pemilik usaha

- mengelola katalog layanan;
- melihat dan memperbarui status pesanan;
- mengelola pengumuman dan konten website;
- memantau pemesanan berdasarkan tanggal, jadwal, dan status pembayaran.

## 6. Goal dan non-goal

### Goal

- Menyediakan katalog layanan yang mudah dibaca dan dicari.
- Menyediakan pengalaman checkout yang sederhana dan aman.
- Mendukung login, registrasi, dan sesi tamu.
- Memfasilitasi proses konfirmasi jadwal oleh admin.
- Menjadi dasar platform operasional yang dapat dikembangkan ke pembayaran digital, notifikasi, dan CRM.

### Non-goal

- Integrasi payment gateway live (sekarang masih manual).
- Sistem notifikasi otomatis WhatsApp/email.
- Aplikasi mobile native.
- Multi-tenant atau multi-brand.

## 7. Prinsip produk

- Fokus pada pengalaman yang nyaman untuk orang tua.
- Prioritaskan kejelasan harga, durasi, dan jadwal.
- Data pesanan harus tetap aman dan terdokumentasi.
- Admin harus dapat mengelola operasi tanpa menguasai teknis backend.

## 8. Functional requirements

### FR-01: Katalog layanan

Sistem harus menampilkan layanan pijat bayi dalam bentuk katalog dengan informasi berikut:

- nama layanan;
- deskripsi;
- durasi sesi;
- harga;
- status ketersediaan;
- label/unggulan (jika ada);
- gambar layanan.

### FR-02: Pencarian dan filter

Pengguna dapat mencari layanan berdasarkan kata kunci dan melihat daftar yang relevan. Fitur ini mencakup:

- pencarian teks;
- filter kategori;
- sorting berdasarkan popularitas, harga terendah, atau harga tertinggi.

### FR-03: Keranjang dan wishlist

Pengguna dapat menambahkan layanan ke keranjang atau wishlist. Sistem harus:

- memisahkan sesi tamu dan akun user;
- menyimpan data keranjang secara konsisten;
- menampilkan item yang sudah dipilih dan jumlahnya;
- memungkinkan perubahan jumlah item atau penghapusan.

### FR-04: Autentikasi user

Sistem dapat menangani:

- registrasi user baru;
- login dengan email dan password;
- logout;
- melihat profil akun yang sedang login;
- mengubah password.

### FR-05: Checkout dan pemesanan

Saat pengguna mengecek out, sistem harus:

- membaca item keranjang dari server;
- menampilkan ringkasan order;
- menerima data penerima, alamat, jadwal layanan, dan metode pembayaran;
- menyimpan pesanan beserta item-itemnya;
- menghitung subtotal, biaya pengiriman, dan total.

### FR-06: Jadwal dan status sesi

Sistem harus menyimpan informasi jadwal sesi layanan, termasuk:

- tanggal sesi;
- waktu sesi;
- lokasi sesi (studio atau home care);
- status konfirmasi admin;
- status penyelesaian sesi.

### FR-07: Status pembayaran

Sistem harus menyimpan status pembayaran dengan potensi nilai seperti:

- menunggu pembayaran;
- dibayar;
- gagal;
- dibatalkan.

### FR-08: Admin dashboard

Admin harus dapat:

- melihat daftar pesanan;
- memperbarui status pembayaran;
- memperbarui status konfirmasi sesi;
- mengelola pengumuman dan konten situs;
- mengelola upload gambar.

### FR-09: Newsletter dan media publikasi

Sistem harus mampu menerima email pelanggan untuk newsletter dan menampilkan pengumuman yang sudah dipublikasikan.

### FR-10: Keamanan dasar

Sistem harus:

- menyimpan password dalam bentuk hash;
- menggunakan cookie HTTP-only untuk sesi;
- membatasi akses admin hanya untuk akun role admin;
- menolak input tidak valid yang dapat merusak payload atau keamanan server.

## 9. Non-functional requirements

### NFR-01: Kinerja

- halaman utama dan katalog harus dimuat dalam waktu yang wajar di koneksi broadband standar;
- query database harus efisien untuk daftar produk dan order.

### NFR-02: Keandalan

- seluruh operasi checkout dan pemesanan harus menjaga konsistensi data saat transaksi berjalan;
- server harus mampu menangani error dengan respons yang jelas tanpa mengekspos detail teknis ke client.

### NFR-03: Keamanan

- penggunaan variable environment untuk konfigurasi sensitif;
- validasi input pada server;
- pembatasan akses admin berdasarkan role.

### NFR-04: Maintainability

- struktur proyek harus dipisahkan berdasarkan domain: auth, commerce, admin, public;
- database schema harus terdokumentasi dan sinkron dengan migrasi terkait.

## 10. User stories

- Sebagai pelanggan, saya ingin melihat katalog layanan agar bisa memilih paket yang sesuai kebutuhan bayi saya.
- Sebagai pelanggan, saya ingin menambah layanan ke keranjang agar saya bisa mempersiapkan order dengan cepat.
- Sebagai pelanggan, saya ingin login agar saya bisa melihat riwayat order dan data akun saya.
- Sebagai pelanggan, saya ingin checkout agar saya bisa memesan sesi sesuai tanggal, waktu, dan lokasi yang diinginkan.
- Sebagai admin, saya ingin melihat status pembayaran agar saya bisa memvalidasi order pelanggan.
- Sebagai admin, saya ingin mengelola pengumuman agar website tetap relevan dan informatif.

## 11. Flow utama

### Flow pelanggan

1. Pelanggan membuka halaman utama.
2. Pelanggan melihat katalog layanan.
3. Pelanggan memilih layanan dan menambah item ke keranjang.
4. Pelanggan masuk atau mendaftar.
5. Pelanggan melanjutkan checkout dan mengisi detail order.
6. Admin menerima order dan menilai jadwal dan pembayaran.
7. Status order diperbarui dan pelanggan melihat status tersebut saat login.

### Flow admin

1. Admin masuk dengan akun admin.
2. Admin membuka dashboard.
3. Admin melihat daftar order dan pengumuman.
4. Admin mengubah status pembayaran atau jadwal sesi.
5. Admin mengelola konten publik dan upload gambar.

## 12. KPI / success metrics

- jumlah order yang berhasil dibuat per bulan;
- tingkat konversi dari katalog ke order;
- rata-rata transaksi per pelanggan;
- waktu menunggu konfirmasi admin;
- tingkat kesalahan input data pada order;
- tingkat penggunaan fitur wishlist dan keranjang.

## 13. Risiko dan asumsi

### Risiko

- kebutuhan admin terhadap komunikasi manual masih tinggi;
- pembayaran aktual belum terintegrasi;
- jadwal layanan bisa bersifat musiman.

### Asumsi

- sistem akan digunakan oleh usaha kecil hingga menengah;
- data pelanggan masih dikelola di database MySQL lokal;
- admin bersedia melakukan konfirmasi manual untuk setiap booking.

## 14. Prioritas roadmap

### MVP

- katalog layanan;
- keranjang dan wishlist;
- login dan registrasi;
- checkout dan riwayat order;
- admin untuk status order dan konten website.

### Fase berikutnya

- payment gateway live;
- notifikasi otomatis;
- sistem promo dan voucher;
- laporan penjualan dan analitik sederhana;
- fitur loyalitas pelanggan.

## 15. Kesimpulan

Sentuhan Kecil adalah produk berbasis web yang menggabungkan kebutuhan operasional layanan pijat bayi dengan kebutuhan pelanggan untuk mendapatkan informasi dan booking yang cepat. Dengan fokus pada katalog layanan, proses checkout, dan pengelolaan admin, produk ini menjadi fondasi digital yang siap diperluas ke arah layanan pelanggan yang lebih kompleks di masa depan.
