const express = require("express");
const { getCart, addItem, updateItem, removeItem } = require("../controllers/cartController");
const { createOrder, getAvailability, requestOrderChange, listOrders, uploadPaymentProof, refreshPayment, midtransNotification } = require("../controllers/orderController");
const { listFavorites, toggleFavorite, subscribeNewsletter } = require("../controllers/favoriteController");
const { requireAuth } = require("../middleware/auth");
const { createReview } = require("../controllers/reviewController");
const { receiveImage } = require("../middleware/imageUpload");

const router = express.Router();
// Cart dan favorites mendukung tamu melalui session cookie.
router.get("/cart", getCart);
router.post("/cart/items", addItem);
router.patch("/cart/items/:productId", updateItem);
router.delete("/cart/items/:productId", removeItem);
router.get("/appointments/availability", getAvailability);
router.get("/orders", requireAuth, listOrders);
router.post("/orders", requireAuth, createOrder);
router.post("/orders/:id/change-request", requireAuth, requestOrderChange);
router.post("/orders/:orderId/review", requireAuth, createReview);
router.post("/orders/:id/payment-proof", requireAuth, receiveImage, uploadPaymentProof);
router.post("/orders/:id/payment/refresh", requireAuth, refreshPayment);
router.post("/payments/midtrans/notification", midtransNotification);
router.get("/favorites", listFavorites);
router.post("/favorites/:productId", toggleFavorite);
router.post("/newsletter", subscribeNewsletter);

module.exports = router;
