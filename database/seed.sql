-- =====================================================================
-- LokaMart — Data awal (produk homepage + akun demo)
-- Jalankan setelah schema.sql:
--   mysql -u root -h 127.0.0.1 -P 3306 lokamart_db < database/seed.sql
-- =====================================================================

USE lokamart_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE carts;
TRUNCATE TABLE favorites;
TRUNCATE TABLE newsletter_subscribers;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Elektronik', 'elektronik'),
  (2, 'Fashion',    'fashion'),
  (3, 'Rumah',      'rumah');

INSERT INTO products
  (id, category_id, name, slug, description, price, old_price, rating, review_count, stock, badge, image) VALUES
  (1, 1, 'Nimbus Pro Headphones',  'nimbus-pro-headphones',
      'Headphone over-ear dengan peredam bising aktif dan baterai 40 jam.',
      1299000.00, 1499000.00, 4.9, 328, 40, 'Terlaris',   'assets/img/headphones.svg'),
  (2, 1, 'Aruna Smart Watch',      'aruna-smart-watch',
      'Jam pintar dengan pemantau detak jantung dan tahan air 5 ATM.',
      899000.00,   999000.00, 4.8, 214, 55, 'Baru',       'assets/img/watch.svg'),
  (3, 1, 'Kamera Saku Lensa',      'kamera-saku-lensa',
      'Kamera compact 24MP dengan lensa cepat untuk kebutuhan harian.',
      2399000.00,       NULL, 4.7,  96, 18, 'Pilihan',    'assets/img/camera.svg'),
  (4, 2, 'Raga Everyday Sneakers', 'raga-everyday-sneakers',
      'Sepatu kanvas ringan dengan sol empuk untuk pemakaian seharian.',
      649000.00,   749000.00, 4.9, 401, 72, 'Favorit',    'assets/img/shoes.svg'),
  (5, 2, 'Sora Carry Bag',         'sora-carry-bag',
      'Tas jinjing kulit sintetis dengan kompartemen laptop 14 inci.',
      579000.00,        NULL, 4.8, 187, 33, 'Eksklusif',  'assets/img/bag.svg'),
  (6, 3, 'Aksa Coffee Maker',      'aksa-coffee-maker',
      'Mesin kopi semi-otomatis dengan pemanas cepat dan tangki 1,5 L.',
      1699000.00, 1899000.00, 4.9, 145, 25, 'Terlaris',   'assets/img/coffee.svg'),
  (7, 1, 'Nadi Wireless Keyboard', 'nadi-wireless-keyboard',
      'Keyboard nirkabel low-profile dengan koneksi multi-perangkat.',
      749000.00,        NULL, 4.7, 231, 60, 'Pilihan',    'assets/img/keyboard.svg'),
  (8, 3, 'Senja Table Lamp',       'senja-table-lamp',
      'Lampu meja LED dengan tiga tingkat kehangatan cahaya.',
      429000.00,   499000.00, 4.8, 173, 44, 'Baru',       'assets/img/lamp.svg');

-- Akun bawaan.
--   Pelanggan — demo@lokamart.id  / demo1234
--   Admin     — admin@lokamart.id / admin1234  (role 'admin')
INSERT INTO users (id, name, email, password_hash, phone, role) VALUES
  (1, 'Pelanggan Demo', 'demo@lokamart.id',
   '$2a$10$ckl41Y0ez73jJZjQhdl17et9g2tFZO41EeyOeVgIaPbS/0nCO3a8S', '081234567890', 'user'),
  (2, 'Administrator LokaMart', 'admin@lokamart.id',
   '$2a$10$AQZNKSEwlImi3GGc7GU..O4/OilEMpVB9E.zbs3VDGcgxVu0w818m', '081200000000', 'admin');
