-- Sinkronisasi data publik dari snapshot operasional 22 Oktober 2026.
-- Data privat/transaksional dan path /uploads yang tidak tersedia di repo
-- sengaja tidak disalin. Migration ini aman dijalankan ulang berdasarkan slug/code.

UPDATE site_content
SET services_title = 'Waktu istimewa untuk si kecil dan keluarga.',
    services_intro = 'Setiap sesi dilakukan dengan tempo lembut dan komunikasi yang baik bersama orang tua.',
    about_label = 'Tentang Sentuhan Kecil',
    about_title = 'Ruang yang mengutamakan rasa nyaman.',
    about_text = 'Kami percaya pengalaman pijat bayi yang baik dimulai dengan mendengarkan orang tua dan memperhatikan respons bayi. Tidak ada sesi yang dipaksakan; kenyamanan si kecil selalu menjadi prioritas.'
WHERE id = 1;

INSERT INTO coupons
  (code, discount_type, discount_value, minimum_order, usage_limit, used_count, starts_at, ends_at, is_active)
VALUES
  ('EMBSPA', 'percent', 20, 10000, 2, 0, NULL, NULL, 1)
ON DUPLICATE KEY UPDATE
  discount_type = VALUES(discount_type), discount_value = VALUES(discount_value),
  minimum_order = VALUES(minimum_order), usage_limit = VALUES(usage_limit),
  starts_at = VALUES(starts_at), ends_at = VALUES(ends_at), is_active = VALUES(is_active);

INSERT INTO announcements
  (kind, title, excerpt, content, image, is_published, published_at)
SELECT
  'Pengumuman',
  'Pembukaan Layanan Home Care Massage Pijat Bayi & Ibu Hamil',
  'Kami kini hadir langsung di rumah Anda! Nikmati layanan pijat profesional untuk bayi dan ibu hamil tanpa perlu keluar rumah.',
  'Halo Ayah dan Bunda,\n\nDalam rangka memberikan kemudahan dan kenyamanan ekstra bagi keluarga Anda, kami resmi membuka layanan Home Care Massage. Terapis/bidan bersertifikat kami siap datang ke rumah Anda dengan membawa seluruh peralatan medis dan kenyamanan yang dibutuhkan',
  NULL,
  1,
  '2026-10-02 23:37:12'
WHERE NOT EXISTS (
  SELECT 1 FROM announcements
  WHERE title = 'Pembukaan Layanan Home Care Massage Pijat Bayi & Ibu Hamil'
);

SET @massage_category_id := (SELECT id FROM categories WHERE slug = 'pijat-bayi' LIMIT 1);

INSERT INTO products
  (category_id, name, slug, description, duration_minutes, price, stock, badge, image, is_active)
VALUES
  (@massage_category_id, 'Pijat Bayi', 'pijat-bayi-atur-tarif', 'Sesi pijat bayi dengan sentuhan lembut. Jadwal dan ketersediaan sesi dikonfirmasi melalui WhatsApp.', 11, 500000, 9, 'Jadwal via WhatsApp', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Massage 30 menit', 'baby-massage-30-menit', 'Pijat lembut untuk membantu si kecil rileks dan nyaman.', 11, 75000, 96, 'Pilihan hangat', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Spa 45 menit', 'baby-spa-45-menit', 'Perawatan pijat dan spa lembut untuk pengalaman yang menenangkan.', 66, 100000, 96, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Massage & Spa 60 menit', 'massage-spa-60-menit', 'Sesi lengkap massage dan spa untuk waktu istimewa bersama si kecil.', 61, 135000, 97, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Massage Relaksasi', 'baby-massage-relaksasi-30', 'Pijat lembut untuk membantu bayi rileks, tidur lebih nyaman, dan menikmati sentuhan hangat.', 31, 75000, 20, 'Pilihan populer', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Baby Spa Sensory', 'baby-spa-sensory-45', 'Sesi spa ringan dan stimulasi sensorik yang menyenangkan untuk si kecil.', 46, 100000, 15, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Massage & Spa Lengkap', 'massage-spa-lengkap-60', 'Kombinasi massage dan spa untuk momen perawatan yang lebih lengkap.', 1, 135000, 11, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Kolik Bayi', 'pijat-kolik-bayi-30', 'Pijatan lembut pada area perut untuk membantu bayi merasa lebih nyaman.', 31, 85000, 10, 'Nyaman di perut', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Pijat Tumbuh Kembang', 'pijat-tumbuh-kembang-45', 'Sesi sentuhan lembut dengan gerakan yang disesuaikan untuk kebutuhan tumbuh kembang.', 11, 110000, 10, 'Pendampingan', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  (@massage_category_id, 'Home Care Massage', 'home-care-massage-60', 'Layanan massage nyaman di rumah sesuai jadwal yang telah dikonfirmasi.', 56, 160000, 8, 'Kunjungan rumah', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1)
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id), name = VALUES(name), description = VALUES(description),
  duration_minutes = VALUES(duration_minutes), price = VALUES(price), stock = VALUES(stock),
  badge = VALUES(badge), is_active = VALUES(is_active);
