/**
 * Membuat database LokaMart dari nol: jalankan schema.sql lalu seed.sql.
 * Pemakaian: npm run db:setup
 */
require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

const FILES = ["schema.sql", "seed.sql"];

async function run() {
  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
  };

  console.log(`→ Menghubungi MySQL di ${config.host}:${config.port} sebagai ${config.user}`);
  const connection = await mysql.createConnection(config);

  try {
    for (const file of FILES) {
      const sql = await fs.readFile(path.join(__dirname, file), "utf8");
      await connection.query(sql);
      console.log(`✔ ${file} berhasil dijalankan`);
    }

    const [[{ total }]] = await connection.query(
      `SELECT COUNT(*) AS total FROM ${process.env.DB_NAME || "lokamart_db"}.products`
    );
    console.log(`✔ Database siap dengan ${total} produk.`);
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error("✘ Gagal menyiapkan database:", error.message);
  process.exit(1);
});
