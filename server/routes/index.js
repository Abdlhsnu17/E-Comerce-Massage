const express = require("express");
const { listProducts, getProduct, listCategories } = require("../controllers/productController");
const { register, login, me, logout } = require("../controllers/authController");
const { getCart, addItem, updateItem, removeItem } = require("../controllers/cartController");
const { createOrder, listOrders } = require("../controllers/orderController");
const { listFavorites, toggleFavorite, subscribeNewsletter } = require("../controllers/favoriteController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.get("/products", listProducts);
router.get("/products/:id", getProduct);
router.get("/categories", listCategories);

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", requireAuth, me);

// Keranjang tersedia untuk tamu maupun user; pemiliknya ditentukan
// oleh cookie sesi atau akun yang sedang masuk.
router.get("/cart", getCart);
router.post("/cart/items", addItem);
router.patch("/cart/items/:productId", updateItem);
router.delete("/cart/items/:productId", removeItem);

router.get("/orders", requireAuth, listOrders);
router.post("/orders", requireAuth, createOrder);

router.get("/favorites", listFavorites);
router.post("/favorites/:productId", toggleFavorite);

router.post("/newsletter", subscribeNewsletter);

module.exports = router;
