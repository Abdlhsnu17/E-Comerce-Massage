const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../public/js/invoice-exports.js"), "utf8");
const browserWindow = {};
const context = {
  window: browserWindow,
  document: { addEventListener() {} },
  Intl
};
vm.runInNewContext(source, context);
const invoiceExports = browserWindow.invoiceExports;

test("Excel export includes order details and item totals", () => {
  const csv = invoiceExports.createCsv({
    orderCode: "INV-1001",
    customerName: "Nama Pelanggan",
    paymentMethod: "QRIS",
    paymentStatus: "Dibayar",
    appointmentDate: "2026-10-03",
    appointmentTime: "09:00",
    subtotal: 100000,
    shippingCost: 15000,
    total: 115000,
    items: [{ name: "Pijat bayi", qty: 2, price: 50000, lineTotal: 100000 }]
  });

  assert.match(csv, /"Invoice","INV-1001"/);
  assert.match(csv, /"Nama Pelanggan"/);
  assert.match(csv, /"Pijat bayi","2","50000","100000"/);
  assert.match(csv, /"Total \(Rp\)","115000"/);
});

test("Excel export neutralizes formula-like text", () => {
  const csv = invoiceExports.createCsv({
    orderCode: "=HYPERLINK(\"https:\/\/example.com\")",
    items: [{ name: "@SUM(1,1)", qty: 1, price: 10, lineTotal: 10 }]
  });

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.com""\)"/);
  assert.match(csv, /"'@SUM\(1,1\)"/);
});
