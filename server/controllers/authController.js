const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { signToken } = require("../middleware/auth");
const { TOKEN_COOKIE, COOKIE_OPTIONS } = require("../middleware/session");
const { mergeGuestData } = require("./cartController");

const publicUser = row => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role || "user"
});

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

    // Pendaftaran mandiri selalu berperan 'user'; role tidak pernah diambil
    // dari req.body agar tidak ada yang bisa mendaftar sebagai admin.
    const user = { id: result.insertId, name, email, phone: req.body.phone || null, role: "user" };
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

    const userRow = rows[0];
    if (!await bcrypt.compare(password, userRow.password_hash)) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const user = publicUser(userRow);
    await establishSession(req, res, user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== "string" || newPassword.length < 12) {
      return res.status(400).json({ message: "Password baru minimal 12 karakter." });
    }
    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length || !await bcrypt.compare(currentPassword || "", rows[0].password_hash)) {
      return res.status(400).json({ message: "Password saat ini tidak cocok." });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, req.user.id]);
    res.json({ message: "Password berhasil diperbarui." });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, name, email, phone, role FROM users WHERE id = ?", [req.user.id]);
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

module.exports = { register, login, me, logout, changePassword };
