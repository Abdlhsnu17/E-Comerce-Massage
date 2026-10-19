const test = require("node:test");
const assert = require("node:assert/strict");

const { html } = require("../server/services/orderMailer");

test("order email escapes customer-controlled text in HTML", () => {
  assert.equal(html('<img src=x onerror=alert(1)>'), "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(html(`O'Brian & Co.`), "O&#039;Brian &amp; Co.");
});
