const express = require("express");
const { register, login, me, logout, changePassword, requestPasswordReset, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { getProfile, updateProfile } = require("../controllers/profileController");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const loginAttemptLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit." });
const registrationLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam satu jam." });
const resetLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Terlalu banyak permintaan reset. Coba lagi dalam satu jam." });

router.post("/register", registrationLimit, register);
router.post("/login", loginAttemptLimit, login);
router.post("/logout", logout);
router.post("/password-reset", resetLimit, requestPasswordReset);
router.post("/password-reset/confirm", resetLimit, resetPassword);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);
router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);

module.exports = router;
