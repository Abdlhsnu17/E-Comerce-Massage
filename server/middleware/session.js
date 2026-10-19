const crypto = require("crypto");

const SESSION_COOKIE = "lokamart_sid";
const TOKEN_COOKIE = "lokamart_token";
const CSRF_COOKIE = "lokamart_csrf";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000
};

/**
 * Memberi setiap pengunjung satu session token yang disimpan di cookie
 * httpOnly. Token inilah yang menautkan keranjang dan favorit tamu ke baris
 * di database, sehingga tidak ada data belanja yang disimpan di browser.
 */
function attachSession(req, res, next) {
  let token = req.cookies?.[SESSION_COOKIE];
  if (!token || token.length !== 36) {
    token = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
  }
  req.sessionToken = token;
  let csrfToken = req.cookies?.[CSRF_COOKIE];
  if (!csrfToken || !/^[a-f0-9]{64}$/.test(csrfToken)) {
    csrfToken = crypto.randomBytes(32).toString("hex");
    // Token ini sengaja dapat dibaca JavaScript agar dikirim kembali melalui header.
    // Cookie autentikasi utama tetap HTTP-only.
    res.cookie(CSRF_COOKIE, csrfToken, { ...COOKIE_OPTIONS, httpOnly: false });
  }
  req.csrfToken = csrfToken;
  next();
}

/** Pemilik keranjang/favorit: user yang sudah masuk, atau sesi tamu. */
function owner(req) {
  return req.user
    ? { column: "user_id", value: req.user.id }
    : { column: "session_token", value: req.sessionToken };
}

module.exports = { attachSession, owner, SESSION_COOKIE, TOKEN_COOKIE, CSRF_COOKIE, COOKIE_OPTIONS };
