const express = require("express");
const { listProducts, getProduct, listCategories, toggleServiceLike } = require("../controllers/productController");
const announcements = require("../controllers/announcementController");
const { getContent } = require("../controllers/siteContentController");

const router = express.Router();
router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.post("/products/:id/like", toggleServiceLike);
router.get("/categories", listCategories);
router.get("/announcements", announcements.listPublished);
router.get("/site-content", getContent);

module.exports = router;
