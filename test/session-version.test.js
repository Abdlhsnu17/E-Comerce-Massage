const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-session-version-secret-1234567890";
const { signToken, SECRET } = require("../server/middleware/auth");

test("signed session token carries the account session version", () => {
  const token = signToken({ id: 7, email: "user@example.com", name: "User", role: "user", sessionVersion: 3 });
  assert.equal(jwt.verify(token, SECRET).sv, 3);
});
