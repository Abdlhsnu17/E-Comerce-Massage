// Nilai bersama UI dipisahkan dari alur bisnis agar mudah diubah dan diuji.
const SHIPPING_COST = Object.freeze({ regular: 20000, express: 35000 });
const ADMIN_ORDER_STATUSES = Object.freeze([
  "Sedang diproses",
  "Dikirim",
  "Selesai",
  "Dibatalkan"
]);

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const formatPrice = value => rupiah.format(Number(value) || 0);
const byId = id => document.getElementById(id);
