const { pool } = require("../config/db");

const EMPTY_CONTENT = { servicesTitle: "Waktu istimewa untuk si kecil dan keluarga.", servicesIntro: "", aboutLabel: "Tentang Sentuhan Kecil", aboutTitle: "Ruang yang mengutamakan rasa nyaman.", aboutText: "", aboutImage: "" };

async function getContent(_req, res, next) {
  try {
    const [rows] = await pool.query("SELECT services_title AS servicesTitle, services_intro AS servicesIntro, about_label AS aboutLabel, about_title AS aboutTitle, about_text AS aboutText, about_image AS aboutImage FROM site_content WHERE id = 1");
    res.json({ ...EMPTY_CONTENT, ...(rows[0] || {}) });
  } catch (error) { next(error); }
}

async function updateContent(req, res, next) {
  try {
    const body = req.body || {};
    const values = [body.servicesTitle, body.servicesIntro || "", body.aboutLabel, body.aboutTitle, body.aboutText, body.aboutImage || null];
    if (!values[0] || !values[2] || !values[3] || !values[4]) return res.status(400).json({ message: "Konten layanan dan tentang kami wajib diisi." });
    await pool.query(`INSERT INTO site_content (id, services_title, services_intro, about_label, about_title, about_text, about_image) VALUES (1, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE services_title=VALUES(services_title), services_intro=VALUES(services_intro), about_label=VALUES(about_label), about_title=VALUES(about_title), about_text=VALUES(about_text), about_image=VALUES(about_image)`, values);
    res.json({ message: "Konten halaman berhasil diperbarui." });
  } catch (error) { next(error); }
}

module.exports = { getContent, updateContent };
