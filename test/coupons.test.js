const test = require("node:test");
const assert = require("node:assert/strict");

const { couponPayload } = require("../server/controllers/adminController");

test("normalizes and validates a percentage coupon", () => {
  const coupon = couponPayload({
    code: " hemat-20 ",
    discountType: "percent",
    discountValue: 20,
    minimumOrder: 100000,
    usageLimit: 50,
    startsAt: "2026-10-20T09:00",
    endsAt: "2026-10-31T18:00",
    isActive: true
  });
  assert.equal(coupon.code, "HEMAT-20");
  assert.deepEqual(coupon.errors, []);
  assert.equal(coupon.usageLimit, 50);
});

test("rejects unsafe coupon values and invalid periods", () => {
  assert.ok(couponPayload({ code: "x", discountType: "percent", discountValue: 101 }).errors.length > 0);
  assert.ok(couponPayload({ code: "HEMAT", discountType: "fixed", discountValue: -1 }).errors.length > 0);
  assert.ok(couponPayload({ code: "HEMAT", discountType: "fixed", discountValue: 1000, startsAt: "2026-10-31T10:00", endsAt: "2026-10-20T10:00" }).errors.length > 0);
});
