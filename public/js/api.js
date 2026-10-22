const api = {
  orderTokens() {
    try { return JSON.parse(localStorage.getItem("aera_order_tokens") || "{}"); }
    catch { return {}; }
  },
  rememberOrder(order) {
    if (!order?.id || !order?.accessToken) return;
    const tokens = api.orderTokens();
    tokens[String(order.id)] = order.accessToken;
    localStorage.setItem("aera_order_tokens", JSON.stringify(tokens));
  },
  orderHeaders(orderId) {
    const token = api.orderTokens()[String(orderId)];
    return token ? { "X-Order-Token": token } : {};
  },
  csrfToken() {
    return document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("lokamart_csrf="))?.slice("lokamart_csrf=".length) || "";
  },
  async request(path, options = {}) {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase());
    const headers = { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(unsafe ? { "X-CSRF-Token": api.csrfToken() } : {}), ...(options.headers || {}) };
    const response = await fetch(`/api${path}`, { credentials: "include", ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Permintaan gagal.");
    return data;
  },
  products: () => api.request("/products"),
  likeProduct: productId => api.request(`/products/${productId}/like`, { method: "POST" }),
  categories: () => api.request("/categories"),
  announcements: () => api.request("/announcements"),
  siteContent: () => api.request("/site-content"),
  coupons: () => api.request("/coupons"),
  cart: () => api.request("/cart"),
  // Nama metode mengikuti pemanggil UI agar aksi keranjang benar-benar
  // diteruskan ke endpoint REST yang sama.
  addToCart: (productId, qty = 1) => api.request("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId: Number(productId), qty })
  }),
  setCartQty: (productId, qty) => api.request(`/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ qty })
  }),
  removeFromCart: productId => api.request(`/cart/items/${productId}`, { method: "DELETE" }),
  login: body => api.request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: body => api.request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => api.request("/auth/me"),
  changePassword: body => api.request("/auth/password", { method: "PATCH", body: JSON.stringify(body) }),
  requestPasswordReset: body => api.request("/auth/password-reset", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: body => api.request("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify(body) }),
  profile: () => api.request("/auth/profile"),
  updateProfile: body => api.request("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),
  logout: () => api.request("/auth/logout", { method: "POST" }),
  orders: () => api.request("/orders", { headers: { "X-Order-Tokens": Object.values(api.orderTokens()).join(",") } }),
  appointmentAvailability: (date, durationMinutes = 60) => api.request(`/appointments/availability?date=${encodeURIComponent(date)}&durationMinutes=${encodeURIComponent(durationMinutes)}`),
  createOrder: body => api.request("/orders", { method: "POST", body: JSON.stringify(body) }),
  lookupOrder: body => api.request("/orders/lookup", { method: "POST", body: JSON.stringify(body) }),
  requestOrderChange: (orderId, body) => api.request(`/orders/${orderId}/change-request`, { method: "POST", headers: api.orderHeaders(orderId), body: JSON.stringify(body) }),
  createReview: (orderId, body) => api.request(`/orders/${orderId}/review`, { method: "POST", body: JSON.stringify(body) }),
  uploadPaymentProof: (orderId, file) => { const body = new FormData(); body.append("image", file); return api.request(`/orders/${orderId}/payment-proof`, { method: "POST", headers: api.orderHeaders(orderId), body }); },
  refreshPayment: orderId => api.request(`/orders/${orderId}/payment/refresh`, { method: "POST", headers: api.orderHeaders(orderId) }),
  admin: {
    stats: () => api.request("/admin/stats"),
    orders: () => api.request("/admin/orders"),
    products: () => api.request("/admin/products"),
    createProduct: body => api.request("/admin/products", { method: "POST", body: JSON.stringify(body) }),
    updateProduct: (id, body) => api.request(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteProduct: id => api.request(`/admin/products/${id}`, { method: "DELETE" }),
    categories: () => api.request("/admin/categories"),
    createCategory: body => api.request("/admin/categories", { method: "POST", body: JSON.stringify(body) }),
    updateCategory: (id, body) => api.request(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteCategory: id => api.request(`/admin/categories/${id}`, { method: "DELETE" }),
    uploadImage: file => { const body = new FormData(); body.append("image", file); return api.request("/admin/uploads/images", { method: "POST", body }); },
    setOrderStatus: (id, status) => api.request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setPaymentStatus: (id, status) => api.request(`/admin/orders/${id}/payment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setAppointmentStatus: (id, status) => api.request(`/admin/orders/${id}/appointment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,cancelOrder: id => api.request(`/admin/orders/${id}/cancel`, { method: "POST" })
    ,deleteOrder: id => api.request(`/admin/orders/${id}`, { method: "DELETE" })
    ,orderChangeRequests: () => api.request("/admin/order-change-requests")
    ,reviewOrderChangeRequest: (id, body) => api.request(`/admin/order-change-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,announcements: () => api.request("/admin/announcements")
    ,createAnnouncement: body => api.request("/admin/announcements", { method: "POST", body: JSON.stringify(body) })
    ,updateAnnouncement: (id, body) => api.request(`/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,deleteAnnouncement: id => api.request(`/admin/announcements/${id}`, { method: "DELETE" })
    ,siteContent: () => api.request("/admin/site-content")
    ,updateSiteContent: body => api.request("/admin/site-content", { method: "PATCH", body: JSON.stringify(body) })
    ,users: () => api.request("/admin/users")
    ,createUser: body => api.request("/admin/users", { method: "POST", body: JSON.stringify(body) })
    ,updateUser: (id, body) => api.request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,updateUserRole: (id, role) => api.request(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) })
    ,updateUserPassword: (id, password) => api.request(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) })
    ,deleteUser: id => api.request(`/admin/users/${id}/delete`, { method: "POST" })
    ,reviews: () => api.request("/admin/reviews")
    ,moderateReview: (id, isPublished) => api.request(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ isPublished }) })
    ,coupons: () => api.request("/admin/coupons")
    ,createCoupon: body => api.request("/admin/coupons", { method: "POST", body: JSON.stringify(body) })
    ,updateCoupon: (id, body) => api.request(`/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,deleteCoupon: id => api.request(`/admin/coupons/${id}`, { method: "DELETE" })
    ,scheduleSettings: () => api.request("/admin/schedule-settings")
    ,updateScheduleSettings: body => api.request("/admin/schedule-settings", { method: "PATCH", body: JSON.stringify(body) })
    ,therapists: () => api.request("/admin/therapists")
    ,createTherapist: body => api.request("/admin/therapists", { method: "POST", body: JSON.stringify(body) })
    ,updateTherapist: (id, body) => api.request(`/admin/therapists/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,deleteTherapist: id => api.request(`/admin/therapists/${id}`, { method: "DELETE" })
    ,newsletterSubscribers: (q = "", page = 1, limit = 50) => api.request(`/admin/newsletter-subscribers?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`)
    ,removeNewsletterSubscriber: id => api.request(`/admin/newsletter-subscribers/${id}`, { method: "DELETE" })
    ,salesReport: (from, to) => api.request(`/admin/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    ,auditLogs: (page = 1) => api.request(`/admin/audit-logs?page=${page}`)
  }
};
