const { pool } = require("../config/db");
const { owner } = require("../middleware/session");

/** Mencari keranjang milik pemilik saat ini, membuatnya bila belum ada. */
async function findOrCreateCart(req, connection = pool) {
  const { column, value } = owner(req);
  const [rows] = await connection.query(`SELECT id FROM carts WHERE ${column} = ?`, [value]);
  if (rows.length) return rows[0].id;

  const [result] = await connection.query(`INSERT INTO carts (${column}) VALUES (?)`, [value]);
  return result.insertId;
}

async function readCart(cartId, connection = pool) {
  const [items] = await connection.query(
    `SELECT ci.product_id AS id, ci.quantity AS qty,
            p.name, c.name AS category, p.price, p.old_price AS oldPrice,
            p.image, p.stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
      WHERE ci.cart_id = ?
      ORDER BY ci.created_at`,
    [cartId]
  );

  const subtotal = items.reduce((total, item) => total + item.price * item.qty, 0);
  const totalQty = items.reduce((total, item) => total + item.qty, 0);
  return { items, subtotal, totalQty };
}

async function getCart(req, res, next) {
  try {
    res.json(await readCart(await findOrCreateCart(req)));
  } catch (error) {
    next(error);
  }
}

async function addItem(req, res, next) {
  try {
    const productId = Number(req.body.productId);
    const qty = Number(req.body.qty || 1);
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: "Produk atau jumlah tidak valid." });
    }

    const [products] = await pool.query(
      "SELECT id, name, stock FROM products WHERE id = ? AND is_active = 1",
      [productId]
    );
    if (!products.length) return res.status(404).json({ message: "Produk tidak ditemukan." });

    const cartId = await findOrCreateCart(req);
    const [existing] = await pool.query(
      "SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, productId]
    );
    const nextQty = (existing[0]?.quantity || 0) + qty;
    if (nextQty > products[0].stock) {
      return res.status(409).json({ message: `Stok ${products[0].name} tinggal ${products[0].stock}.` });
    }

    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [cartId, productId, qty]
    );

    res.status(201).json(await readCart(cartId));
  } catch (error) {
    next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    const qty = Number(req.body.qty);
    if (!Number.isInteger(qty)) return res.status(400).json({ message: "Jumlah tidak valid." });

    const cartId = await findOrCreateCart(req);

    if (qty <= 0) {
      await pool.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, productId]);
      return res.json(await readCart(cartId));
    }

    const [products] = await pool.query("SELECT name, stock FROM products WHERE id = ?", [productId]);
    if (!products.length) return res.status(404).json({ message: "Produk tidak ditemukan." });
    if (qty > products[0].stock) {
      return res.status(409).json({ message: `Stok ${products[0].name} tinggal ${products[0].stock}.` });
    }

    const [result] = await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
      [qty, cartId, productId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Produk tidak ada di keranjang." });

    res.json(await readCart(cartId));
  } catch (error) {
    next(error);
  }
}

async function removeItem(req, res, next) {
  try {
    const cartId = await findOrCreateCart(req);
    await pool.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, Number(req.params.productId)]);
    res.json(await readCart(cartId));
  } catch (error) {
    next(error);
  }
}

/**
 * Saat tamu berhasil masuk, keranjang & favoritnya dipindahkan ke akun.
 * Dijalankan di dalam transaksi milik pemanggil.
 */
async function mergeGuestData(connection, sessionToken, userId) {
  const [guestCarts] = await connection.query("SELECT id FROM carts WHERE session_token = ?", [sessionToken]);
  if (guestCarts.length) {
    const guestCartId = guestCarts[0].id;
    const [userCarts] = await connection.query("SELECT id FROM carts WHERE user_id = ?", [userId]);

    if (!userCarts.length) {
      // Belum punya keranjang: keranjang tamu tinggal dialihkan kepemilikannya.
      await connection.query("UPDATE carts SET user_id = ?, session_token = NULL WHERE id = ?", [userId, guestCartId]);
    } else {
      // Sudah punya keranjang: item dipindahkan satu per satu agar jumlah yang
      // sama produknya dijumlahkan, lalu keranjang tamu dibuang.
      const [guestItems] = await connection.query(
        "SELECT product_id, quantity FROM cart_items WHERE cart_id = ?",
        [guestCartId]
      );
      for (const item of guestItems) {
        await connection.query(
          `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
          [userCarts[0].id, item.product_id, item.quantity]
        );
      }
      await connection.query("DELETE FROM carts WHERE id = ?", [guestCartId]);
    }
  }

  const [guestFavorites] = await connection.query(
    "SELECT product_id FROM favorites WHERE session_token = ?",
    [sessionToken]
  );
  for (const favorite of guestFavorites) {
    await connection.query(
      "INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)",
      [userId, favorite.product_id]
    );
  }
  await connection.query("DELETE FROM favorites WHERE session_token = ?", [sessionToken]);
}

module.exports = { getCart, addItem, updateItem, removeItem, findOrCreateCart, readCart, mergeGuestData };
