const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.resolve(__dirname, "../../public/uploads");
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true, mode: 0o750 });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error("Format gambar harus JPEG, PNG, atau WEBP.");
      error.status = 415;
      return callback(error);
    }
    callback(null, true);
  }
});

function hasValidSignature(buffer, mimetype) {
  if (mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }
  if (mimetype === "image/webp") {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

async function persistImage(file) {
  const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype);

  // Nama sepenuhnya dibuat server; nama asli dari client tidak pernah menjadi path.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const filename = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${extension}`;
    const filepath = path.join(UPLOAD_DIRECTORY, filename);
    try {
      await fs.promises.writeFile(filepath, file.buffer, { flag: "wx", mode: 0o640 });
      return { filename, filepath };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }

  throw new Error("Gagal membuat nama file upload yang unik.");
}

function receiveImage(req, res, next) {
  upload.single("image")(req, res, async error => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : (error.status || 400);
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Ukuran gambar terlalu besar. Maksimal 5 MB."
        : error.message;
      return res.status(status).json({ message });
    }
    if (!req.file) return res.status(400).json({ message: "File gambar wajib disertakan." });
    if (!hasValidSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(415).json({ message: "Isi file tidak sesuai dengan format gambar yang diizinkan." });
    }

    try {
      const { filename, filepath } = await persistImage(req.file);
      req.file.filename = filename;
      req.file.path = filepath;
      delete req.file.buffer;
      return next();
    } catch (writeError) {
      return next(writeError);
    }
  });
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  UPLOAD_DIRECTORY,
  receiveImage
};
