-- =====================================================================
-- LokaMart — Migrasi: menambahkan peran admin ke database yang sudah ada
--
-- Pakai berkas ini bila lokamart_db sudah terlanjur dibuat dan berisi data
-- (pesanan, akun pelanggan) sehingga tidak mau di-DROP oleh schema.sql.
-- Aman dijalankan berulang kali.
--
-- Jalankan:
--   mysql -u root -h 127.0.0.1 -P 3306 lokamart_db < database/migration-admin.sql
-- =====================================================================

USE lokamart_db;

-- ---------------------------------------------------------------------
-- 1. Kolom `role` pada tabel users.
-- MySQL 5.7 / MariaDB lama belum punya ADD COLUMN IF NOT EXISTS, jadi
-- pengecekan dilakukan lewat information_schema + prepared statement.
-- ---------------------------------------------------------------------
SET @ada_kolom := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);

SET @sql := IF(@ada_kolom = 0,
  "ALTER TABLE users ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER phone",
  "SELECT 'Kolom users.role sudah ada, dilewati.' AS info"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 2. Indeks bantu untuk menyaring admin.
-- ---------------------------------------------------------------------
SET @ada_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_role'
);

SET @sql := IF(@ada_index = 0,
  "ALTER TABLE users ADD KEY idx_users_role (role)",
  "SELECT 'Indeks idx_users_role sudah ada, dilewati.' AS info"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 3. Akun admin bawaan — admin@lokamart.id / admin1234
-- Bila email ini sudah ada, hash password ikut disamakan agar database lokal
-- yang pernah memakai seed lama tetap bisa login dengan kredensial demo.
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, phone, role) VALUES
  ('Administrator LokaMart', 'admin@lokamart.id',
   '$2a$10$AQZNKSEwlImi3GGc7GU..O4/OilEMpVB9E.zbs3VDGcgxVu0w818m', '081200000000', 'admin')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin';

SELECT id, name, email, role FROM users WHERE role = 'admin';
