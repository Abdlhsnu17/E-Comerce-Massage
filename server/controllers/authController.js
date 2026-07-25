const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { signToken } = require("../middleware/auth");
const { TOKEN_COOKIE, COOKIE_OPTIONS } = require("../middleware/session");
const { mergeGuestData } = require("./cartController");

const publicUser = row => ({ id: row.id, name: row.name, email: row.email, phone: row.phone });

/** Menaruh JWT di cookie httpOnly lalu memindahkan data belanja tamu ke akun. */
async function establishSession(req, res, user) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await mergeGuestData(connection, req.sessionToken, user.id);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.cookie(TOKEN_COOKIE, signToken(user), COOKIE_OPTIONS);
}

async function register(req, res, next) {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!name || !email || password.length < 6) {
      return res.status(400).json({ message: "Nama, email, dan password minimal 6 karakter wajib diisi." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ message: "Email sudah terdaftar." });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [name, email, hash, req.body.phone || null]
    );

    const user = { id: result.insertId, name, email, phone: req.body.phone || null };
    await establishSession(req, res, user);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ message: "Email atau password salah." });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: "Email atau password salah." });

    const user = publicUser(rows[0]);
    await establishSession(req, res, user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, name, email, phone FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "Akun tidak ditemukan." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

function logout(_req, res) {
  res.clearCookie(TOKEN_COOKIE, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ message: "Kamu telah keluar dari akun." });
}

module.exports = { register, login, me, logout };
