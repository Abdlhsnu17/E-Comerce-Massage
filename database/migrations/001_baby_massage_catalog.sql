-- Run against sentuhan_kecil_db after schema.sql.
-- Keep the old demo rows for history, but remove them from the public catalog.

INSERT INTO categories (name, slug)
SELECT 'Pijat Bayi', 'pijat-bayi'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = 'pijat-bayi'
);

UPDATE products
   SET is_active = 0
 WHERE category_id <> (
   SELECT id FROM categories WHERE slug = 'pijat-bayi'
 );

INSERT INTO products
  (category_id, name, slug, description, price, stock, badge, image, is_active)
SELECT
  (SELECT id FROM categories WHERE slug = 'pijat-bayi'),
  'Pijat Bayi (atur tarif di dashboard)',
  'pijat-bayi-atur-tarif',
  'Lengkapi tarif, kuota, dan foto layanan di dashboard admin sebelum layanan diaktifkan.',
  0,
  0,
  'Draft',
  'https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE slug = 'pijat-bayi-atur-tarif'
);
