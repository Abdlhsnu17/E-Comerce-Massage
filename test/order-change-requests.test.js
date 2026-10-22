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

test("fresh database schema contains every migration through 017", () => {
  const schema = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
  for (const table of [
    "schema_migrations",
    "password_reset_tokens",
    "service_likes",
    "payment_settings",
    "customer_profiles",
    "coupons",
    "service_reviews",
    "order_change_requests",
    "booking_settings",
    "admin_audit_logs",
    "therapists"
  ]) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table}\\s*\\(`));
  }

  assert.match(schema, /duration_minutes\s+SMALLINT UNSIGNED/);
  assert.match(schema, /payment_status\s+ENUM\([\s\S]*?'Menunggu verifikasi'[\s\S]*?'Dikembalikan'/);
  assert.match(schema, /payment_due_at\s+DATETIME/);
  assert.match(schema, /payment_proof_url\s+VARCHAR\(500\)/);
  assert.match(schema, /discount_code\s+VARCHAR\(40\)/);
  assert.match(schema, /discount_amount\s+DECIMAL\(12, 2\)/);
  assert.match(schema, /service_duration_minutes\s+SMALLINT UNSIGNED/);
  assert.match(schema, /session_version\s+INT UNSIGNED/);
  assert.match(schema, /therapist_id\s+INT UNSIGNED/);
  assert.match(schema, /CONSTRAINT fk_orders_therapist FOREIGN KEY \(therapist_id\)/);
  assert.match(schema, /guest_access_token_hash\s+CHAR\(64\) NULL/);
  assert.match(schema, /recipient_email\s+VARCHAR\(160\)\s+NULL/);
  assert.match(schema, /user_id\s+INT UNSIGNED\s+NULL,[\s\S]*?guest_access_token_hash/);
});
