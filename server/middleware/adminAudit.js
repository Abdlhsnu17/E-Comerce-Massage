const { pool } = require("../config/db");

function safeMetadata(body) {
  if (!body || typeof body !== "object") return null;
  const hidden = new Set(["password", "currentPassword", "newPassword", "confirmPassword"]);
  const metadata = Object.fromEntries(Object.entries(body)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 500) : value]));
  return Object.keys(metadata).length ? metadata : null;
}

function auditAdminMutation(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const action = `${req.method} ${req.baseUrl}${req.path}`;
  const targetId = Number(req.params.id || req.params.orderId) || null;
  const targetType = req.path.split("/").filter(Boolean)[0] || "admin";
  const metadata = safeMetadata(req.body);
  res.once("finish", () => {
    if (res.statusCode >= 400 || !req.user?.id) return;
    pool.query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, target_type, target_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, action.slice(0, 160), targetType.slice(0, 60), targetId, metadata ? JSON.stringify(metadata) : null, String(req.ip || "").slice(0, 64)]
    ).catch(() => {});
  });
  next();
}

module.exports = { auditAdminMutation, safeMetadata };
