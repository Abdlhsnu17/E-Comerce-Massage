const { pool } = require("../config/db");
const fs = require("fs/promises");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { findOrCreateCart } = require("./cartController");
const { createQris, getStatus, verifyNotification, localStatus, integerAmount } = require("../services/midtransQris");
const { getBookingSettings, availableTimesForTherapists, assignAvailableTherapist } = require("../services/bookingSchedule");
const { notifyOrderUpdate } = require("../services/orderMailer");
const { SECRET } = require("../middleware/auth");

const SHIPPING_COST = { regular: 0, express: 0 };
const PAYMENT_METHODS = ["QRIS", "Transfer Bank", "Tunai"];
const SERVICE_LOCATIONS = ["studio", "home"];
const DEFAULT_PAYMENT_DETAILS = Object.freeze({
  bankName: process.env.BANK_NAME || "Bank Mandiri",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || "9000050103739",
  bankAccountHolder: process.env.BANK_ACCOUNT_HOLDER || "HAFSAH QUROTUN AINI",
  // URL gambar QRIS merchant yang diterbitkan penyedia pembayaran.
  qrisImageUrl: process.env.QRIS_IMAGE_URL || ""
});
const QRIS_PAYMENT_MINUTES = Math.max(5, Number(process.env.QRIS_PAYMENT_MINUTES) || 15);
const TRANSFER_PAYMENT_HOURS = Math.max(1, Number(process.env.TRANSFER_PAYMENT_HOURS) || 24);

async function getPaymentDetails() {
  try {
    const [rows] = await pool.query(
      `SELECT bank_name AS bankName, bank_account_number AS bankAccountNumber,
              bank_account_holder AS bankAccountHolder
         FROM payment_settings WHERE id = 1`
    );
    return { ...DEFAULT_PAYMENT_DETAILS, ...(rows[0] || {}) };
  } catch (error) {
    // Tetap kompatibel ketika migrasi belum sempat dijalankan.
    if (error.code === "ER_NO_SUCH_TABLE") return DEFAULT_PAYMENT_DETAILS;
    throw error;
  }
}

// Dilempar dari dalam transaksi supaya rollback selalu jalan sebelum dibalas ke klien.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function buildOrderCode() {
  return `AERA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function recoveryToken(orderId) {
  return jwt.sign({ orderId: Number(orderId), purpose: "guest-order" }, SECRET, { expiresIn: "365d" });
}

function recoveryOrderId(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.purpose === "guest-order" && Number.isInteger(Number(payload.orderId)) ? Number(payload.orderId) : null;
  } catch {
    return null;
  }
}

function orderAccess(req) {
  const token = String(req.get("X-Order-Token") || "");
  const orderId = recoveryOrderId(token);
  const clauses = [];
  const values = [];

  if (req.user) { clauses.push("user_id = ?"); values.push(req.user.id); }
  if (/^[a-f0-9]{64}$/.test(token)) { clauses.push("guest_access_token_hash = ?"); values.push(tokenHash(token)); }
  if (orderId) { clauses.push("id = ?"); values.push(orderId); }

  return clauses.length ? { clause: `(${clauses.join(" OR ")})`, values } : null;
}

function listOrderAccess(req) {
  const tokens = String(req.get("X-Order-Tokens") || "").split(",").filter(Boolean).slice(0, 20);
  const hashes = tokens.filter(token => /^[a-f0-9]{64}$/.test(token)).map(tokenHash);
  const orderIds = tokens.map(recoveryOrderId).filter(Boolean);
  const clauses = [];
  const values = [];

  // Pengguna yang sedang login tetap dapat memulihkan pesanan tamu melalui
  // kode pesanan + nomor WhatsApp. Token pemulihan sudah diverifikasi di atas.
  if (req.user) { clauses.push("user_id = ?"); values.push(req.user.id); }
  if (hashes.length) { clauses.push(`guest_access_token_hash IN (${hashes.map(() => "?").join(",")})`); values.push(...hashes); }
  if (orderIds.length) { clauses.push(`id IN (${orderIds.map(() => "?").join(",")})`); values.push(...orderIds); }

  return clauses.length ? { whereClause: `(${clauses.join(" OR ")})`, values } : null;
}

function normalizedPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

async function lookupOrder(req, res, next) {
  try {
    const orderCode = String(req.body.orderCode || "").trim().toUpperCase();
    const phone = normalizedPhone(req.body.phone);
    if (!/^AERA-[A-Z0-9-]{6,40}$/.test(orderCode) || phone.length < 9) {
      return res.status(400).json({ message: "Kode pesanan atau nomor WhatsApp tidak valid." });
    }
    const [rows] = await pool.query(
      "SELECT id, order_code AS orderCode, recipient_phone AS recipientPhone FROM orders WHERE order_code = ? LIMIT 1",
      [orderCode]
    );
    const order = rows[0];
    const actual = normalizedPhone(order?.recipientPhone);
    const matches = order && actual.length === phone.length
      && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(phone));
    if (!matches) return res.status(404).json({ message: "Pesanan tidak ditemukan. Periksa kembali kode dan nomor WhatsApp." });
    res.json({ id: order.id, orderCode: order.orderCode, accessToken: recoveryToken(order.id) });
  } catch (error) {
    next(error);
  }
}

function paymentDetails(details, order = {}) {
  return { ...details, qrisImageUrl: order.qrisUrl || "" };
}

/** Lepaskan stok dan slot booking yang tidak dibayar sebelum tenggat. */
async function expirePendingOrders() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id, discount_code AS discountCode FROM orders
        WHERE payment_status = 'Menunggu pembayaran'
          AND payment_due_at IS NOT NULL AND payment_due_at <= NOW()
        FOR UPDATE`
    );
    for (const order of orders) {
      const [result] = await connection.query(
        `UPDATE orders SET payment_status = 'Kedaluwarsa', status = 'Dibatalkan',
                appointment_status = 'Dibatalkan', payment_updated_at = NOW()
          WHERE id = ? AND payment_status = 'Menunggu pembayaran'`, [order.id]
      );
      if (!result.affectedRows) continue;
      const [items] = await connection.query(
        "SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL", [order.id]
      );
      for (const item of items) {
        await connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.productId]);
      }
      if (order.discountCode) {
        await connection.query("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?", [order.discountCode]);
      }
    }
    await connection.commit();
    return orders.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function applyGatewayStatus(connection, order, gatewayPayload) {
  if (integerAmount(Number(gatewayPayload.gross_amount)) !== integerAmount(Number(order.total))) {
    throw new HttpError(400, "Nominal notifikasi pembayaran tidak sesuai dengan pesanan.");
  }
  const nextStatus = localStatus(gatewayPayload);
  // Status lunas tidak boleh mundur bila notifikasi lama datang terlambat.
  if (order.paymentStatus === "Dibayar" && nextStatus !== "Dibayar") return "Dibayar";
  await connection.query(
    `UPDATE orders SET payment_status = ?, payment_updated_at = NOW(),
            status = CASE
              WHEN ? = 'Dibayar' AND status = 'Menunggu pembayaran' AND appointment_status = 'Dikonfirmasi' THEN 'Terkonfirmasi'
              WHEN ? = 'Dibayar' AND status = 'Menunggu pembayaran' THEN 'Menunggu konfirmasi'
              ELSE status END,
            payment_due_at = IF(? = 'Dibayar', NULL, payment_due_at),
            gateway_transaction_id = COALESCE(gateway_transaction_id, ?)
      WHERE id = ?`,
    [nextStatus, nextStatus, nextStatus, nextStatus, gatewayPayload.transaction_id || null, order.id]
  );
  await connection.query(
    `UPDATE orders SET status = 'Selesai'
      WHERE id = ? AND payment_status = 'Dibayar'
        AND appointment_status = 'Selesai' AND status <> 'Dibatalkan'`,
    [order.id]
  );
  return nextStatus;
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
    notes,
    couponCode
  } = req.body;

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ message: "Metode pembayaran tidak dikenali." });
  }
  if (paymentMethod === "Tunai" && serviceLocation === "home") {
    return res.status(400).json({ message: "Kunjungan ke rumah memerlukan pembayaran QRIS atau transfer bank." });
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
  const cleanEmail = String(recipientEmail || "").trim();
  const cleanPhone = String(recipientPhone || "").replace(/[^0-9+]/g, "");
  if (!recipientName || !cleanPhone || !address) {
    return res.status(400).json({ message: "Nama, nomor WhatsApp, dan alamat wajib diisi." });
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ message: "Format email tidak valid." });
  }

  await expirePendingOrders();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Isi keranjang dan harga diambil langsung dari database, bukan dari browser.
    const cartId = await findOrCreateCart(req, connection);
    const [lines] = await connection.query(
      `SELECT p.id, p.name, p.image, p.price, p.stock, p.duration_minutes AS durationMinutes, ci.quantity AS qty
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = ? AND p.is_active = 1
        FOR UPDATE`,
      [cartId]
    );

    if (!lines.length) throw new HttpError(400, "Keranjang masih kosong.");

    let subtotal = 0;
    let serviceDurationMinutes = 0;
    for (const line of lines) {
      if (line.stock < line.qty) {
        throw new HttpError(409, `Stok ${line.name} tinggal ${line.stock}.`);
      }
      subtotal += line.price * line.qty;
      serviceDurationMinutes += (Number(line.durationMinutes) || 60) * line.qty;
    }

    const shippingCost = SHIPPING_COST[shippingMethod];
    let discountAmount = 0;
    let appliedCoupon = null;
    const normalizedCoupon = String(couponCode || "").trim().toUpperCase();
    if (normalizedCoupon) {
      const [coupons] = await connection.query(
        `SELECT id, code, discount_type AS discountType, discount_value AS discountValue,
                minimum_order AS minimumOrder, usage_limit AS usageLimit, used_count AS usedCount
           FROM coupons WHERE code = ? AND is_active = 1
             AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) FOR UPDATE`,
        [normalizedCoupon]
      );
      const coupon = coupons[0];
      if (!coupon || (coupon.usageLimit !== null && Number(coupon.usedCount) >= Number(coupon.usageLimit))) throw new HttpError(400, "Voucher tidak aktif atau kuotanya telah habis.");
      if (subtotal < Number(coupon.minimumOrder)) throw new HttpError(400, `Voucher berlaku untuk transaksi minimal ${coupon.minimumOrder}.`);
      discountAmount = coupon.discountType === "percent" ? subtotal * Number(coupon.discountValue) / 100 : Number(coupon.discountValue);
      discountAmount = Math.min(discountAmount, subtotal);
      appliedCoupon = coupon;
    }
    const orderCode = buildOrderCode();

    // Satu terapis/sesi hanya menerima satu booking aktif pada waktu yang sama.
    // Pemeriksaan dilakukan di dalam transaksi agar checkout bersamaan tetap aman.
    const settings = await getBookingSettings(connection);
    const [therapists] = await connection.query("SELECT id, name FROM therapists WHERE is_active = 1 ORDER BY id FOR UPDATE");
    if (!therapists.length) throw new HttpError(409, "Belum ada terapis aktif untuk menerima booking.");
    const [occupiedSlots] = await connection.query(
      `SELECT id, therapist_id AS therapistId, TIME_FORMAT(appointment_time, '%H:%i') AS time,
              service_duration_minutes AS durationMinutes FROM orders
        WHERE appointment_date = ?
          AND status <> 'Dibatalkan' AND appointment_status <> 'Dibatalkan'
        FOR UPDATE`,
      [appointmentDate]
    );
    const validSlots = availableTimesForTherapists({ date: appointmentDate, durationMinutes: serviceDurationMinutes, settings, bookings: occupiedSlots, therapists });
    if (!validSlots.includes(appointmentTime)) {
      throw new HttpError(409, "Slot tidak tersedia, berada di luar jam operasional, atau bertabrakan dengan durasi sesi lain.");
    }
    const assignedTherapist = assignAvailableTherapist({ time: appointmentTime, durationMinutes: serviceDurationMinutes, settings, bookings: occupiedSlots, therapists });

    const initialOrderStatus = paymentMethod === "Tunai" ? "Menunggu konfirmasi" : "Menunggu pembayaran";
    const paymentDueAt = paymentMethod === "QRIS"
      ? new Date(Date.now() + QRIS_PAYMENT_MINUTES * 60_000)
      : paymentMethod === "Transfer Bank" ? new Date(Date.now() + TRANSFER_PAYMENT_HOURS * 3_600_000) : null;
    const guestAccessToken = req.user ? null : crypto.randomBytes(32).toString("hex");
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_code, user_id, guest_access_token_hash, status, subtotal, discount_code, discount_amount, shipping_cost, total, shipping_method, payment_method, payment_due_at,
         appointment_date, appointment_time, service_duration_minutes, therapist_id, service_location,
         recipient_name, recipient_email, recipient_phone, shipping_address, shipping_city, shipping_zip, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        orderCode, req.user?.id || null, guestAccessToken ? tokenHash(guestAccessToken) : null, initialOrderStatus, subtotal, appliedCoupon?.code || null, discountAmount, shippingCost, subtotal - discountAmount + shippingCost,
        shippingMethod, paymentMethod, paymentDueAt, appointmentDate, appointmentTime, serviceDurationMinutes, assignedTherapist.id, serviceLocation,
        recipientName, cleanEmail || null, cleanPhone,
        address, city || null, zip || null, notes || null
      ]
    );
    if (appliedCoupon) await connection.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [appliedCoupon.id]);

    await connection.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
       VALUES ?`,
      [lines.map(line => [orderResult.insertId, line.id, line.name, line.image, line.price, line.qty])]
    );

    for (const line of lines) {
      await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [line.qty, line.id]);
    }

    let qris = null;
    if (paymentMethod === "QRIS") {
      qris = await createQris({
        orderCode,
        total: subtotal - discountAmount + shippingCost,
        discountAmount,
        items: [
          ...lines.map(line => ({ id: line.id, name: line.name, price: Number(line.price), qty: line.qty })),
          ...(shippingCost ? [{ id: "shipping", name: "Biaya layanan", price: shippingCost, qty: 1 }] : [])
        ],
        customer: { name: recipientName, email: cleanEmail, phone: cleanPhone }
      });
      await connection.query(
        `UPDATE orders SET payment_gateway = 'midtrans', gateway_transaction_id = ?, qris_url = ? WHERE id = ?`,
        [qris.transactionId, qris.qrUrl, orderResult.insertId]
      );
    }

    // Keranjang dikosongkan di transaksi yang sama dengan pembuatan pesanan.
    await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

    await connection.commit();
    if (cleanEmail) notifyOrderUpdate({
      to: cleanEmail,
      recipientName,
      orderCode,
      subject: `Booking ${orderCode} diterima`,
      message: "Booking Anda sudah kami terima. Silakan selesaikan pembayaran sesuai metode yang dipilih.",
      details: [`Jadwal: ${appointmentDate} pukul ${appointmentTime}`, `Metode pembayaran: ${paymentMethod}`]
    });
    const details = await getPaymentDetails();
    res.status(201).json({
      id: orderResult.insertId,
      accessToken: guestAccessToken,
      orderCode,
      subtotal,
      shippingCost,
        total: subtotal - discountAmount + shippingCost,
      status: initialOrderStatus,
      paymentStatus: "Menunggu pembayaran",
      paymentDueAt,
      appointmentStatus: "Menunggu konfirmasi",
      appointmentDate,
      appointmentTime,
      serviceLocation,
      paymentMethod,
      paymentDetails: paymentDetails(details, { qrisUrl: qris?.qrUrl })
    });
  } catch (error) {
    await connection.rollback();
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally {
    connection.release();
  }
}

async function getAvailability(req, res, next) {
  try {
    await expirePendingOrders();
    const date = String(req.query.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Tanggal jadwal tidak valid." });
    }
    const durationMinutes = Math.min(480, Math.max(1, Number(req.query.durationMinutes) || 60));
    const settings = await getBookingSettings(pool);
    const [therapists] = await pool.query("SELECT id, name FROM therapists WHERE is_active = 1 ORDER BY id");
    const [rows] = await pool.query(
      `SELECT therapist_id AS therapistId, TIME_FORMAT(appointment_time, '%H:%i') AS time,
              service_duration_minutes AS durationMinutes
         FROM orders
        WHERE appointment_date = ? AND status <> 'Dibatalkan'
          AND appointment_status <> 'Dibatalkan'`,
      [date]
    );
    res.json({ date, durationMinutes, settings, therapistCount: therapists.length, availableTimes: availableTimesForTherapists({ date, durationMinutes, settings, bookings: rows, therapists }) });
  } catch (error) {
    next(error);
  }
}

async function requestOrderChange(req, res, next) {
  try {
    const access = orderAccess(req);
    if (!access) return res.status(401).json({ message: "Akses pesanan tidak valid." });
    const orderId = Number(req.params.id);
    const requestType = req.body.requestType;
    const reason = String(req.body.reason || "").trim().slice(0, 500) || null;
    if (!Number.isInteger(orderId) || !["reschedule", "cancel"].includes(requestType)) return res.status(400).json({ message: "Permintaan tidak valid." });
    const [orders] = await pool.query(
      `SELECT id, therapist_id AS therapistId, service_duration_minutes AS durationMinutes FROM orders WHERE id = ? AND ${access.clause} AND status <> 'Dibatalkan' AND appointment_status <> 'Selesai'`,
      [orderId, ...access.values]
    );
    if (!orders.length) return res.status(404).json({ message: "Pesanan tidak dapat diubah." });
    const [pending] = await pool.query(
      "SELECT id FROM order_change_requests WHERE order_id = ? AND status = 'Menunggu' LIMIT 1",
      [orderId]
    );
    if (pending.length) return res.status(409).json({ message: "Masih ada permintaan perubahan yang menunggu keputusan admin." });
    let date = null, time = null;
    if (requestType === "reschedule") {
      date = String(req.body.appointmentDate || ""); time = String(req.body.appointmentTime || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ message: "Tanggal dan jam baru wajib diisi." });
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time.split(":").map(Number);
      const requestedAt = new Date(year, month - 1, day, hour, minute);
      if (requestedAt.getFullYear() !== year || requestedAt.getMonth() !== month - 1 || requestedAt.getDate() !== day || requestedAt.getHours() !== hour || requestedAt.getMinutes() !== minute || requestedAt <= new Date()) {
        return res.status(400).json({ message: "Pilih jadwal baru yang belum berlalu." });
      }
      const settings = await getBookingSettings(pool);
      const [therapists] = await pool.query("SELECT id, name FROM therapists WHERE is_active = 1 ORDER BY id");
      const [occupied] = await pool.query(
        `SELECT therapist_id AS therapistId, TIME_FORMAT(appointment_time, '%H:%i') AS time, service_duration_minutes AS durationMinutes
           FROM orders WHERE id <> ? AND appointment_date = ?
            AND status <> 'Dibatalkan' AND appointment_status <> 'Dibatalkan'`,
        [orderId, date]
      );
      const validSlots = availableTimesForTherapists({ date, durationMinutes: orders[0].durationMinutes, settings, bookings: occupied, therapists });
      if (!validSlots.includes(time)) return res.status(409).json({ message: "Jadwal baru tidak tersedia atau bertabrakan dengan sesi lain." });
    }
    await pool.query(
      `INSERT INTO order_change_requests (order_id, user_id, request_type, requested_date, requested_time, reason)
       VALUES (?, ?, ?, ?, ?, ?)`, [orderId, req.user?.id || null, requestType, date, time, reason]
    );
    res.status(201).json({ message: requestType === "cancel" ? "Permintaan pembatalan telah dikirim ke admin." : "Permintaan ubah jadwal telah dikirim ke admin." });
  } catch (error) { next(error); }
}

async function discardUploadedFile(file) {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
}

/** Bukti transfer hanya mengajukan verifikasi; pelanggan tidak dapat melunasi order sendiri. */
async function uploadPaymentProof(req, res, next) {
  try {
    await expirePendingOrders();
    const access = orderAccess(req);
    if (!access) { await discardUploadedFile(req.file); return res.status(401).json({ message: "Akses pesanan tidak valid." }); }
    const [orders] = await pool.query(
      `SELECT id, order_code AS orderCode, total, payment_method AS paymentMethod,
              payment_status AS paymentStatus
         FROM orders WHERE id = ? AND ${access.clause}`,
      [req.params.id, ...access.values]
    );
    const order = orders[0];
    if (!order) { await discardUploadedFile(req.file); return res.status(404).json({ message: "Pesanan tidak ditemukan." }); }
    if (order.paymentMethod !== "Transfer Bank") { await discardUploadedFile(req.file); return res.status(400).json({ message: "Bukti pembayaran hanya digunakan untuk transfer bank." }); }
    if (!req.file) return res.status(400).json({ message: "Pilih foto bukti transfer." });
    if (order.paymentStatus === "Dibayar") { await discardUploadedFile(req.file); return res.status(409).json({ message: "Pembayaran sudah dikonfirmasi." }); }
    if (order.paymentStatus !== "Menunggu pembayaran") {
      await discardUploadedFile(req.file);
      return res.status(409).json({ message: `Bukti tidak dapat dikirim karena status pembayaran ${order.paymentStatus}.` });
    }
    await pool.query(
      `UPDATE orders SET payment_status = 'Menunggu verifikasi', payment_proof_url = ?,
              payment_proof_uploaded_at = NOW(), payment_updated_at = NOW(), payment_due_at = NULL
        WHERE id = ?`, [`/uploads/${req.file.filename}`, order.id]
    );
    res.json({ id: order.id, paymentStatus: "Menunggu verifikasi", message: "Bukti transfer terkirim dan sedang diverifikasi admin." });
  } catch (error) {
    await discardUploadedFile(req.file);
    next(error);
  }
}

async function listOrders(req, res, next) {
  try {
    await expirePendingOrders();
    const access = listOrderAccess(req);
    if (!access) return res.json([]);
    const { whereClause, values } = access;
    const [orders] = await pool.query(
            `SELECT id, order_code AS orderCode, status, subtotal, shipping_cost AS shippingCost,
              total, shipping_method AS shippingMethod, payment_method AS paymentMethod,
              payment_status AS paymentStatus, qris_url AS qrisUrl, payment_due_at AS paymentDueAt,
              payment_proof_url AS paymentProofUrl,
              recipient_name AS recipientName, recipient_email AS recipientEmail,
              recipient_phone AS recipientPhone,
              appointment_date AS appointmentDate,
              TIME_FORMAT(appointment_time, '%H:%i') AS appointmentTime,
              service_location AS serviceLocation, appointment_status AS appointmentStatus,
              EXISTS(SELECT 1 FROM service_reviews sr WHERE sr.order_id = orders.id) AS hasReview,
              (SELECT r.status FROM order_change_requests r WHERE r.order_id = orders.id ORDER BY r.created_at DESC LIMIT 1) AS changeRequestStatus,
              (SELECT r.request_type FROM order_change_requests r WHERE r.order_id = orders.id ORDER BY r.created_at DESC LIMIT 1) AS changeRequestType,
              created_at AS createdAt
         FROM orders WHERE ${whereClause} ORDER BY created_at DESC`,
      values
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
    const details = await getPaymentDetails();
    res.json([...grouped.values()].map(order => ({ ...order, paymentDetails: paymentDetails(details, order) })));
  } catch (error) {
    next(error);
  }
}

async function refreshPayment(req, res, next) {
  try {
    await expirePendingOrders();
    const access = orderAccess(req);
    if (!access) return res.status(401).json({ message: "Akses pesanan tidak valid." });
    const [rows] = await pool.query(
      `SELECT id, order_code AS orderCode, total, payment_method AS paymentMethod,
              payment_status AS paymentStatus
         FROM orders WHERE id = ? AND ${access.clause}`,
      [req.params.id, ...access.values]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    if (order.paymentMethod !== "QRIS" || order.paymentStatus !== "Menunggu pembayaran") {
      return res.json({ id: order.id, paymentStatus: order.paymentStatus });
    }
    const gatewayPayload = await getStatus(order.orderCode);
    const paymentStatus = await applyGatewayStatus(pool, order, gatewayPayload);
    res.json({ id: order.id, paymentStatus });
  } catch (error) {
    next(error);
  }
}

async function midtransNotification(req, res, next) {
  try {
    if (!verifyNotification(req.body)) return res.status(401).json({ message: "Tanda tangan notifikasi tidak valid." });
    const [rows] = await pool.query(
      `SELECT id, total, payment_status AS paymentStatus FROM orders
        WHERE order_code = ? AND payment_method = 'QRIS'`,
      [req.body.order_id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    const paymentStatus = await applyGatewayStatus(pool, order, req.body);
    res.json({ received: true, paymentStatus });
  } catch (error) {
    next(error);
  }
}

module.exports = { createOrder, lookupOrder, getAvailability, requestOrderChange, listOrders, uploadPaymentProof, refreshPayment, midtransNotification, expirePendingOrders, orderAccess, listOrderAccess, SHIPPING_COST };
