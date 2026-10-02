const { pool } = require("../config/db");

const SORTS = {
  featured: "p.review_count DESC, p.rating DESC",
  lowest: "p.price ASC",
  highest: "p.price DESC",
  rating: "p.rating DESC, p.review_count DESC"
};

async function listProducts(req, res, next) {
  try {
    const { category, q, sort } = req.query;
    const where = ["p.is_active = 1"];
    const params = [];

    if (category && category !== "Semua") {
      where.push("c.name = ?");
      params.push(category);
    }
    if (q && q.trim()) {
      where.push("(p.name LIKE ? OR c.name LIKE ?)");
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, c.name AS category, p.description,
              p.duration_minutes AS durationMinutes,
              p.price, p.old_price AS oldPrice, p.rating,
              p.review_count AS reviews, p.stock, p.badge, p.image
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE ${where.join(" AND ")}
        ORDER BY ${SORTS[sort] || SORTS.featured}`,
      params
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, c.name AS category, p.description,
              p.duration_minutes AS durationMinutes,
              p.price, p.old_price AS oldPrice, p.rating,
              p.review_count AS reviews, p.stock, p.badge, p.image
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.is_active = 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Produk tidak ditemukan." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function listCategories(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.slug, COUNT(p.id) AS productCount
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id, c.name, c.slug
        ORDER BY c.id`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, getProduct, listCategories };
