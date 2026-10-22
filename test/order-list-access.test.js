const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-order-list-access-secret-123456789";

const { SECRET } = require("../server/middleware/auth");
const { orderAccess, listOrderAccess } = require("../server/controllers/orderController");

function request({ user, tokens = "" } = {}) {
  return {
    user,
    get(name) { return name === "X-Order-Tokens" ? tokens : ""; }
  };
}

test("logged-in customer can list account orders and a recovered guest order", () => {
  const recoveryToken = jwt.sign({ orderId: 42, purpose: "guest-order" }, SECRET, { expiresIn: "1h" });
  const access = listOrderAccess(request({ user: { id: 7 }, tokens: recoveryToken }));

  assert.match(access.whereClause, /user_id = \?/);
  assert.match(access.whereClause, /id IN \(\?\)/);
  assert.deepEqual(access.values, [7, 42]);
});

test("invalid recovery tokens do not grant guest-order access", () => {
  const access = listOrderAccess(request({ user: { id: 7 }, tokens: "invalid-token" }));

  assert.equal(access.whereClause, "(user_id = ?)");
  assert.deepEqual(access.values, [7]);
});

test("anonymous customer without valid order tokens has no order access", () => {
  assert.equal(listOrderAccess(request()), null);
});

test("logged-in customer can act on a recovered guest order", () => {
  const recoveryToken = jwt.sign({ orderId: 42, purpose: "guest-order" }, SECRET, { expiresIn: "1h" });
  const req = request({ user: { id: 7 } });
  req.get = name => name === "X-Order-Token" ? recoveryToken : "";

  const access = orderAccess(req);
  assert.equal(access.clause, "(user_id = ? OR id = ?)");
  assert.deepEqual(access.values, [7, 42]);
});
