/**
 * Logika UI LokaMart.
 *
 * Seluruh data — katalog, keranjang, favorit, akun, dan pesanan — dibaca dan
 * ditulis langsung ke database MySQL lewat REST API. Browser tidak menyimpan
 * apa pun; state di bawah ini hanya salinan sementara untuk merender halaman.
 */
const state = {
  catalog: [],          // seluruh produk dari database
  visible: [],          // hasil filter/sort yang sedang ditampilkan
  categories: ["Semua"],
  category: "Semua",
  search: "",
  sort: "featured",
  cart: { items: [], subtotal: 0, totalQty: 0 },
  favorites: new Set(),
  user: null,
  orders: [],
  pendingCheckout: false,
  shippingCost: 20000,
  admin: { tab: "ringkasan", orders: [], products: [], users: [], categories: [] }
};

const isAdmin = () => state.user?.role === "admin";

const SHIPPING_COST = { regular: 20000, express: 35000 };

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const formatPrice = value => rupiah.format(Number(value) || 0);
const byId = id => document.getElementById(id);

const productGrid = byId("productGrid");
const categoryFilters = byId("categoryFilters");
const resultsCopy = byId("resultsCopy");
const emptyState = byId("emptyState");
const globalSearch = byId("globalSearch");
const searchPanel = byId("searchPanel");
const cartDrawer = byId("cartDrawer");
const overlay = byId("overlay");
const authModal = byId("authModal");
const checkoutModal = byId("checkoutModal");
const ordersModal = byId("ordersModal");
const adminModal = byId("adminModal");
const toast = byId("toast");

function productById(id) {
  return state.catalog.find(product => product.id === Number(id));
}

// ---------------------------------------------------------------- katalog

async function loadCatalog() {
  state.catalog = await api.products({});
}

async function loadCategories() {
  const rows = await api.categories();
  state.categories = ["Semua", ...rows.map(row => row.name)];
  renderCategories();
}

function renderCategories() {
  categoryFilters.innerHTML = state.categories.map(category => `
    <button class="category-filter ${state.category === category ? "is-active" : ""}" data-category="${category}" type="button">${category}</button>
  `).join("");
}

async function loadProducts() {
  try {
    state.visible = await api.products({
      category: state.category,
      q: state.search.trim(),
      sort: state.sort
    });
  } catch (error) {
    showToast(error.message);
    state.visible = [];
  }

  state.visible.forEach(product => {
    if (!productById(product.id)) state.catalog.push(product);
  });

  renderProducts();
}

function renderProducts() {
  productGrid.innerHTML = state.visible.map(product => `
    <article class="product-card">
      <div class="product-card__image">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span class="product-badge">${product.badge}</span>
        <button class="favorite-btn ${state.favorites.has(product.id) ? "is-active" : ""}" data-favorite="${product.id}" type="button" aria-label="Simpan ${product.name}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.5a5.4 5.4 0 0 0 0-7.6Z"/></svg>
        </button>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3>${product.name}</h3>
        <div class="product-card__rating"><b>★★★★★</b><span>${product.rating} (${product.reviews})</span></div>
        <div class="product-card__footer">
          <div class="product-price"><strong>${formatPrice(product.price)}</strong>${product.oldPrice ? `<del>${formatPrice(product.oldPrice)}</del>` : ""}</div>
          <button class="add-cart-btn" data-add-cart="${product.id}" type="button" aria-label="Tambahkan ${product.name} ke keranjang">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 11h10.8l2-8H6.1M12 8v6M9 11h6"/></svg>
          </button>
        </div>
      </div>
    </article>
  `).join("");

  resultsCopy.textContent = `${state.visible.length} produk ditampilkan${state.search ? ` untuk “${state.search}”` : ""}.`;
  emptyState.hidden = state.visible.length !== 0;
  productGrid.hidden = state.visible.length === 0;
}

// ---------------------------------------------------------------- keranjang

/** Setiap perubahan keranjang dibalas server dengan isi keranjang terbaru. */
async function withCart(action, successMessage) {
  try {
    state.cart = await action();
    renderCart();
    if (successMessage) showToast(successMessage);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadCart() {
  try {
    state.cart = await api.cart();
  } catch {
    state.cart = { items: [], subtotal: 0, totalQty: 0 };
  }
  renderCart();
}

function addToCart(id) {
  const product = productById(id);
  return withCart(() => api.addToCart(Number(id)), product ? `${product.name} ditambahkan ke keranjang.` : null);
}

function updateCartItem(id, delta) {
  const item = state.cart.items.find(entry => entry.id === Number(id));
  if (!item) return;
  return withCart(() => api.setCartQty(Number(id), item.qty + delta));
}

function removeCartItem(id) {
  return withCart(() => api.removeFromCart(Number(id)), "Produk dihapus dari keranjang.");
}

function renderCart() {
  const { items, subtotal, totalQty } = state.cart;
  byId("cartCount").textContent = totalQty;
  byId("cartSubtitle").textContent = `${totalQty} produk`;
  byId("cartEmpty").hidden = items.length > 0;
  byId("cartSummary").hidden = items.length === 0;
  byId("cartItems").hidden = items.length === 0;
  byId("cartSubtotal").textContent = formatPrice(subtotal);

  byId("cartItems").innerHTML = items.map(item => `
    <article class="cart-item">
      <img class="cart-item__image" src="${item.image}" alt="${item.name}" />
      <div class="cart-item__info">
        <span>${item.category}</span>
        <h4>${item.name}</h4>
        <strong>${formatPrice(item.price)}</strong>
        <div class="cart-item__controls">
          <button class="qty-btn" data-cart-minus="${item.id}" type="button" aria-label="Kurangi jumlah">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-cart-plus="${item.id}" type="button" aria-label="Tambah jumlah">+</button>
        </div>
      </div>
      <button class="remove-item" data-cart-remove="${item.id}" type="button">Hapus</button>
    </article>
  `).join("");
}

// ---------------------------------------------------------------- panel & modal

function openOverlay() {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  document.body.classList.add("no-scroll");
}

function closeOverlayIfIdle() {
  const active = document.querySelector(".drawer.is-open, .modal.is-open");
  if (active) return;
  overlay.classList.remove("is-visible");
  document.body.classList.remove("no-scroll");
  setTimeout(() => { if (!overlay.classList.contains("is-visible")) overlay.hidden = true; }, 250);
}

function openCart() {
  closeAllPanels(false);
  openOverlay();
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  setTimeout(closeOverlayIfIdle, 20);
}

function openModal(modal) {
  closeAllPanels(false);
  openOverlay();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  setTimeout(closeOverlayIfIdle, 20);
}

function closeAllPanels(hideOverlay = true) {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  [authModal, checkoutModal, ordersModal].forEach(modal => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  });
  if (hideOverlay) closeOverlayIfIdle();
}

// ---------------------------------------------------------------- autentikasi

function setAuthTab(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach(button => button.classList.toggle("is-active", button.dataset.authTab === tab));
  byId("loginForm").hidden = tab !== "login";
  byId("registerForm").hidden = tab !== "register";
}

function openAuth(tab = "login") {
  setAuthTab(tab);
  openModal(authModal);
  setTimeout(() => {
    const target = tab === "login" ? byId("loginEmail") : byId("registerName");
    target.focus();
  }, 260);
}

function renderAccount() {
  byId("accountLabel").textContent = state.user ? state.user.name.split(" ")[0] : "Masuk";
}

async function loadFavorites() {
  try {
    state.favorites = new Set(await api.favorites());
  } catch {
    state.favorites = new Set();
  }
  renderProducts();
}

async function completeAuthentication({ user }) {
  state.user = user;
  renderAccount();
  closeModal(authModal);
  showToast(`Selamat datang, ${user.name.split(" ")[0]}!`);

  // Keranjang & favorit tamu sudah dipindahkan server ke akun ini.
  await Promise.all([loadCart(), loadFavorites()]);

  if (state.pendingCheckout) {
    state.pendingCheckout = false;
    setTimeout(openCheckout, 280);
  }
}

async function restoreSession() {
  try {
    state.user = await api.me();
  } catch {
    state.user = null;
  }
  renderAccount();
}

// ---------------------------------------------------------------- checkout

function openCheckout() {
  if (!state.cart.items.length) {
    showToast("Keranjang masih kosong.");
    return;
  }
  if (!state.user) {
    state.pendingCheckout = true;
    openAuth("login");
    showToast("Masuk terlebih dahulu untuk melanjutkan checkout.");
    return;
  }

  state.shippingCost = SHIPPING_COST.regular;
  byId("shippingForm").reset();
  byId("paymentForm").reset();
  document.querySelector('input[name="shipping"][value="regular"]').checked = true;
  document.querySelector('input[name="payment"][value="QRIS"]').checked = true;
  byId("shippingName").value = state.user.name || "";
  byId("shippingEmail").value = state.user.email || "";
  if (state.user.phone) byId("shippingPhone").value = state.user.phone;
  showCheckoutStep(1);
  renderCheckoutSummary();
  openModal(checkoutModal);
}

function showCheckoutStep(step) {
  byId("shippingForm").hidden = step !== 1;
  byId("paymentForm").hidden = step !== 2;
  byId("checkoutSuccess").hidden = step !== 3;
  document.querySelectorAll("#checkoutSteps span").forEach((item, index) => item.classList.toggle("is-active", index <= step - 1));
}

function renderCheckoutSummary() {
  const { items, subtotal } = state.cart;
  byId("checkoutItems").innerHTML = items.map(item => `
    <div class="checkout-item">
      <img src="${item.image}" alt="${item.name}" />
      <div><strong>${item.name}</strong><small>${item.qty} × ${formatPrice(item.price)}</small></div>
      <span>${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join("");
  byId("checkoutSubtotal").textContent = formatPrice(subtotal);
  byId("checkoutShipping").textContent = formatPrice(state.shippingCost);
  byId("checkoutTotal").textContent = formatPrice(subtotal + state.shippingCost);
}

/** Item pesanan diambil server dari keranjang di database, bukan dikirim dari sini. */
async function createOrder() {
  const order = await api.createOrder({
    shippingMethod: document.querySelector('input[name="shipping"]:checked').value,
    paymentMethod: document.querySelector('input[name="payment"]:checked').value,
    recipientName: byId("shippingName").value.trim(),
    recipientEmail: byId("shippingEmail").value.trim(),
    recipientPhone: byId("shippingPhone").value.trim(),
    address: byId("shippingAddress").value.trim(),
    city: byId("shippingCity").value.trim(),
    zip: byId("shippingPostal").value.trim()
  });

  await loadCart();      // keranjang sudah dikosongkan server
  await loadProducts();  // stok berkurang setelah pesanan dibuat
  byId("successOrderId").textContent = order.orderCode;
  showCheckoutStep(3);
  return order;
}

// ---------------------------------------------------------------- riwayat pesanan

async function openOrders() {
  if (!state.user) {
    openAuth("login");
    return;
  }
  try {
    state.orders = await api.orders();
  } catch (error) {
    showToast(error.message);
    return;
  }
  renderOrders();
  openModal(ordersModal);
}

function renderOrders() {
  byId("ordersGreeting").textContent = `Halo ${state.user?.name || ""}, berikut semua pesananmu.`;
  byId("ordersEmpty").hidden = state.orders.length > 0;
  byId("ordersList").hidden = state.orders.length === 0;
  byId("ordersList").innerHTML = state.orders.map(order => {
    const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.createdAt));
    const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
    return `
      <article class="order-card">
        <div class="order-card__head">
          <div><strong>${order.orderCode}</strong><span>${date}</span></div>
          <span class="order-status">${order.status}</span>
        </div>
        <div class="order-card__body">
          <div class="order-products">${order.items.slice(0, 5).map(item => `<img src="${item.image}" alt="${item.name}" title="${item.name}" />`).join("")}</div>
          <div class="order-card__foot"><span>${totalQty} produk · ${order.paymentMethod}</span><strong>${formatPrice(order.total)}</strong></div>
        </div>
      </article>
    `;
  }).join("");
}

// ---------------------------------------------------------------- toast

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

// ---------------------------------------------------------------- event listener

categoryFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  loadProducts();
});

productGrid.addEventListener("click", async event => {
  const addButton = event.target.closest("[data-add-cart]");
  if (addButton) addToCart(addButton.dataset.addCart);

  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const id = Number(favoriteButton.dataset.favorite);
    try {
      const { favorited } = await api.toggleFavorite(id);
      if (favorited) state.favorites.add(id);
      else state.favorites.delete(id);
      renderProducts();
    } catch (error) {
      showToast(error.message);
    }
  }
});

byId("sortSelect").addEventListener("change", event => {
  state.sort = event.target.value;
  loadProducts();
});

byId("resetFilter").addEventListener("click", () => {
  state.category = "Semua";
  state.search = "";
  globalSearch.value = "";
  renderCategories();
  loadProducts();
});

document.querySelector(".search-toggle").addEventListener("click", () => {
  searchPanel.classList.add("is-open");
  searchPanel.setAttribute("aria-hidden", "false");
  setTimeout(() => globalSearch.focus(), 100);
});

byId("closeSearch").addEventListener("click", () => {
  searchPanel.classList.remove("is-open");
  searchPanel.setAttribute("aria-hidden", "true");
});

let searchTimer;
globalSearch.addEventListener("input", event => {
  state.search = event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 220);
});

globalSearch.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
    searchPanel.classList.remove("is-open");
  }
});

byId("cartButton").addEventListener("click", openCart);
byId("accountButton").addEventListener("click", () => state.user ? openOrders() : openAuth("login"));
byId("heroOrdersButton").addEventListener("click", openOrders);
byId("joinButton").addEventListener("click", () => openAuth("register"));
byId("checkoutButton").addEventListener("click", openCheckout);
byId("viewOrderButton").addEventListener("click", openOrders);

overlay.addEventListener("click", () => closeAllPanels(true));

document.addEventListener("click", event => {
  const closeTarget = event.target.closest("[data-close]");
  if (closeTarget?.dataset.close === "cart") closeCart();
  if (closeTarget?.dataset.close === "modal") closeAllPanels(true);
});

byId("cartItems").addEventListener("click", event => {
  const plus = event.target.closest("[data-cart-plus]");
  const minus = event.target.closest("[data-cart-minus]");
  const remove = event.target.closest("[data-cart-remove]");
  if (plus) updateCartItem(plus.dataset.cartPlus, 1);
  if (minus) updateCartItem(minus.dataset.cartMinus, -1);
  if (remove) removeCartItem(remove.dataset.cartRemove);
});

document.querySelectorAll("[data-auth-tab]").forEach(button => {
  button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
});

byId("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api.login({
      email: byId("loginEmail").value.trim(),
      password: byId("loginPassword").value
    });
    await completeAuthentication(result);
  } catch (error) {
    showToast(error.message);
  }
});

byId("registerForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api.register({
      name: byId("registerName").value.trim(),
      email: byId("registerEmail").value.trim(),
      password: byId("registerPassword").value
    });
    await completeAuthentication(result);
  } catch (error) {
    showToast(error.message);
  }
});

byId("shippingForm").addEventListener("change", event => {
  if (event.target.name === "shipping") {
    state.shippingCost = SHIPPING_COST[event.target.value] || SHIPPING_COST.regular;
    renderCheckoutSummary();
  }
});

byId("shippingForm").addEventListener("submit", event => {
  event.preventDefault();
  showCheckoutStep(2);
  checkoutModal.scrollTo({ top: 0, behavior: "smooth" });
});

byId("backToShipping").addEventListener("click", () => showCheckoutStep(1));

byId("paymentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Memproses...";
  try {
    await createOrder();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

byId("logoutButton").addEventListener("click", async () => {
  try {
    await api.logout();
  } catch (error) {
    showToast(error.message);
    return;
  }
  state.user = null;
  state.orders = [];
  renderAccount();
  closeAllPanels(true);
  // Setelah keluar, pengunjung kembali memakai keranjang tamu miliknya sendiri.
  await Promise.all([loadCart(), loadFavorites()]);
  showToast("Kamu telah keluar dari akun.");
});

byId("newsletterForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value.trim();
  try {
    const result = await api.subscribe(email);
    showToast(result.message);
    event.target.reset();
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    searchPanel.classList.remove("is-open");
    closeAllPanels(true);
  }
});

// ---------------------------------------------------------------- inisialisasi

/**
 * Halaman ini harus dilayani server Node agar bisa menembus /api ke MySQL.
 * Bila dibuka lewat Live Server, file:// , atau server statis lain, tampilkan
 * petunjuk yang jelas alih-alih membiarkan setiap tombol gagal diam-diam.
 */
function showServerBanner({ serverUrl, openedFrom }) {
  const banner = document.createElement("div");
  banner.className = "server-banner";
  banner.innerHTML = `
    <strong>Belum terhubung ke database.</strong>
    <span>Halaman dibuka dari <code>${openedFrom}</code> yang tidak menjalankan API.
    Jalankan <code>npm start</code> di folder proyek, lalu buka
    <a href="${serverUrl}">${serverUrl}</a>.</span>
  `;
  document.body.prepend(banner);
  document.body.classList.add("has-server-banner");
}

async function init() {
  const server = await api.checkServer();
  if (!server.ok) {
    showServerBanner(server);
    showToast("Buka lewat http://localhost:3000 agar data tersimpan ke MySQL.");
    return;
  }

  try {
    await loadCatalog();
    await loadCategories();
  } catch (error) {
    showToast(error.message);
    console.error(error);
  }
  await loadProducts();
  await restoreSession();
  await Promise.all([loadCart(), loadFavorites()]);
}

init();
