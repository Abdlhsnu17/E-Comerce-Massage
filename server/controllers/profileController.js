const { pool } = require("../config/db");

function profile(row = {}) {
  return {
    childName: row.child_name || "",
    childBirthDate: row.child_birth_date ? String(row.child_birth_date).slice(0, 10) : "",
    allergies: row.allergies || "",
    careNotes: row.care_notes || "",
    defaultAddress: row.default_address || "",
    defaultCity: row.default_city || "",
    defaultZip: row.default_zip || ""
  };
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT * FROM customer_profiles WHERE user_id = ?", [req.user.id]);
    res.json(profile(rows[0]));
  } catch (error) { next(error); }
}

async function updateProfile(req, res, next) {
  try {
    const data = profile({
      child_name: String(req.body.childName || "").trim(),
      child_birth_date: req.body.childBirthDate || null,
      allergies: String(req.body.allergies || "").trim(),
      care_notes: String(req.body.careNotes || "").trim(),
      default_address: String(req.body.defaultAddress || "").trim(),
      default_city: String(req.body.defaultCity || "").trim(),
      default_zip: String(req.body.defaultZip || "").trim()
    });
    if (data.childBirthDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.childBirthDate)) return res.status(400).json({ message: "Tanggal lahir anak tidak valid." });
    await pool.query(
      `INSERT INTO customer_profiles (user_id, child_name, child_birth_date, allergies, care_notes, default_address, default_city, default_zip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE child_name = VALUES(child_name), child_birth_date = VALUES(child_birth_date), allergies = VALUES(allergies), care_notes = VALUES(care_notes), default_address = VALUES(default_address), default_city = VALUES(default_city), default_zip = VALUES(default_zip)`,
      [req.user.id, data.childName || null, data.childBirthDate || null, data.allergies || null, data.careNotes || null, data.defaultAddress || null, data.defaultCity || null, data.defaultZip || null]
    );
    res.json({ ...data, message: "Profil keluarga berhasil disimpan." });
  } catch (error) { next(error); }
}

module.exports = { getProfile, updateProfile };
