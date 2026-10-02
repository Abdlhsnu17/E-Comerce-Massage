const nodemailer = require("nodemailer");

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Password reset link for ${to}: ${resetUrl}`);
      return;
    }
    throw Object.assign(new Error("Layanan email belum dikonfigurasi."), { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Atur ulang password akun Aera Baby Spa",
    text: `Kami menerima permintaan untuk mengatur ulang password Anda. Buka tautan ini dalam 30 menit: ${resetUrl}\n\nJika bukan Anda, abaikan email ini.`,
    html: `<p>Kami menerima permintaan untuk mengatur ulang password Anda.</p><p><a href="${resetUrl}">Atur ulang password</a></p><p>Tautan berlaku selama 30 menit. Jika bukan Anda, abaikan email ini.</p>`
  });
}

module.exports = { sendPasswordResetEmail };
