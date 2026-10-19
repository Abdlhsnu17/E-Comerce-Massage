-- Fondasi operasi lanjutan: profil bayi, voucher, dan ulasan pelanggan.

CREATE TABLE customer_profiles (
  user_id INT UNSIGNED NOT NULL,
  child_name VARCHAR(120) NULL,
  child_birth_date DATE NULL,
  allergies TEXT NULL,
  care_notes TEXT NULL,
  default_address TEXT NULL,
  default_city VARCHAR(120) NULL,
  default_zip VARCHAR(20) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_customer_profiles_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coupons (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  minimum_order DECIMAL(12,2) NOT NULL DEFAULT 0,
  usage_limit INT UNSIGNED NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code),
  KEY idx_coupons_active_dates (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_reviews (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(1000) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_reviews_order (order_id),
  KEY idx_service_reviews_published (is_published, created_at),
  CONSTRAINT chk_service_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_service_reviews_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_service_reviews_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_change_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  request_type ENUM('reschedule','cancel') NOT NULL,
  requested_date DATE NULL,
  requested_time TIME NULL,
  reason VARCHAR(500) NULL,
  status ENUM('Menunggu','Disetujui','Ditolak') NOT NULL DEFAULT 'Menunggu',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_change_requests_order_status (order_id, status),
  CONSTRAINT fk_change_requests_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_change_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE orders
  ADD COLUMN discount_code VARCHAR(40) NULL AFTER subtotal,
  ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_code;
