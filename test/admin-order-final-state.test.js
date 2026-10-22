const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const controller = fs.readFileSync(
  path.join(__dirname, "..", "server", "controllers", "adminController.js"),
  "utf8"
);
const routes = fs.readFileSync(
  path.join(__dirname, "..", "server", "routes", "adminRoutes.js"),
  "utf8"
);
const dashboard = fs.readFileSync(
  path.join(__dirname, "..", "public", "js", "dashboard.js"),
  "utf8"
);

test("cancelled orders are final and all status mutations use the final-state guard", () => {
  assert.match(controller, /order\?\.status === "Dibatalkan"/);
  assert.equal((controller.match(/rejectFinalOrderChange\(req\.params\.id, res\)/g) || []).length, 3);
  assert.match(dashboard, /const isFinal = isCancelled \|\| isCompleted/);
});

test("cancel and permanent delete are separate admin actions", () => {
  assert.match(routes, /router\.post\("\/orders\/:id\/cancel", admin\.cancelOrder\)/);
  assert.match(routes, /router\.delete\("\/orders\/:id", admin\.deleteOrder\)/);
  assert.match(controller, /orders\[0\]\.status !== "Dibatalkan"/);
  assert.match(dashboard, /data-delete-order=/);
});
