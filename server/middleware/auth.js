const jwt = require("jsonwebtoken");
const { TOKEN_COOKIE } = require("./session");

const SECRET = process.env.JWT_SECRET || "lokamart-dev-secret";

// Kunci lemah membuat cookie sesi bisa dipalsukan siapa pun yang tahu isinya.
if (SECRET.length < 32) {
  const pesan = "JWT_SECRET terlalu pendek. Isi dengan string acak minimal 32 karakter di .env.";
  if (process.env.NODE_ENV === "production") throw new Error(pesan);
  console.warn(`⚠ ${pesan}`);
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

/**
 * Token dibaca dari cookie httpOnly (dipakai browser) dan header Authorization
 * (memudahkan pengujian lewat curl). Tidak ada token yang disimpan di browser
 * secara terbaca oleh JavaScript.
 */
function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[TOKEN_COOKIE] || null;
}

/** Mengisi req.user bila token valid, tetapi tetap melanjutkan bila tidak ada. */
function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch {
      /* token kedaluwarsa: perlakukan sebagai pengunjung tamu */
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Silakan masuk terlebih dahulu." });
  next();
}

module.exports = { signToken, optionalAuth, requireAuth, SECRET };
