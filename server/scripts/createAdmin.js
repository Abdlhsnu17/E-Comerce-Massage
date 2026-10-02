require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

async function createAdmin() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  const name = (process.env.BOOTSTRAP_ADMIN_NAME || "Administrator Sentuhan Kecil").trim();

  if (!email || password.length < 12 || !name) {
    throw new Error("Isi BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, dan BOOTSTRAP_ADMIN_PASSWORD minimal 12 karakter di .env.");
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) throw new Error("Email tersebut sudah ada; perintah bootstrap tidak mengubah akun yang ada.");

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    [name, email, passwordHash]
  );
  console.log(`Admin ${email} berhasil dibuat.`);
}

createAdmin()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
