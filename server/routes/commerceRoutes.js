const express = require("express");
const { getCart, addItem, updateItem, removeItem } = require("../controllers/cartController");
const { createOrder, listOrders } = require("../controllers/orderController");
const { listFavorites, toggleFavorite, subscribeNewsletter } = require("../controllers/favoriteController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
// Cart dan favorites mendukung tamu melalui session cookie.
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
