require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const { testConnection } = require("./config/db");
const { attachSession } = require("./middleware/session");
const { optionalAuth } = require("./middleware/auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Tanpa CORS: frontend dilayani dari origin yang sama, sehingga cookie sesi
// httpOnly tidak pernah dikirim ke domain lain.
app.use(express.json());
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

app.use("/api", attachSession, optionalAuth, routes);

app.use("/api", (_req, res) => res.status(404).json({ message: "Endpoint tidak ditemukan." }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Terjadi kesalahan di server." });
});

async function start() {
  try {
    await testConnection();
    console.log(`✔ Terhubung ke database ${process.env.DB_NAME || "lokamart_db"} di ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}`);
  } catch (error) {
    console.error("✘ Gagal terhubung ke database:", error.message);
    console.error("  Pastikan MySQL/MariaDB berjalan di port 3306 dan jalankan: npm run db:setup");
    process.exit(1);
  }

  const server = app.listen(PORT, () =>
    console.log(`✔ LokaMart berjalan di http://localhost:${PORT} — buka alamat ini di browser, bukan Live Server.`)
  );

  server.on("error", error => {
    if (error.code === "EADDRINUSE") {
      console.error(`✘ Port ${PORT} sudah dipakai proses lain.`);
      console.error(`  Hentikan dulu: lsof -ti tcp:${PORT} | xargs kill`);
      console.error(`  Atau jalankan di port lain: PORT=3001 npm start`);
      process.exit(1);
    }
    throw error;
  });
}

start();
