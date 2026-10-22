const { pool } = require("../config/db");

async function listAvailableCoupons(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT code, discount_type AS discountType, discount_value AS discountValue,
              minimum_order AS minimumOrder, ends_at AS endsAt
         FROM coupons
        WHERE is_active = 1
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
          AND (usage_limit IS NULL OR used_count < usage_limit)
        ORDER BY discount_value DESC, id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

module.exports = { listAvailableCoupons };
