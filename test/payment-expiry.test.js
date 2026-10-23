const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const controller = fs.readFileSync(
  path.join(__dirname, "..", "server", "controllers", "orderController.js"),
  "utf8"
);

test("payment deadlines use the same database clock as expiry checks", () => {
  assert.match(controller, /payment_due_at = DATE_ADD\(NOW\(\), INTERVAL \? MINUTE\)/);
  assert.match(controller, /payment_due_at <= NOW\(\)/);
  assert.doesNotMatch(controller, /new Date\(Date\.now\(\) \+ (?:QRIS_PAYMENT_MINUTES|TRANSFER_PAYMENT_HOURS)/);
});
