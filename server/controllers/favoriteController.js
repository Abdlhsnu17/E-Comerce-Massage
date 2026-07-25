const { pool } = require("../config/db");
const { owner } = require("../middleware/session");

async function listFavorites(req, res, next) {
  try {
    const { column, value } = owner(req);
    const [rows] = await pool.query(`SELECT product_id AS productId FROM favorites WHERE ${column} = ?`, [value]);
    res.json(rows.map(row => row.productId));
  } catch (error) {
    next(error);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    const { column, value } = owner(req);

    const [existing] = await pool.query(
      `SELECT id FROM favorites WHERE ${column} = ? AND product_id = ?`,
      [value, productId]
    );

    if (existing.length) {
      await pool.query("DELETE FROM favorites WHERE id = ?", [existing[0].id]);
      return res.json({ productId, favorited: false });
    }

    await pool.query(`INSERT INTO favorites (${column}, product_id) VALUES (?, ?)`, [value, productId]);
    res.json({ productId, favorited: true });
  } catch (error) {
    next(error);
  }
}

async function subscribeNewsletter(req, res, next) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email wajib diisi." });

    await pool.query(
      "INSERT INTO newsletter_subscribers (email) VALUES (?) ON DUPLICATE KEY UPDATE email = email",
      [email]
    );
    res.status(201).json({ message: "Terima kasih! Kamu sudah terdaftar." });
  } catch (error) {
    next(error);
  }
}

module.exports = { listFavorites, toggleFavorite, subscribeNewsletter };
