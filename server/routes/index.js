const express = require("express");
const publicRoutes = require("./publicRoutes");
const authRoutes = require("./authRoutes");
const commerceRoutes = require("./commerceRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

router.use(publicRoutes);
router.use("/auth", authRoutes);
router.use(commerceRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
