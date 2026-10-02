const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-only-not-for-production-1234567890";
const { createApp } = require("../server/app");
const { validateEnvironment } = require("../server/config/environment");

test("production refuses incomplete environment", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const previousAppUrl = process.env.APP_URL;
  delete process.env.APP_URL;
  assert.throws(validateEnvironment, /wajib diisi/);
  if (previousAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previousAppUrl;
  process.env.NODE_ENV = previous;
});

test("app exposes a database-free health route", () => {
  const app = createApp();
  assert.equal(typeof app, "function");
  assert.equal(app.get("x-powered-by"), false);
  assert.ok(app._router.stack.some(layer => layer.route?.path === "/health"));
});
