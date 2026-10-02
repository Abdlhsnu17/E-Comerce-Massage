const { pool } = require("../config/db");
const { findOrCreateCart } = require("./cartController");

const SHIPPING_COST = { regular: 0, express: 0 };
const PAYMENT_METHODS = ["QRIS", "Virtual Account", "Kartu Debit/Kredit"];
const SERVICE_LOCATIONS = ["studio", "home"];

// Dilempar dari dalam transaksi supaya rollback selalu jalan sebelum dibalas ke klien.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function buildOrderCode() {
  return `LM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

async function createOrder(req, res, next) {
  const {
    shippingMethod = "regular",
    paymentMethod,
    appointmentDate,
    appointmentTime,
    serviceLocation = "studio",
    recipientName,
    recipientEmail,
    recipientPhone,
    address,
    city,
    zip,
    notes
  } = req.body;

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ message: "Metode pembayaran tidak dikenali." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate || "") || !/^\d{2}:\d{2}$/.test(appointmentTime || "") || !SERVICE_LOCATIONS.includes(serviceLocation)) {
    return res.status(400).json({ message: "Tanggal, waktu, dan lokasi sesi wajib dipilih." });
  }
  const [year, month, day] = appointmentDate.split("-").map(Number);
  const [hour, minute] = appointmentTime.split(":").map(Number);
  const requestedAt = new Date(year, month - 1, day, hour, minute);
  if (requestedAt.getFullYear() !== year || requestedAt.getMonth() !== month - 1 || requestedAt.getDate() !== day || requestedAt.getHours() !== hour || requestedAt.getMinutes() !== minute || requestedAt <= new Date()) {
    return res.status(400).json({ message: "Pilih jadwal yang belum berlalu." });
  }
  if (!Object.hasOwn(SHIPPING_COST, shippingMethod)) {
    return res.status(400).json({ message: "Metode pengiriman tidak dikenali." });
  }
  if (!recipientName || !recipientEmail || !address) {
    return res.status(400).json({ message: "Nama, email, dan alamat penerima wajib diisi." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Isi keranjang dan harga diambil langsung dari database, bukan dari browser.
    const cartId = await findOrCreateCart(req, connection);
    const [lines] = await connection.query(
      `SELECT p.id, p.name, p.image, p.price, p.stock, ci.quantity AS qty
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = ? AND p.is_active = 1
        FOR UPDATE`,
      [cartId]
    );

    if (!lines.length) throw new HttpError(400, "Keranjang masih kosong.");

    let subtotal = 0;
    for (const line of lines) {
      if (line.stock < line.qty) {
        throw new HttpError(409, `Stok ${line.name} tinggal ${line.stock}.`);
      }
      subtotal += line.price * line.qty;
    }

    const shippingCost = SHIPPING_COST[shippingMethod];
    const orderCode = buildOrderCode();

    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_code, user_id, subtotal, shipping_cost, total, shipping_method, payment_method,
         appointment_date, appointment_time, service_location,
         recipient_name, recipient_email, recipient_phone, shipping_address, shipping_city, shipping_zip, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        orderCode, req.user.id, subtotal, shippingCost, subtotal + shippingCost,
        shippingMethod, paymentMethod, appointmentDate, appointmentTime, serviceLocation,
        recipientName, recipientEmail, recipientPhone || null,
        address, city || null, zip || null, notes || null
      ]
    );

    await connection.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
       VALUES ?`,
      [lines.map(line => [orderResult.insertId, line.id, line.name, line.image, line.price, line.qty])]
    );

    for (const line of lines) {
      await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [line.qty, line.id]);
    }

    // Keranjang dikosongkan di transaksi yang sama dengan pembuatan pesanan.
    await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

    await connection.commit();
    res.status(201).json({
      id: orderResult.insertId,
      orderCode,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      status: "Sedang diproses",
      paymentStatus: "Menunggu pembayaran",
      appointmentStatus: "Menunggu konfirmasi",
      appointmentDate,
      appointmentTime,
      serviceLocation
    });
  } catch (error) {
    await connection.rollback();
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally {
    connection.release();
  }
}

async function listOrders(req, res, next) {
  try {
    const [orders] = await pool.query(
            `SELECT id, order_code AS orderCode, status, subtotal, shipping_cost AS shippingCost,
              total, shipping_method AS shippingMethod, payment_method AS paymentMethod,
              payment_status AS paymentStatus, appointment_date AS appointmentDate,
              TIME_FORMAT(appointment_time, '%H:%i') AS appointmentTime,
              service_location AS serviceLocation, appointment_status AS appointmentStatus,
              created_at AS createdAt
         FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    if (!orders.length) return res.json([]);

    const [items] = await pool.query(
      `SELECT order_id AS orderId, product_id AS productId, product_name AS name,
              product_image AS image, unit_price AS price, quantity AS qty, line_total AS lineTotal
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

module.exports = { createOrder, listOrders, SHIPPING_COST };
