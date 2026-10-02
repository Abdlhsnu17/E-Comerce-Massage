const { pool } = require("../config/db");

const KINDS = ["Berita", "Pengumuman"];

function readPayload(body) {
  const title = String(body.title || "").trim();
  const kind = String(body.kind || "");
  const content = String(body.content || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  const image = String(body.image || "").trim();
  const isPublished = body.isPublished === true || body.isPublished === 1 || body.isPublished === "true";

  if (!title || title.length > 180 || !content || !KINDS.includes(kind)) return null;
  if (excerpt.length > 255 || image.length > 255) return null;
  return { title, kind, content, excerpt: excerpt || null, image: image || null, isPublished };
}

async function listPublished(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, kind, title, excerpt, content, image, published_at AS publishedAt
         FROM announcements
        WHERE is_published = 1
        ORDER BY COALESCE(published_at, created_at) DESC, id DESC
        LIMIT 12`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function listAll(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, kind, title, excerpt, content, image,
              is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt
         FROM announcements
        ORDER BY created_at DESC, id DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const payload = readPayload(req.body);
    if (!payload) return res.status(400).json({ message: "Judul, jenis, isi, atau panjang data tidak valid." });

    const [result] = await pool.query(
      `INSERT INTO announcements (kind, title, excerpt, content, image, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, IF(?, CURRENT_TIMESTAMP, NULL))`,
      [payload.kind, payload.title, payload.excerpt, payload.content, payload.image,
        payload.isPublished ? 1 : 0, payload.isPublished ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, message: "Berita/pengumuman berhasil dibuat." });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const payload = readPayload(req.body);
    if (!payload) return res.status(400).json({ message: "Judul, jenis, isi, atau panjang data tidak valid." });

    const [result] = await pool.query(
      `UPDATE announcements
          SET kind = ?, title = ?, excerpt = ?, content = ?, image = ?, is_published = ?,
              published_at = IF(?, COALESCE(published_at, CURRENT_TIMESTAMP), NULL)
        WHERE id = ?`,
      [payload.kind, payload.title, payload.excerpt, payload.content, payload.image,
        payload.isPublished ? 1 : 0, payload.isPublished ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) {
      const [rows] = await pool.query("SELECT id FROM announcements WHERE id = ?", [req.params.id]);
      if (!rows.length) return res.status(404).json({ message: "Berita/pengumuman tidak ditemukan." });
    }
    res.json({ id: Number(req.params.id), message: "Berita/pengumuman diperbarui." });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Berita/pengumuman tidak ditemukan." });
    res.json({ id: Number(req.params.id), message: "Berita/pengumuman dihapus." });
  } catch (error) {
    next(error);
  }
}

module.exports = { listPublished, listAll, create, update, remove };