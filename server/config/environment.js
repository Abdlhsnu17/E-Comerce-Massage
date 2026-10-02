function requireProductionValue(name) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} wajib diisi saat NODE_ENV=production.`);
  }
}

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  [
    "DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET", "APP_URL",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"
  ].forEach(requireProductionValue);

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET harus berupa string acak minimal 32 karakter.");
  }

  try {
    const url = new URL(process.env.APP_URL);
    if (url.protocol !== "https:") throw new Error("APP_URL harus memakai HTTPS saat production.");
  } catch (error) {
    if (error.message.startsWith("APP_URL harus")) throw error;
    throw new Error("APP_URL harus URL HTTPS yang valid, misalnya https://contoh.com.");
  }
}

module.exports = { validateEnvironment };
