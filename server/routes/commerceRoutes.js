const express = require("express");
const { getCart, addItem, updateItem, removeItem } = require("../controllers/cartController");
const { createOrder, lookupOrder, getAvailability, requestOrderChange, listOrders, uploadPaymentProof, refreshPayment, midtransNotification } = require("../controllers/orderController");
const { listFavorites, toggleFavorite, subscribeNewsletter } = require("../controllers/favoriteController");
const { requireAuth } = require("../middleware/auth");
const { createReview } = require("../controllers/reviewController");
const { receiveImage } = require("../middleware/upload");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();
const orderLookupLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Terlalu banyak percobaan pengecekan. Coba lagi dalam 15 menit." });
// Cart dan favorites mendukung tamu melalui session cookie.
router.get("/cart", getCart);
router.post("/cart/items", addItem);
router.patch("/cart/items/:productId", updateItem);
router.delete("/cart/items/:productId", removeItem);
router.get("/appointments/availability", getAvailability);
router.get("/orders", listOrders);
router.post("/orders/lookup", orderLookupLimit, lookupOrder);
router.post("/orders", createOrder);
router.post("/orders/:id/change-request", requestOrderChange);
router.post("/orders/:orderId/review", requireAuth, createReview);
router.post("/orders/:id/payment-proof", receiveImage, uploadPaymentProof);
router.post("/orders/:id/payment/refresh", refreshPayment);
router.post("/payments/midtrans/notification", midtransNotification);
router.get("/favorites", listFavorites);
router.post("/favorites/:productId", toggleFavorite);
router.post("/newsletter", subscribeNewsletter);

module.exports = router;
