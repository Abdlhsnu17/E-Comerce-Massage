/**
 * Panel admin.
 *
 * Seluruh fungsi di berkas ini hanya boleh dipasang di belakang requireAdmin.
 * Data tetap satu sumber dengan sisi pelanggan — tabel yang sama di MySQL —
 * hanya cakupannya yang lebih luas (semua pesanan, semua akun, produk nonaktif).
 */
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

const ORDER_STATUSES = ["Sedang diproses", "Dikirim", "Selesai", "Dibatalkan"];
const PAYMENT_STATUSES = ["Menunggu pembayaran", "Dibayar", "Gagal", "Dibatalkan"];
const APPOINTMENT_STATUSES = ["Menunggu konfirmasi", "Dikonfirmasi", "Selesai", "Dibatalkan"];

/** "Nimbus Pro" → "nimbus-pro"; dipakai bila admin tidak mengisi slug sendiri. */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// ------------------------------------------------------------------ ringkasan

async function getStats(_req, res, next) {
  try {
    const [[totals]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users)                                    AS totalUsers,
         (SELECT COUNT(*) FROM users WHERE role = 'admin')               AS totalAdmins,
         (SELECT COUNT(*) FROM products)                                 AS totalProducts,
         (SELECT COUNT(*) FROM products WHERE is_active = 0)             AS inactiveProducts,
         (SELECT COUNT(*) FROM products WHERE stock <= 10)               AS lowStock,
         (SELECT COUNT(*) FROM orders)                                   AS totalOrders,
         (SELECT COUNT(*) FROM orders WHERE status = 'Sedang diproses')  AS pendingOrders,
         (SELECT COUNT(*) FROM orders WHERE payment_status = 'Menunggu pembayaran') AS pendingPayments,
         (SELECT COALESCE(SUM(total), 0) FROM orders
           WHERE status <> 'Dibatalkan' AND payment_status = 'Dibayar')  AS revenue,
         (SELECT COUNT(*) FROM newsletter_subscribers)                   AS subscribers`
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS jumlah, COALESCE(SUM(total), 0) AS nilai
         FROM orders GROUP BY status`
    );

    const [topProducts] = await pool.query(
      `SELECT oi.product_name AS name,
              SUM(oi.quantity)   AS terjual,
              SUM(oi.line_total) AS pendapatan
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
                      AND o.status <> 'Dibatalkan'
                      AND o.payment_status = 'Dibayar'
        GROUP BY oi.product_name
        ORDER BY terjual DESC
        LIMIT 5`
    );

    res.json({ ...totals, byStatus, topProducts });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------ pesanan

async function listAllOrders(req, res, next) {
  try {
    const where = [];
    const params = [];

    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
      where.push("o.status = ?");
      params.push(req.query.status);
    }
    if (req.query.q?.trim()) {
      where.push("(o.order_code LIKE ? OR u.email LIKE ? OR o.recipient_name LIKE ?)");
      const keyword = `%${req.query.q.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const [orders] = await pool.query(
      `SELECT o.id, o.order_code AS orderCode, o.status, o.subtotal,
              o.shipping_cost AS shippingCost, o.total,
              o.shipping_method AS shippingMethod, o.payment_method AS paymentMethod,
              o.payment_status AS paymentStatus, o.appointment_date AS appointmentDate,
              TIME_FORMAT(o.appointment_time, '%H:%i') AS appointmentTime,
              o.service_location AS serviceLocation, o.appointment_status AS appointmentStatus,
              o.recipient_name AS recipientName, o.recipient_email AS recipientEmail,
              o.recipient_phone AS recipientPhone, o.shipping_address AS address,
              o.shipping_city AS city, o.created_at AS createdAt,
              u.id AS userId, u.name AS customerName, u.email AS customerEmail
         FROM orders o
         JOIN users u ON u.id = o.user_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY o.created_at DESC
        LIMIT 200`,
      params
    );

    if (!orders.length) return res.json([]);

    const [items] = await pool.query(
      `SELECT order_id AS orderId, product_name AS name, product_image AS image,
              unit_price AS price, quantity AS qty, line_total AS lineTotal
         FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")})`,
      orders.map(order => order.id)
    );

    const grouped = new Map(orders.map(order => [order.id, { ...order, items: [] }]));
    items.forEach(item => grouped.get(item.orderId)?.items.push(item));
    res.json([...grouped.values()]);
  } catch (error) {
    next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status pesanan tidak dikenali." });
    }

    const [result] = await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pesanan tidak ditemukan." });

    res.json({ id: Number(req.params.id), status, message: `Status pesanan diubah menjadi ${status}.` });
  } catch (error) {
    next(error);
  }
}

async function updatePaymentStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status pembayaran tidak dikenali." });
    }
    const [result] = await pool.query("UPDATE orders SET payment_status = ? WHERE id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    await completeOrderWhenReady(req.params.id);
    res.json({ id: Number(req.params.id), paymentStatus: status });
  } catch (error) {
    next(error);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status jadwal tidak dikenali." });
    }
    const [result] = await pool.query("UPDATE orders SET appointment_status = ? WHERE id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    await completeOrderWhenReady(req.params.id);
    res.json({ id: Number(req.params.id), appointmentStatus: status });
  } catch (error) {
    next(error);
  }
}

/**
 * Pesanan hanya tuntas setelah pembayaran dan sesi benar-benar selesai.
 * Pesanan yang dibatalkan sengaja tidak boleh diaktifkan kembali otomatis.
 */
async function completeOrderWhenReady(orderId) {
  await pool.query(
    `UPDATE orders
        SET status = 'Selesai'
      WHERE id = ?
        AND payment_status = 'Dibayar'
        AND appointment_status = 'Selesai'
        AND status <> 'Dibatalkan'`,
    [orderId]
  );
}

// ------------------------------------------------------------------ produk

async function listAllProducts(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.duration_minutes AS durationMinutes, p.category_id AS categoryId,
              c.name AS category, p.price, p.old_price AS oldPrice, p.rating,
              p.review_count AS reviews, p.stock, p.badge, p.image,
              p.is_active AS isActive, p.created_at AS createdAt
         FROM products p
         JOIN categories c ON c.id = p.category_id
        ORDER BY p.id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const name = (req.body.name || "").trim();
    const categoryId = toNumber(req.body.categoryId);
    const price = toNumber(req.body.price);
    const stock = toNumber(req.body.stock) ?? 0;
    const durationMinutes = toNumber(req.body.durationMinutes);

    if (!name || !categoryId || price === null || price < 0 || durationMinutes === null || durationMinutes < 1) {
      return res.status(400).json({ message: "Nama, kategori, durasi, dan harga layanan wajib diisi." });
    }

    const [category] = await pool.query("SELECT id FROM categories WHERE id = ?", [categoryId]);
    if (!category.length) return res.status(400).json({ message: "Kategori tidak ditemukan." });

    const slug = slugify(req.body.slug || name);
    const [existing] = await pool.query("SELECT id FROM products WHERE slug = ?", [slug]);
    if (existing.length) return res.status(409).json({ message: "Slug produk sudah dipakai." });

    const [result] = await pool.query(
      `INSERT INTO products
         (category_id, name, slug, description, duration_minutes, price, old_price, stock, badge, image, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryId, name, slug, req.body.description || null, durationMinutes, price,
        toNumber(req.body.oldPrice), Math.max(0, stock),
        (req.body.badge || "").trim() || null,
        (req.body.image || "").trim() || "assets/img/bag.svg",
        req.body.isActive === false ? 0 : 1
      ]
    );

    res.status(201).json({ id: result.insertId, message: `Produk ${name} ditambahkan.` });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const fields = [];
    const params = [];
    const set = (column, value) => { fields.push(`${column} = ?`); params.push(value); };

    if (req.body.name !== undefined) set("name", String(req.body.name).trim());
    if (req.body.description !== undefined) set("description", req.body.description || null);
    if (req.body.durationMinutes !== undefined) {
      const durationMinutes = toNumber(req.body.durationMinutes);
      if (durationMinutes === null || durationMinutes < 1) return res.status(400).json({ message: "Durasi layanan minimal 1 menit." });
      set("duration_minutes", durationMinutes);
    }
    if (req.body.categoryId !== undefined) set("category_id", toNumber(req.body.categoryId));
    if (req.body.price !== undefined) set("price", toNumber(req.body.price));
    if (req.body.oldPrice !== undefined) set("old_price", toNumber(req.body.oldPrice));
    if (req.body.stock !== undefined) set("stock", Math.max(0, toNumber(req.body.stock) ?? 0));
    if (req.body.badge !== undefined) set("badge", (req.body.badge || "").trim() || null);
    if (req.body.image !== undefined) set("image", String(req.body.image).trim());
    if (req.body.isActive !== undefined) set("is_active", req.body.isActive ? 1 : 0);

    if (!fields.length) return res.status(400).json({ message: "Tidak ada data yang diubah." });

    const [result] = await pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
      [...params, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Produk tidak ditemukan." });

    res.json({ id: Number(req.params.id), message: "Produk diperbarui." });
  } catch (error) {
    next(error);
  }
}

/**
 * Hapus layanan dari katalog. Riwayat pesanan tetap aman: order_items
 * menyimpan snapshot nama/harga dan foreign key product_id memakai SET NULL.
 */
async function deleteProduct(req, res, next) {
  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Produk tidak ditemukan." });
    res.json({ id: Number(req.params.id), message: "Produk berhasil dihapus." });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------ pengguna

async function listUsers(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at AS createdAt,
              COUNT(o.id) AS totalOrders,
              COALESCE(SUM(CASE WHEN o.status <> 'Dibatalkan' THEN o.total END), 0) AS totalBelanja
         FROM users u
         LEFT JOIN orders o ON o.user_id = u.id
        GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at
        ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const role = req.body.role === "admin" ? "admin" : "user";

    if (!name || !email || password.length < 6) {
      return res.status(400).json({ message: "Nama, email, dan password minimal 6 karakter wajib diisi." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email sudah terdaftar." });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, hash, (req.body.phone || "").trim() || null, role]
    );

    res.status(201).json({ id: result.insertId, role, message: `Akun ${email} dibuat sebagai ${role}.` });
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const role = req.body.role;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Peran hanya boleh 'user' atau 'admin'." });
    }

    const targetId = Number(req.params.id);

    // Mencegah admin mengunci dirinya sendiri di luar panel.
    if (targetId === req.user.id && role !== "admin") {
      return res.status(400).json({ message: "Kamu tidak bisa menurunkan peranmu sendiri." });
    }

    // Selalu sisakan minimal satu admin di sistem.
    if (role !== "admin") {
      const [[{ jumlah }]] = await pool.query("SELECT COUNT(*) AS jumlah FROM users WHERE role = 'admin'");
      const [target] = await pool.query("SELECT role FROM users WHERE id = ?", [targetId]);
      if (target[0]?.role === "admin" && jumlah <= 1) {
        return res.status(400).json({ message: "Minimal harus ada satu admin." });
      }
    }

    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, targetId]);
    if (!result.affectedRows) return res.status(404).json({ message: "Akun tidak ditemukan." });

    res.json({ id: targetId, role, message: `Peran akun diubah menjadi ${role}.` });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  listAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateAppointmentStatus,
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listUsers,
  createUser,
  updateUserRole,
  ORDER_STATUSES
};
