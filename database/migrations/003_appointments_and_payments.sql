ALTER TABLE orders
  ADD COLUMN payment_status ENUM('Menunggu pembayaran','Dibayar','Gagal','Dibatalkan') NOT NULL DEFAULT 'Menunggu pembayaran',
  ADD COLUMN appointment_date DATE NULL,
  ADD COLUMN appointment_time TIME NULL,
  ADD COLUMN service_location ENUM('studio','home') NOT NULL DEFAULT 'studio',
  ADD COLUMN appointment_status ENUM('Menunggu konfirmasi','Dikonfirmasi','Selesai','Dibatalkan') NOT NULL DEFAULT 'Menunggu konfirmasi',
  ADD KEY idx_orders_appointment (appointment_date, appointment_time, appointment_status);