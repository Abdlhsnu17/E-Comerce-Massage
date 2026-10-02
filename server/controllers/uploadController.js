async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ message: "Pilih gambar terlebih dahulu." });
  res.status(201).json({ image: `/uploads/${req.file.filename}` });
}

module.exports = { uploadImage };