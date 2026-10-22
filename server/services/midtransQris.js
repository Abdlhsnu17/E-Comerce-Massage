const crypto = require("crypto");

function config() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) throw Object.assign(new Error("Pembayaran QRIS belum dikonfigurasi oleh pengelola."), { status: 503 });
  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return {
    serverKey,
    baseUrl: production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com"
  };
}

async function request(path, options = {}) {
  const { serverKey, baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...options.headers
    },
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.error_messages) ? body.error_messages.join(" ") : body.status_message;
    throw Object.assign(new Error(message || "Gateway QRIS tidak dapat dihubungi."), { status: 502 });
  }
  return body;
}

function integerAmount(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw Object.assign(new Error("Nominal QRIS harus berupa bilangan rupiah yang valid."), { status: 400 });
  }
  return amount;
}

async function createQris({ orderCode, total, items, customer }) {
  const grossAmount = integerAmount(total);
  const body = {
    payment_type: "qris",
    transaction_details: { order_id: orderCode, gross_amount: grossAmount },
    item_details: items.map(item => ({
      id: String(item.id),
      price: integerAmount(item.price),
      quantity: Number(item.qty),
      name: String(item.name).slice(0, 50)
    })),
    customer_details: {
      first_name: String(customer.name).slice(0, 50),
      ...(customer.email ? { email: customer.email } : {}),
      phone: customer.phone || undefined
    },
    qris: { acquirer: process.env.MIDTRANS_QRIS_ACQUIRER || "gopay" }
  };
  const response = await request("/v2/charge", { method: "POST", body: JSON.stringify(body) });
  const qrAction = response.actions?.find(action => action.name === "generate-qr-code-v2")
    || response.actions?.find(action => action.name === "generate-qr-code");
  if (!qrAction?.url || response.transaction_status !== "pending") {
    throw Object.assign(new Error("Gateway tidak mengembalikan QRIS yang valid."), { status: 502 });
  }
  return { transactionId: response.transaction_id, qrUrl: qrAction.url };
}

async function getStatus(orderCode) {
  return request(`/v2/${encodeURIComponent(orderCode)}/status`, { method: "GET" });
}

function verifyNotification(payload) {
  const { serverKey } = config();
  const required = [payload.order_id, payload.status_code, payload.gross_amount, payload.signature_key];
  if (required.some(value => typeof value !== "string" || !value)) return false;
  const expected = crypto.createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest("hex");
  const actual = payload.signature_key.toLowerCase();
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function localStatus(payload) {
  if (payload.transaction_status === "settlement" && payload.status_code === "200" && (!payload.fraud_status || payload.fraud_status === "accept")) return "Dibayar";
  if (["deny", "cancel"].includes(payload.transaction_status)) return "Gagal";
  if (payload.transaction_status === "expire") return "Dibatalkan";
  return "Menunggu pembayaran";
}

module.exports = { createQris, getStatus, verifyNotification, localStatus, integerAmount };
