require("dotenv").config();

const { validateEnvironment } = require("./config/environment");
const { createApp } = require("./app");
const { pool, testConnection } = require("./config/db");
const { ensureMassageCatalog } = require("./services/massageCatalogBootstrap");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
validateEnvironment();
const app = createApp();

async function start() {
  try {
    await testConnection();
    await ensureMassageCatalog();
    console.log(`✔ Terhubung ke database ${process.env.DB_NAME || "sentuhan_kecil_db"} di ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}`);
    console.log("✔ Katalog dummy spa & massage siap.");
  } catch (error) {
    console.error("✘ Gagal terhubung ke database:", error.message);
    console.error("  Pastikan MySQL/MariaDB berjalan di port 3306 dan impor database/schema.sql terlebih dahulu.");
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () =>
    console.log(`✔ Aera Baby Spa mendengarkan di ${HOST}:${PORT}`)
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

  let shuttingDown = false;
  const shutdown = signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Menerima ${signal}; menghentikan server dengan aman.`);
    server.close(async error => {
      try { await pool.end(); } catch (dbError) { console.error("Gagal menutup pool database:", dbError); }
      process.exitCode = error ? 1 : 0;
      if (error) console.error(error);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

start();
