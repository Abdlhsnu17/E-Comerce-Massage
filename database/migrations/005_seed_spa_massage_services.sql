-- Jalankan sekali pada database yang sudah menggunakan migration 004.
-- Menambahkan atau memperbarui pilihan dummy spa dan massage di katalog.

INSERT INTO categories (name, slug)
VALUES ('Pijat Bayi', 'pijat-bayi')
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @massage_category_id := (SELECT id FROM categories WHERE slug = 'pijat-bayi' LIMIT 1);

INSERT INTO products
  (category_id, name, slug, description, duration_minutes, price, stock, badge, image, is_active)
VALUES
  (@massage_category_id, 'Baby Massage Relaksasi', 'baby-massage-relaksasi-30', 'Pijat lembut untuk membantu bayi rileks, tidur lebih nyaman, dan menikmati sentuhan hangat.', 30, 75000, 20, 'Pilihan populer', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Spa Sensory', 'baby-spa-sensory-45', 'Sesi spa ringan dan stimulasi sensorik yang menyenangkan untuk si kecil.', 45, 100000, 15, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Massage & Spa Lengkap', 'massage-spa-lengkap-60', 'Kombinasi massage dan spa untuk momen perawatan yang lebih lengkap.', 60, 135000, 12, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Kolik Bayi', 'pijat-kolik-bayi-30', 'Pijatan lembut pada area perut untuk membantu bayi merasa lebih nyaman.', 30, 85000, 10, 'Nyaman di perut', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Tumbuh Kembang', 'pijat-tumbuh-kembang-45', 'Sesi sentuhan lembut dengan gerakan yang disesuaikan untuk kebutuhan tumbuh kembang.', 45, 110000, 10, 'Pendampingan', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Home Care Massage', 'home-care-massage-60', 'Layanan massage nyaman di rumah sesuai jadwal yang telah dikonfirmasi.', 60, 160000, 8, 'Kunjungan rumah', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id), name = VALUES(name), description = VALUES(description),
  duration_minutes = VALUES(duration_minutes), price = VALUES(price), stock = VALUES(stock),
  badge = VALUES(badge), image = VALUES(image), is_active = VALUES(is_active);
