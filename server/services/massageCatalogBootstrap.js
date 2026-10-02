const { pool } = require("../config/db");

const SERVICES = [
  ["Baby Massage Relaksasi", "baby-massage-relaksasi-30", "Pijat lembut untuk membantu bayi rileks, tidur lebih nyaman, dan menikmati sentuhan hangat.", 30, 75000, 20, "Pilihan populer"],
  ["Baby Spa Sensory", "baby-spa-sensory-45", "Sesi spa ringan dan stimulasi sensorik yang menyenangkan untuk si kecil.", 45, 100000, 15, "Favorit"],
  ["Massage & Spa Lengkap", "massage-spa-lengkap-60", "Kombinasi massage dan spa untuk momen perawatan yang lebih lengkap.", 60, 135000, 12, "Sesi lengkap"],
  ["Pijat Kolik Bayi", "pijat-kolik-bayi-30", "Pijatan lembut pada area perut untuk membantu bayi merasa lebih nyaman.", 30, 85000, 10, "Nyaman di perut"],
  ["Pijat Tumbuh Kembang", "pijat-tumbuh-kembang-45", "Sesi sentuhan lembut dengan gerakan yang disesuaikan untuk kebutuhan tumbuh kembang.", 45, 110000, 10, "Pendampingan"],
  ["Home Care Massage", "home-care-massage-60", "Layanan massage nyaman di rumah sesuai jadwal yang telah dikonfirmasi.", 60, 160000, 8, "Kunjungan rumah"]
];

const IMAGE = "https://images.unsplash.com/photo-1489760176169-fd3d32805239?auto=format&fit=crop&w=1000&q=85";

/** Memastikan katalog awal tersedia tanpa menimpa perubahan dari admin. */
async function ensureMassageCatalog() {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'duration_minutes'`
  );
  if (!columns.length) {
    await pool.query("ALTER TABLE products ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER description");
  }

  await pool.query(
    "INSERT INTO categories (name, slug) VALUES ('Pijat Bayi', 'pijat-bayi') ON DUPLICATE KEY UPDATE slug = slug"
  );
  const [categories] = await pool.query("SELECT id FROM categories WHERE slug = 'pijat-bayi' LIMIT 1");
  const categoryId = categories[0].id;

  for (const [name, slug, description, duration, price, stock, badge] of SERVICES) {
    await pool.query(
      `INSERT INTO products
        (category_id, name, slug, description, duration_minutes, price, stock, badge, image, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE slug = slug`,
      [categoryId, name, slug, description, duration, price, stock, badge, IMAGE]
    );
  }
}

module.exports = { ensureMassageCatalog };
