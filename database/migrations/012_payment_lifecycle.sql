-- Siklus pembayaran booking: tenggat, verifikasi transfer, dan refund.

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'Sedang diproses','Dikirim',
    'Menunggu pembayaran','Menunggu konfirmasi','Terkonfirmasi',
    'Dalam pelayanan','Selesai','Dibatalkan'
  ) NOT NULL DEFAULT 'Menunggu pembayaran',
  MODIFY COLUMN payment_status ENUM(
    'Menunggu pembayaran','Menunggu verifikasi','Dibayar','Kedaluwarsa',
    'Gagal','Dibatalkan','Dikembalikan'
  ) NOT NULL DEFAULT 'Menunggu pembayaran',
  ADD COLUMN payment_due_at DATETIME NULL AFTER payment_updated_at,
  ADD COLUMN payment_proof_url VARCHAR(500) NULL AFTER payment_due_at,
  ADD COLUMN payment_proof_uploaded_at DATETIME NULL AFTER payment_proof_url,
  ADD KEY idx_orders_payment_expiry (payment_status, payment_due_at);

UPDATE orders
   SET status = CASE status
     WHEN 'Sedang diproses' THEN IF(payment_status = 'Dibayar', 'Menunggu konfirmasi', 'Menunggu pembayaran')
     WHEN 'Dikirim' THEN 'Dalam pelayanan'
     ELSE status
   END;

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'Menunggu pembayaran','Menunggu konfirmasi','Terkonfirmasi',
    'Dalam pelayanan','Selesai','Dibatalkan'
  ) NOT NULL DEFAULT 'Menunggu pembayaran';
