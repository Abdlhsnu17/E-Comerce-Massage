require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "database", "migrations");
const LOCK_NAME = "aera_baby_spa_schema_migrations";

function connectionOptions() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sentuhan_kecil_db",
    charset: "utf8mb4_unicode_ci",
    multipleStatements: true
  };
}

async function objectExists(connection, type, name) {
  const source = type === "column" ? "information_schema.COLUMNS" : "information_schema.TABLES";
  const field = type === "column" ? "COLUMN_NAME" : "TABLE_NAME";
  const [rows] = await connection.query(
    `SELECT 1 FROM ${source} WHERE TABLE_SCHEMA = DATABASE() AND ${field} = ? LIMIT 1`,
    [name]
  );
  return rows.length > 0;
}

// Database yang sudah dipakai sebelum migration runner tersedia tidak memiliki
// ledger. Marker dipilih dari perubahan terakhir yang bersifat berurutan.
async function detectLegacyBaseline(connection) {
  const markers = [
    ["016_therapists.sql", "column", "therapist_id"],
    ["015_session_version.sql", "column", "session_version"],
    ["014_admin_audit_logs.sql", "table", "admin_audit_logs"],
    ["013_booking_schedule.sql", "table", "booking_settings"],
    ["012_payment_lifecycle.sql", "column", "payment_due_at"],
    ["011_customer_operations.sql", "table", "customer_profiles"],
    ["010_mandiri_payment_settings.sql", "table", "payment_settings"],
    ["009_dynamic_qris.sql", "column", "payment_gateway"],
    ["008_payment_methods_and_confirmation.sql", "column", "payment_status"],
    ["007_rebrand_aera_baby_spa.sql", "table", "site_content"],
    ["006_service_likes.sql", "table", "service_likes"],
    ["006_password_reset_tokens.sql", "table", "password_reset_tokens"],
    ["005_seed_spa_massage_services.sql", "column", "duration_minutes"],
    ["004_massage_services.sql", "column", "duration_minutes"]
  ];
  for (const [file, type, name] of markers) {
    if (await objectExists(connection, type, name)) return file;
  }
  return null;
}

async function migrationFiles() {
  return (await fs.readdir(MIGRATIONS_DIR))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

async function migrate() {
  const connection = await mysql.createConnection(connectionOptions());
  let locked = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK(?, 60) AS acquired", [LOCK_NAME]);
    if (Number(lock.acquired) !== 1) throw new Error("Tidak dapat memperoleh lock migrasi database.");
    locked = true;

    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(190) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const files = await migrationFiles();
    const [ledger] = await connection.query("SELECT filename, checksum FROM schema_migrations ORDER BY filename");
    const applied = new Map(ledger.map(row => [row.filename, row.checksum]));

    if (applied.size === 0 && await objectExists(connection, "table", "users")) {
      const baseline = await detectLegacyBaseline(connection);
      if (baseline) {
        const end = files.indexOf(baseline);
        for (const file of files.slice(0, end + 1)) {
          const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
          const checksum = crypto.createHash("sha256").update(sql).digest("hex");
          await connection.query("INSERT IGNORE INTO schema_migrations (filename, checksum) VALUES (?, ?)", [file, checksum]);
          applied.set(file, checksum);
        }
        console.log(`✔ Database lama dikenali sampai ${baseline}; baseline dicatat.`);
      }
    }

    let count = 0;
    for (const file of files) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          console.warn(`⚠ ${file} berubah setelah diterapkan; migrasi tidak dijalankan ulang.`);
        }
        continue;
      }
      console.log(`→ Menjalankan ${file}`);
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)", [file, checksum]);
      count += 1;
    }
    console.log(count ? `✔ ${count} migrasi berhasil diterapkan.` : "✔ Database sudah menggunakan schema terbaru.");
  } finally {
    if (locked) await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]).catch(() => {});
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch(error => {
    console.error("✘ Migrasi database gagal:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { detectLegacyBaseline, migrate };
