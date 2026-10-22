const nodemailer = require("nodemailer");

function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

function text(value) { return String(value ?? ""); }
function html(value) { return text(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }

async function sendOrderUpdateEmail({ to, recipientName, orderCode, subject, message, details = [] }) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`Order email skipped for ${to}: ${subject}`);
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const lines = details.filter(Boolean).map(item => `• ${text(item)}`);
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text: `Halo ${text(recipientName)},\n\n${message}\n\nKode pesanan: ${text(orderCode)}${lines.length ? `\n${lines.join("\n")}` : ""}\n\nAera Baby Spa`,
    html: `<p>Halo ${html(recipientName)},</p><p>${html(message)}</p><p><strong>Kode pesanan:</strong> ${html(orderCode)}</p>${lines.length ? `<ul>${lines.map(item => `<li>${html(item.slice(2))}</li>`).join("")}</ul>` : ""}<p>Aera Baby Spa</p>`
  });
  return true;
}

function notifyOrderUpdate(payload) {
  if (!payload?.to) return;
  setImmediate(() => sendOrderUpdateEmail(payload).catch(error => console.error("Gagal mengirim email pesanan:", error.message)));
}

module.exports = { mailConfigured, sendOrderUpdateEmail, notifyOrderUpdate, html };
