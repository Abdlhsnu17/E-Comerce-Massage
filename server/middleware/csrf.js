const crypto = require("crypto");
const { CSRF_COOKIE } = require("./session");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/payments/midtrans/notification"]);

function tokensMatch(expected, received) {
  if (typeof expected !== "string" || typeof received !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();
  if (!tokensMatch(req.cookies?.[CSRF_COOKIE], req.get("X-CSRF-Token"))) {
    return res.status(403).json({ message: "Token keamanan tidak valid. Muat ulang halaman lalu coba lagi." });
  }
  next();
}

module.exports = { verifyCsrf, tokensMatch };
