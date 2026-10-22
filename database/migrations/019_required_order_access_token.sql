-- Setiap pesanan sekarang memiliki token akses mandiri, termasuk pesanan yang
-- dibuat saat pelanggan sedang login. Hash acak untuk data lama hanya menjadi
-- pengisi internal; akses pesanan lama milik akun tetap memakai user_id.
UPDATE orders
   SET guest_access_token_hash = SHA2(
         CONCAT(UUID(), ':', id, ':', RAND(), ':', CURRENT_TIMESTAMP(6)),
         256
       )
 WHERE guest_access_token_hash IS NULL;

ALTER TABLE orders
  MODIFY COLUMN guest_access_token_hash CHAR(64) NOT NULL;
