require("dotenv").config();

const { createApp } = require("./app");
const { testConnection } = require("./config/db");
const { ensureMassageCatalog } = require("./services/massageCatalogBootstrap");

const PORT = Number(process.env.PORT || 3000);
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

  const server = app.listen(PORT, () =>
    console.log(`✔ Aera Baby Spa berjalan di http://localhost:${PORT} — buka alamat ini di browser, bukan Live Server.`)
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
