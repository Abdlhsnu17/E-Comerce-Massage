const express = require("express");
const { register, login, me, logout, changePassword, requestPasswordReset, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const authAttemptLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
const resetLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Terlalu banyak permintaan reset. Coba lagi dalam satu jam." });

router.post("/register", authAttemptLimit, register);
router.post("/login", authAttemptLimit, login);
router.post("/logout", logout);
router.post("/password-reset", resetLimit, requestPasswordReset);
router.post("/password-reset/confirm", resetLimit, resetPassword);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);

module.exports = router;
