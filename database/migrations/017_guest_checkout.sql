-- Checkout pelanggan tanpa akun. Token mentah hanya diberikan ke browser;
-- database menyimpan SHA-256 agar kebocoran database tidak membuka pesanan.
ALTER TABLE orders DROP FOREIGN KEY fk_orders_user;
ALTER TABLE orders
  MODIFY COLUMN user_id INT UNSIGNED NULL,
  MODIFY COLUMN recipient_email VARCHAR(160) NULL,
  ADD COLUMN guest_access_token_hash CHAR(64) NULL AFTER user_id,
  ADD UNIQUE KEY uq_orders_guest_access_token_hash (guest_access_token_hash),
  ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE order_change_requests DROP FOREIGN KEY fk_change_requests_user;
ALTER TABLE order_change_requests
  MODIFY COLUMN user_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_change_requests_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL;
