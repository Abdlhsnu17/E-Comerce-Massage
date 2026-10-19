const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { validFutureAppointment } = require("../server/controllers/adminController");

test("reschedule only accepts a real future appointment", () => {
  const now = new Date(2026, 9, 20, 10, 0);
  assert.equal(validFutureAppointment("2026-10-20", "10:30", now), true);
  assert.equal(validFutureAppointment("2026-10-20", "09:30", now), false);
  assert.equal(validFutureAppointment("2026-02-30", "10:30", now), false);
  assert.equal(validFutureAppointment("not-a-date", "10:30", now), false);
});

test("fresh database schema contains customer operations tables", () => {
  const schema = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
  for (const table of ["customer_profiles", "coupons", "service_reviews", "order_change_requests"]) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table}\\s*\\(`));
  }
  assert.match(schema, /discount_code\s+VARCHAR\(40\)/);
  assert.match(schema, /discount_amount\s+DECIMAL\(12, 2\)/);
});
