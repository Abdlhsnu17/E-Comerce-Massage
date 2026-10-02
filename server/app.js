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
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    });
    if (process.env.NODE_ENV === "production") {
      res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(express.static(PUBLIC_DIR));

  // Probe ini tidak menyentuh database, sesi, maupun autentikasi.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Session dan auth opsional dipasang sekali untuk seluruh API.
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  }, attachSession, optionalAuth, routes);

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
