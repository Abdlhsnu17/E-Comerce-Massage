-- Jalankan pada database yang sudah dibuat sebelum fitur pembayaran baru dipakai.
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('QRIS','Transfer Bank','Tunai') NOT NULL;
