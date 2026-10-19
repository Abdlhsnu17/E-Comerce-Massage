const { pool } = require("../config/db");

async function createReview(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim().slice(0, 1000) || null;
    if (!Number.isInteger(orderId) || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating harus antara 1 sampai 5." });
    const [orders] = await pool.query(
      `SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'Selesai' AND appointment_status = 'Selesai'`,
      [orderId, req.user.id]
    );
    if (!orders.length) return res.status(403).json({ message: "Ulasan hanya dapat dibuat setelah sesi selesai." });
    await pool.query("INSERT INTO service_reviews (order_id, user_id, rating, comment) VALUES (?, ?, ?, ?)", [orderId, req.user.id, rating, comment]);
    res.status(201).json({ message: "Terima kasih. Ulasan Anda menunggu moderasi admin." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Ulasan untuk pesanan ini sudah dikirim." });
    next(error);
  }
}

module.exports = { createReview };
