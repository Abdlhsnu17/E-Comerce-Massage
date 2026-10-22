-- Simpan nama pasien/anak secara terpisah dari nama orang tua/pemesan.
ALTER TABLE orders
  ADD COLUMN patient_name VARCHAR(120) NULL AFTER recipient_name;

-- Pesanan lama belum membedakan pasien dan pemesan; gunakan nama yang tersedia
-- agar migrasi aman, sedangkan booking baru wajib mengirim nama pasien.
UPDATE orders SET patient_name = recipient_name WHERE patient_name IS NULL;

ALTER TABLE orders
  MODIFY COLUMN patient_name VARCHAR(120) NOT NULL AFTER recipient_name;
