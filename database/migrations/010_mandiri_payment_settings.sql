-- Aman dijalankan pada instalasi baru maupun instalasi yang sudah menjalankan
-- migrasi QRIS 009 sebelumnya.
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
