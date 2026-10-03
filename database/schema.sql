-- =====================================================================
-- Aera Baby Spa — Skema Database
-- Target: MySQL / MariaDB di localhost:3306
-- Jalankan: mysql -u root -h 127.0.0.1 -P 3306 < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sentuhan_kecil_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE sentuhan_kecil_db;

-- ---------------------------------------------------------------------
-- Kategori produk
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  slug        VARCHAR(80)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Produk yang tampil di homepage / katalog
-- ---------------------------------------------------------------------
CREATE TABLE products (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  category_id   INT UNSIGNED   NOT NULL,
  name          VARCHAR(150)   NOT NULL,
  slug          VARCHAR(160)   NOT NULL,
  description   TEXT           NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  price         DECIMAL(12, 2) NOT NULL,
  old_price     DECIMAL(12, 2) NULL,
  rating        DECIMAL(2, 1)  NOT NULL DEFAULT 0.0,
  review_count  INT UNSIGNED   NOT NULL DEFAULT 0,
  stock         INT UNSIGNED   NOT NULL DEFAULT 0,
  badge         VARCHAR(40)    NULL,
  image         VARCHAR(255)   NOT NULL,
  is_active     TINYINT(1)     NOT NULL DEFAULT 1,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  KEY idx_products_active_price (is_active, price),
  KEY idx_products_rating (rating),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_products_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Akun pengguna.
-- Kolom `role` memisahkan pelanggan biasa dari pengelola toko: hanya baris
-- ber-role 'admin' yang boleh menembus endpoint /api/admin/*.
-- Pendaftaran mandiri selalu menghasilkan 'user'; admin dibuat lewat seed
-- atau dipromosikan admin lain.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(30)  NULL,
  role           ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token pemulihan password. Token asli hanya dikirim melalui email; database
-- menyimpan hash-nya agar token tidak dapat dipakai bila database bocor.
CREATE TABLE password_reset_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  expires_at  DATETIME        NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user (user_id),
  KEY idx_password_reset_tokens_expiry (expires_at),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Keranjang belanja.
-- Milik user yang sudah masuk (user_id) atau pengunjung tamu (session_token
-- dari cookie). Kolom UNIQUE mengizinkan banyak baris NULL, sehingga satu
-- user hanya punya satu keranjang dan tiap tamu punya keranjangnya sendiri.
-- ---------------------------------------------------------------------
CREATE TABLE carts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NULL,
  session_token  CHAR(36)     NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_carts_user (user_id),
  UNIQUE KEY uq_carts_session (session_token),
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id     INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_items (cart_id, product_id),
  KEY idx_cart_items_product (product_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id)
    REFERENCES carts (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_cart_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Produk favorit (wishlist), mengikuti pola pemilik yang sama dengan carts
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NULL,
  session_token  CHAR(36)     NULL,
  product_id     INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_favorites_user (user_id, product_id),
  UNIQUE KEY uq_favorites_session (session_token, product_id),
  KEY idx_favorites_product (product_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_favorites_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Like layanan; pemiliknya berupa akun atau session pengunjung.
-- ---------------------------------------------------------------------
CREATE TABLE service_likes (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NULL,
  session_token  CHAR(36)     NULL,
  product_id     INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_likes_user (user_id, product_id),
  UNIQUE KEY uq_service_likes_session (session_token, product_id),
  KEY idx_service_likes_product (product_id),
  CONSTRAINT fk_service_likes_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_service_likes_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Pesanan
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_code        VARCHAR(30)    NOT NULL,
  user_id           INT UNSIGNED   NOT NULL,
  status            ENUM('Sedang diproses','Dikirim','Selesai','Dibatalkan')
                      NOT NULL DEFAULT 'Sedang diproses',
  subtotal          DECIMAL(12, 2) NOT NULL,
  shipping_cost     DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total             DECIMAL(12, 2) NOT NULL,
  shipping_method   ENUM('regular','express') NOT NULL DEFAULT 'regular',
  payment_method    ENUM('QRIS','Transfer Bank','Tunai') NOT NULL,
  payment_status   ENUM('Menunggu pembayaran','Dibayar','Gagal','Dibatalkan') NOT NULL DEFAULT 'Menunggu pembayaran',
  appointment_date DATE           NULL,
  appointment_time TIME           NULL,
  service_location ENUM('studio','home') NOT NULL DEFAULT 'studio',
  appointment_status ENUM('Menunggu konfirmasi','Dikonfirmasi','Selesai','Dibatalkan') NOT NULL DEFAULT 'Menunggu konfirmasi',
  recipient_name    VARCHAR(120)   NOT NULL,
  recipient_email   VARCHAR(160)   NOT NULL,
  recipient_phone   VARCHAR(30)    NULL,
  shipping_address  TEXT           NOT NULL,
  shipping_city     VARCHAR(120)   NULL,
  shipping_zip      VARCHAR(20)    NULL,
  notes             VARCHAR(255)   NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_code (order_code),
  KEY idx_orders_user_date (user_id, created_at),
  KEY idx_orders_appointment (appointment_date, appointment_time, appointment_status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Rincian item per pesanan.
-- Nama & harga disalin agar riwayat tetap akurat walau produk berubah.
-- ---------------------------------------------------------------------
CREATE TABLE order_items (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED   NOT NULL,
  product_id    INT UNSIGNED   NULL,
  product_name  VARCHAR(150)   NOT NULL,
  product_image VARCHAR(255)   NOT NULL,
  unit_price    DECIMAL(12, 2) NOT NULL,
  quantity      INT UNSIGNED   NOT NULL,
  line_total    DECIMAL(12, 2) AS (unit_price * quantity) STORED,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_order_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Pendaftar newsletter di footer homepage
-- ---------------------------------------------------------------------
CREATE TABLE newsletter_subscribers (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(160) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Berita dan pengumuman yang dikelola admin
-- ---------------------------------------------------------------------
CREATE TABLE announcements (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind           ENUM('Berita','Pengumuman') NOT NULL DEFAULT 'Berita',
  title          VARCHAR(180) NOT NULL,
  excerpt        VARCHAR(255) NULL,
  content        TEXT NOT NULL,
  image          VARCHAR(255) NULL,
  is_published   TINYINT(1) NOT NULL DEFAULT 0,
  published_at   DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_publication (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE site_content (
  id INT UNSIGNED NOT NULL, services_title VARCHAR(255) NOT NULL, services_intro TEXT NULL,
  about_label VARCHAR(120) NOT NULL, about_title VARCHAR(255) NOT NULL, about_text TEXT NOT NULL,
  about_image VARCHAR(255) NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_content
  (id, services_title, services_intro, about_label, about_title, about_text, about_image)
VALUES
  (1,
   'Waktu istimewa untuk si kecil dan keluarga.',
   'Setiap sesi dilakukan dengan tempo lembut dan komunikasi yang baik bersama orang tua.',
   'Tentang Aera Baby Spa',
   'Ruang yang mengutamakan rasa nyaman.',
   'Kami percaya pengalaman pijat bayi yang baik dimulai dengan mendengarkan orang tua dan memperhatikan respons bayi. Tidak ada sesi yang dipaksakan; kenyamanan si kecil selalu menjadi prioritas.',
   NULL);

-- ---------------------------------------------------------------------
-- Data dummy awal katalog layanan pijat bayi, spa, dan massage.
-- Data ini boleh diedit dari dashboard admin setelah instalasi.
-- ---------------------------------------------------------------------
INSERT INTO categories (name, slug)
VALUES ('Pijat Bayi', 'pijat-bayi')
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

SET @massage_category_id := (SELECT id FROM categories WHERE slug = 'pijat-bayi' LIMIT 1);

INSERT INTO products
  (category_id, name, slug, description, duration_minutes, price, stock, badge, image, is_active)
VALUES
  (@massage_category_id, 'Pijat Bayi (atur tarif di dashboard)', 'pijat-bayi-atur-tarif', 'Lengkapi tarif, kuota, dan foto layanan di dashboard admin sebelum layanan diaktifkan.', NULL, 0, 0, 'Draft', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 0),
  (@massage_category_id, 'Baby Massage 30 menit', 'baby-massage-30-menit', 'Pijat lembut untuk membantu si kecil rileks dan nyaman.', 30, 75000, 99, 'Pilihan hangat', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Spa 45 menit', 'baby-spa-45-menit', 'Perawatan pijat dan spa lembut untuk pengalaman yang menenangkan.', 45, 100000, 99, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Massage & Spa 60 menit', 'massage-spa-60-menit', 'Sesi lengkap massage dan spa untuk waktu istimewa bersama si kecil.', 60, 135000, 99, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Massage Relaksasi', 'baby-massage-relaksasi-30', 'Pijat lembut untuk membantu bayi rileks, tidur lebih nyaman, dan menikmati sentuhan hangat.', 30, 75000, 20, 'Pilihan populer', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Spa Sensory', 'baby-spa-sensory-45', 'Sesi spa ringan dan stimulasi sensorik yang menyenangkan untuk si kecil.', 45, 100000, 15, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Massage & Spa Lengkap', 'massage-spa-lengkap-60', 'Kombinasi massage dan spa untuk momen perawatan yang lebih lengkap.', 60, 135000, 12, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Kolik Bayi', 'pijat-kolik-bayi-30', 'Pijatan lembut pada area perut untuk membantu bayi merasa lebih nyaman.', 30, 85000, 10, 'Nyaman di perut', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Tumbuh Kembang', 'pijat-tumbuh-kembang-45', 'Sesi sentuhan lembut dengan gerakan yang disesuaikan untuk kebutuhan tumbuh kembang.', 45, 110000, 10, 'Pendampingan', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Home Care Massage', 'home-care-massage-60', 'Layanan massage nyaman di rumah sesuai jadwal yang telah dikonfirmasi.', 60, 160000, 8, 'Kunjungan rumah', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id), name = VALUES(name), description = VALUES(description),
  duration_minutes = VALUES(duration_minutes), price = VALUES(price), stock = VALUES(stock),
  badge = VALUES(badge), image = VALUES(image), is_active = VALUES(is_active);

-- ---------------------------------------------------------------------
-- View ringkas untuk katalog homepage
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_catalog AS
SELECT
  p.id,
  p.name,
  p.slug,
  c.name AS category,
  p.price,
  p.old_price,
  p.rating,
  p.review_count,
  p.stock,
  p.badge,
  p.image
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = 1;
