const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminController = fs.readFileSync(
  path.join(__dirname, "..", "server", "controllers", "adminController.js"),
  "utf8"
);
const orderController = fs.readFileSync(
  path.join(__dirname, "..", "server", "controllers", "orderController.js"),
  "utf8"
);

test("uploading transfer proof only moves payment to verification", () => {
  assert.match(orderController, /payment_status = 'Menunggu verifikasi'/);
  assert.doesNotMatch(
    orderController.match(/async function uploadPaymentProof[\s\S]*?\n}\n\nasync function listOrders/)?.[0] || "",
    /status = 'Terkonfirmasi'/
  );
});

test("admin payment approval automatically advances the order status", () => {
  const updatePaymentStatus = adminController.match(
    /async function updatePaymentStatus[\s\S]*?\n}\n\nasync function updateAppointmentStatus/
  )?.[0] || "";

  assert.match(updatePaymentStatus, /WHEN \? = 'Dibayar'[\s\S]*?appointment_status = 'Dikonfirmasi'[\s\S]*?THEN 'Terkonfirmasi'/);
  assert.match(updatePaymentStatus, /WHEN \? = 'Dibayar'[\s\S]*?THEN 'Menunggu konfirmasi'/);
});
