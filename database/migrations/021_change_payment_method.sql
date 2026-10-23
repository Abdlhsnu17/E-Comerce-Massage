-- Memungkinkan pelanggan mengganti QRIS dan transfer bank sebelum pembayaran.
-- Referensi merchant dipisahkan dari transaction_id agar setiap QRIS baru unik
-- dan notifikasi dari QRIS lama tidak dapat mengubah pesanan.
ALTER TABLE orders
  ADD COLUMN payment_reference VARCHAR(100) NULL AFTER payment_gateway,
  ADD UNIQUE KEY uq_orders_payment_reference (payment_reference);

UPDATE orders
   SET payment_reference = order_code
 WHERE payment_method = 'QRIS' AND payment_gateway = 'midtrans'
   AND payment_reference IS NULL;
