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
  logout: () => api.request("/auth/logout", { method: "POST" }),
  createOrder: body => api.request("/orders", { method: "POST", body: JSON.stringify(body) }),
  admin: {
    stats: () => api.request("/admin/stats"),
    orders: () => api.request("/admin/orders"),
    products: () => api.request("/admin/products"),
    createProduct: body => api.request("/admin/products", { method: "POST", body: JSON.stringify(body) }),
    updateProduct: (id, body) => api.request(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deactivateProduct: id => api.request(`/admin/products/${id}`, { method: "DELETE" }),
    uploadImage: file => { const body = new FormData(); body.append("image", file); return api.request("/admin/uploads/images", { method: "POST", body }); },
    setOrderStatus: (id, status) => api.request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setPaymentStatus: (id, status) => api.request(`/admin/orders/${id}/payment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,setAppointmentStatus: (id, status) => api.request(`/admin/orders/${id}/appointment-status`, { method: "PATCH", body: JSON.stringify({ status }) })
    ,announcements: () => api.request("/admin/announcements")
    ,createAnnouncement: body => api.request("/admin/announcements", { method: "POST", body: JSON.stringify(body) })
    ,updateAnnouncement: (id, body) => api.request(`/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) })
    ,deleteAnnouncement: id => api.request(`/admin/announcements/${id}`, { method: "DELETE" })
    ,siteContent: () => api.request("/admin/site-content")
    ,updateSiteContent: body => api.request("/admin/site-content", { method: "PATCH", body: JSON.stringify(body) })
  }
};
