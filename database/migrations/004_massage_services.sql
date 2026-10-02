-- Layanan massage yang tampil di katalog #products.
ALTER TABLE products ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER description;

INSERT INTO categories (name, slug)
SELECT 'Pijat Bayi', 'pijat-bayi'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'pijat-bayi');

UPDATE products SET is_active = 0 WHERE slug = 'pijat-bayi-atur-tarif';

INSERT INTO products
  (category_id, name, slug, description, duration_minutes, price, stock, badge, image, is_active)
VALUES
  ((SELECT id FROM categories WHERE slug = 'pijat-bayi'), 'Baby Massage 30 menit', 'baby-massage-30-menit', 'Pijat lembut untuk membantu si kecil rileks dan nyaman.', 30, 75000, 99, 'Pilihan hangat', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  ((SELECT id FROM categories WHERE slug = 'pijat-bayi'), 'Baby Spa 45 menit', 'baby-spa-45-menit', 'Perawatan pijat dan spa lembut untuk pengalaman yang menenangkan.', 45, 100000, 99, 'Favorit', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1),
  ((SELECT id FROM categories WHERE slug = 'pijat-bayi'), 'Massage & Spa 60 menit', 'massage-spa-60-menit', 'Sesi lengkap massage dan spa untuk waktu istimewa bersama si kecil.', 60, 135000, 99, 'Sesi lengkap', 'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), description = VALUES(description), duration_minutes = VALUES(duration_minutes),
  price = VALUES(price), stock = VALUES(stock), badge = VALUES(badge), is_active = 1;
