const express = require("express");
const { register, login, me, logout, changePassword, requestPasswordReset, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/password-reset", requestPasswordReset);
router.post("/password-reset/confirm", resetPassword);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);

module.exports = router;
