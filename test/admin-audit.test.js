const test = require("node:test");
const assert = require("node:assert/strict");

const { safeMetadata } = require("../server/middleware/adminAudit");

test("admin audit metadata never retains password values", () => {
  assert.deepEqual(
    safeMetadata({ status: "Dibayar", password: "secret", currentPassword: "old", newPassword: "new", confirmPassword: "new" }),
    { status: "Dibayar" }
  );
});

test("admin audit metadata is absent for an empty request body", () => {
  assert.equal(safeMetadata({}), null);
});
