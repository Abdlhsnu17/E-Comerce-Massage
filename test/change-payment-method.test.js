const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("customer payment method switch is exposed end-to-end", () => {
  const routes = read("server/routes/commerceRoutes.js");
  const controller = read("server/controllers/orderController.js");
  const api = read("public/js/api.js");
  const app = read("public/js/app.js");

  assert.match(routes, /post\("\/orders\/:id\/payment-method", changePaymentMethod\)/);
  assert.match(routes, /patch\("\/orders\/:id\/payment-method", changePaymentMethod\)/);
  assert.match(controller, /order\.paymentStatus !== "Menunggu pembayaran"/);
  assert.match(controller, /payment_method = \?, payment_due_at = \?/);
  assert.match(controller, /payment_reference = \?/);
  assert.match(controller, /COALESCE\(payment_reference, order_code\) = \?/);
  assert.match(api, /changePaymentMethod:.*method: "POST"/);
  assert.match(app, /Ganti ke Transfer Bank/);
  assert.match(app, /Ganti ke QRIS/);
});
