const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { verifyNotification, localStatus, integerAmount } = require("../server/services/midtransQris");

test("verifies a valid Midtrans notification signature", () => {
  const previous = process.env.MIDTRANS_SERVER_KEY;
  process.env.MIDTRANS_SERVER_KEY = "server-secret";
  const payload = { order_id: "AERA-123", status_code: "200", gross_amount: "125000.00" };
  payload.signature_key = crypto.createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");
  assert.equal(verifyNotification(payload), true);
  assert.equal(verifyNotification({ ...payload, gross_amount: "1.00" }), false);
  if (previous === undefined) delete process.env.MIDTRANS_SERVER_KEY;
  else process.env.MIDTRANS_SERVER_KEY = previous;
});

test("maps QRIS gateway statuses without treating a scan as payment", () => {
  assert.equal(localStatus({ transaction_status: "pending", status_code: "201" }), "Menunggu pembayaran");
  assert.equal(localStatus({ transaction_status: "settlement", status_code: "200", fraud_status: "accept" }), "Dibayar");
  assert.equal(localStatus({ transaction_status: "expire" }), "Dibatalkan");
  assert.equal(localStatus({ transaction_status: "deny" }), "Gagal");
});

test("accepts only positive whole-rupiah amounts", () => {
  assert.equal(integerAmount("125000.00"), 125000);
  assert.throws(() => integerAmount("1000.50"));
  assert.throws(() => integerAmount(0));
});

test("reports a clear error when QRIS is not configured", async () => {
  const previous = process.env.MIDTRANS_SERVER_KEY;
  delete process.env.MIDTRANS_SERVER_KEY;
  const { createQris } = require("../server/services/midtransQris");
  await assert.rejects(
    createQris({ orderCode: "AERA-TEST", total: 10000, items: [{ id: 1, name: "Tes", price: 10000, qty: 1 }], customer: { name: "Tes" } }),
    error => error.status === 503 && /belum dikonfigurasi/i.test(error.message)
  );
  if (previous === undefined) delete process.env.MIDTRANS_SERVER_KEY;
  else process.env.MIDTRANS_SERVER_KEY = previous;
});
