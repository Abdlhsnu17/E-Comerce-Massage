-- Menyimpan like layanan per akun atau session pengunjung.
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