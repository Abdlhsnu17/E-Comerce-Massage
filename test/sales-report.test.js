const test = require("node:test");
const assert = require("node:assert/strict");

const { reportPeriod } = require("../server/controllers/adminController");

test("accepts an ordered ISO date range for sales reports", () => {
  assert.deepEqual(reportPeriod({ from: "2026-10-01", to: "2026-10-20" }), { from: "2026-10-01", to: "2026-10-20" });
});

test("rejects malformed and inverted sales report ranges", () => {
  assert.equal(reportPeriod({ from: "2026-10-21", to: "2026-10-20" }), null);
  assert.equal(reportPeriod({ from: "20-10-2026", to: "2026-10-20" }), null);
});
