/**
 * Pembungkus tipis untuk REST API LokaMart.
 *
 * Tidak ada data yang disimpan di browser: identitas pengunjung dibawa oleh
 * cookie httpOnly yang diterbitkan server, dan seluruh keranjang, favorit,
 * serta pesanan hidup di database MySQL.
 */
const api = (() => {
  const BASE_URL = `${window.location.origin}/api`;

  /** Alamat tempat server Node seharusnya dibuka. */
  const SERVER_URL = "http://localhost:3000";

  async function request(path, { method = "GET", body } = {}) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "same-origin", // kirim cookie sesi
      body: body ? JSON.stringify(body) : undefined
    });

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Tidak dapat terhubung ke server.");
    }
    return data;
  }

  /** Memastikan halaman ini benar-benar dilayani server Node, bukan server statis. */
  async function checkServer() {
    try {
      await request("/health");
      return { ok: true };
    } catch {
      return { ok: false, serverUrl: SERVER_URL, openedFrom: window.location.origin };
    }
  }

  return {
    checkServer,
    SERVER_URL,
    products: params => request(`/products?${new URLSearchParams(params)}`),
    categories: () => request("/categories"),

    register: payload => request("/auth/register", { method: "POST", body: payload }),
    login: payload => request("/auth/login", { method: "POST", body: payload }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),

    cart: () => request("/cart"),
    addToCart: (productId, qty = 1) => request("/cart/items", { method: "POST", body: { productId, qty } }),
    setCartQty: (productId, qty) => request(`/cart/items/${productId}`, { method: "PATCH", body: { qty } }),
    removeFromCart: productId => request(`/cart/items/${productId}`, { method: "DELETE" }),

    orders: () => request("/orders"),
    createOrder: payload => request("/orders", { method: "POST", body: payload }),

    favorites: () => request("/favorites"),
    toggleFavorite: productId => request(`/favorites/${productId}`, { method: "POST" }),

    subscribe: email => request("/newsletter", { method: "POST", body: { email } })
  };
})();
