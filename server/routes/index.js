const express = require("express");
const { listProducts, getProduct, listCategories } = require("../controllers/productController");
const { register, login, me, logout } = require("../controllers/authController");
const { getCart, addItem, updateItem, removeItem } = require("../controllers/cartController");
const { createOrder, listOrders } = require("../controllers/orderController");
const { listFavorites, toggleFavorite, subscribeNewsletter } = require("../controllers/favoriteController");
const admin = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

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

// Panel admin — setiap rute memverifikasi ulang users.role ke database.
router.get("/admin/stats", requireAdmin, admin.getStats);
router.get("/admin/orders", requireAdmin, admin.listAllOrders);
router.patch("/admin/orders/:id/status", requireAdmin, admin.updateOrderStatus);
router.get("/admin/products", requireAdmin, admin.listAllProducts);
router.post("/admin/products", requireAdmin, admin.createProduct);
router.patch("/admin/products/:id", requireAdmin, admin.updateProduct);
router.delete("/admin/products/:id", requireAdmin, admin.deactivateProduct);
router.get("/admin/users", requireAdmin, admin.listUsers);
router.post("/admin/users", requireAdmin, admin.createUser);
router.patch("/admin/users/:id/role", requireAdmin, admin.updateUserRole);

module.exports = router;
