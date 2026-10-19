const api = {
  async request(path, options = {}) {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
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
  orders: () => api.request("/orders"),
  appointmentAvailability: date => api.request(`/appointments/availability?date=${encodeURIComponent(date)}`),
  createOrder: body => api.request("/orders", { method: "POST", body: JSON.stringify(body) }),
  requestOrderChange: (orderId, body) => api.request(`/orders/${orderId}/change-request`, { method: "POST", body: JSON.stringify(body) }),
  createReview: (orderId, body) => api.request(`/orders/${orderId}/review`, { method: "POST", body: JSON.stringify(body) }),
  uploadPaymentProof: (orderId, file) => { const body = new FormData(); body.append("image", file); return api.request(`/orders/${orderId}/payment-proof`, { method: "POST", body }); },
  refreshPayment: orderId => api.request(`/orders/${orderId}/payment/refresh`, { method: "POST" }),
  admin: {
    stats: () => api.request("/admin/stats"),
    orders: () => api.request("/admin/orders"),
    products: () => api.request("/admin/products"),
    createProduct: body => api.request("/admin/products", { method: "POST", body: JSON.stringify(body) }),
    updateProduct: (id, body) => api.request(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteProduct: id => api.request(`/admin/products/${id}`, { method: "DELETE" }),
    uploadImage: file => { const body = new FormData(); body.append("image", file); return api.request("/admin/uploads/images", { method: "POST", body }); },
    setOrderStatus: (id, status) => api.request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setPaymentStatus: (id, status) => api.request(`/admin/orders/${id}/payment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setAppointmentStatus: (id, status) => api.request(`/admin/orders/${id}/appointment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,cancelOrder: id => api.request(`/admin/orders/${id}`, { method: "DELETE" })
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
    ,deleteUser: id => api.request(`/admin/users/${id}`, { method: "DELETE" })
    ,reviews: () => api.request("/admin/reviews")
    ,moderateReview: (id, isPublished) => api.request(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ isPublished }) })
  }
};
