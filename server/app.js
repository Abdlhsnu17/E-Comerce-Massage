const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const { attachSession } = require("./middleware/session");
const { optionalAuth } = require("./middleware/auth");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(PUBLIC_DIR));

  // Session dan auth opsional dipasang sekali untuk seluruh API.
  app.use("/api", attachSession, optionalAuth, routes);

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Endpoint tidak ditemukan." });
  });

  // Jangan bocorkan detail error internal ke client.
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : "Terjadi kesalahan di server."
    });
  });

  return app;
}

module.exports = { createApp };
