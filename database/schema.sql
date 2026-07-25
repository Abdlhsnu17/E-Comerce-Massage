-- =====================================================================
-- LokaMart — Skema Database
-- Target: MySQL / MariaDB di localhost:3306
-- Jalankan: mysql -u root -h 127.0.0.1 -P 3306 < database/schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS lokamart_db;
CREATE DATABASE lokamart_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE lokamart_db;

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
-- Akun pelanggan
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(30)  NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
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
  payment_method    ENUM('QRIS','Virtual Account','Kartu Debit/Kredit') NOT NULL,
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
