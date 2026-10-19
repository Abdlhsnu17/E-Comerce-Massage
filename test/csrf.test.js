const test = require("node:test");
const assert = require("node:assert/strict");

const { tokensMatch } = require("../server/middleware/csrf");

test("CSRF comparison accepts only an identical token", () => {
  const token = "a".repeat(64);
  assert.equal(tokensMatch(token, token), true);
  assert.equal(tokensMatch(token, `${"a".repeat(63)}b`), false);
  assert.equal(tokensMatch(token, "short"), false);
  assert.equal(tokensMatch(token, undefined), false);
});
