-- Metadata transaksi QRIS dinamis dari payment gateway.
ALTER TABLE orders
  ADD COLUMN payment_gateway VARCHAR(30) NULL AFTER payment_status,
  ADD COLUMN gateway_transaction_id VARCHAR(100) NULL AFTER payment_gateway,
  ADD COLUMN qris_url VARCHAR(500) NULL AFTER gateway_transaction_id,
  ADD COLUMN payment_updated_at DATETIME NULL AFTER qris_url,
  ADD UNIQUE KEY uq_orders_gateway_transaction (gateway_transaction_id);

-- Rekening tujuan transfer disimpan di database agar deployment tidak masih
-- memakai rekening contoh dari konfigurasi lama.
CREATE TABLE IF NOT EXISTS payment_settings (
  id TINYINT UNSIGNED NOT NULL,
  bank_name VARCHAR(80) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_account_holder VARCHAR(120) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payment_settings (id, bank_name, bank_account_number, bank_account_holder)
VALUES (1, 'Bank Mandiri', '9000050103739', 'HAFSAH QUROTUN AINI')
ON DUPLICATE KEY UPDATE
  bank_name = VALUES(bank_name),
  bank_account_number = VALUES(bank_account_number),
  bank_account_holder = VALUES(bank_account_holder);
