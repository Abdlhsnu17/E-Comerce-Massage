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
  announcements: [],
  cart: { items: [], subtotal: 0, totalQty: 0 },
  favorites: new Set(),
  user: null,
  orders: [],
  pendingCheckout: false,
  shippingCost: 20000,
  admin: {
    tab: "ringkasan", orders: [], products: [], users: [], categories: [], announcements: [],
    editingProductId: null, editingAnnouncementId: null
  }
};

const isAdmin = () => state.user?.role === "admin";

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

async function loadAnnouncements() {
  try {
    state.announcements = await api.announcements();
  } catch (error) {
    state.announcements = [];
    console.error(error);
  }
  renderAnnouncements();
}

function renderAnnouncements() {
  const section = byId("announcementSection");
  section.hidden = state.announcements.length === 0;
  byId("announcementList").innerHTML = state.announcements.map(item => {
    const summary = item.excerpt || item.content;
    const date = item.publishedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.publishedAt)) : "";
    return `
      <article class="announcement-card">
        ${item.image ? `<img class="announcement-card__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />` : ""}
        <div class="announcement-card__body">
          <div class="announcement-card__meta"><span>${escapeHtml(item.kind)}</span><time>${escapeHtml(date)}</time></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(summary)}</p>
          ${item.excerpt && item.excerpt !== item.content ? `<details class="announcement-card__details"><summary>Baca selengkapnya</summary><p>${escapeHtml(item.content)}</p></details>` : ""}
        </div>
      </article>
    `;
  }).join("");
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
  [authModal, checkoutModal, ordersModal, adminModal].forEach(modal => {
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
  byId("adminButton").hidden = !isAdmin();
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

// ---------------------------------------------------------------- admin

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderAdminStats(stats) {
  const cards = [
    ["Pengguna", stats.totalUsers],
    ["Produk aktif", stats.totalProducts - stats.inactiveProducts],
    ["Pesanan", stats.totalOrders],
    ["Perlu diproses", stats.pendingOrders],
    ["Pendapatan", formatPrice(stats.revenue)],
    ["Newsletter", stats.subscribers]
  ];
  byId("adminStats").innerHTML = cards.map(([label, value]) => `
    <article class="admin-stat"><span>${label}</span><strong>${escapeHtml(value)}</strong></article>
  `).join("");
  byId("adminStatusTable").innerHTML = stats.byStatus.map(row => `
    <tr><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.jumlah)}</td><td>${formatPrice(row.nilai)}</td></tr>
  `).join("");
  byId("adminTopTable").innerHTML = stats.topProducts.length
    ? stats.topProducts.map(product => `
      <tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.terjual)} terjual</td><td>${formatPrice(product.pendapatan)}</td></tr>
    `).join("")
    : '<tr><td colspan="3">Belum ada penjualan.</td></tr>';
}

async function loadAdminOrders() {
  const params = {
    status: byId("adminOrderStatusFilter").value,
    q: byId("adminOrderSearch").value.trim()
  };
  state.admin.orders = await api.admin.orders(params);
  byId("adminOrdersEmpty").hidden = state.admin.orders.length > 0;
  byId("adminOrdersTable").innerHTML = state.admin.orders.map(order => `
    <tr>
      <td><strong>${escapeHtml(order.orderCode)}</strong><small>${escapeHtml(order.createdAt)}</small></td>
      <td>${escapeHtml(order.customerName)}<small>${escapeHtml(order.customerEmail)}</small></td>
      <td>${order.items.length} item</td>
      <td>${formatPrice(order.total)}</td>
      <td><select data-order-status="${order.id}" aria-label="Status pesanan ${escapeHtml(order.orderCode)}">
        ${ADMIN_ORDER_STATUSES.map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></td>
    </tr>
  `).join("");
}

function renderAdminProducts() {
  byId("adminProductCategory").innerHTML = state.admin.categories.map(category => `
    <option value="${category.id}">${escapeHtml(category.name)}</option>
  `).join("");
  byId("adminProductsTable").innerHTML = state.admin.products.map(product => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.category)}</td>
      <td>${formatPrice(product.price)}</td>
      <td>${escapeHtml(product.stock)}</td>
      <td>${product.isActive ? "Aktif" : "Nonaktif"}</td>
      <td class="admin-actions">
        <button class="text-button" data-edit-product="${product.id}" type="button">Edit</button>
        <button class="text-button" data-toggle-product="${product.id}" type="button">${product.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
      </td>
    </tr>
  `).join("");
}

async function loadAdminProducts() {
  const [products, categories] = await Promise.all([api.admin.products(), api.categories()]);
  state.admin.products = products;
  state.admin.categories = categories;
  renderAdminProducts();
}

async function loadAdminUsers() {
  state.admin.users = await api.admin.users();
  byId("adminUsersTable").innerHTML = state.admin.users.map(user => `
    <tr>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.totalOrders)}</td>
      <td>${formatPrice(user.totalBelanja)}</td>
      <td><select data-user-role="${user.id}" aria-label="Peran ${escapeHtml(user.email)}">
        <option value="user" ${user.role === "user" ? "selected" : ""}>Pelanggan</option>
        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
      </select></td>
    </tr>
  `).join("");
}

async function loadAdminAnnouncements() {
  state.admin.announcements = await api.admin.announcements();
  byId("adminAnnouncementsTable").innerHTML = state.admin.announcements.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.kind)}</td>
      <td>${item.isPublished ? "Terbit" : "Draft"}</td>
      <td class="admin-actions">
        <button class="text-button" data-edit-announcement="${item.id}" type="button">Edit</button>
        <button class="text-button" data-toggle-announcement="${item.id}" type="button">${item.isPublished ? "Jadikan draft" : "Terbitkan"}</button>
        <button class="text-button" data-delete-announcement="${item.id}" type="button">Hapus</button>
      </td>
    </tr>
  `).join("");
}

async function openAdminDashboard() {
  if (!isAdmin()) return showToast("Dashboard hanya tersedia untuk admin.");
  byId("adminGreeting").textContent = `Halo ${state.user.name}, berikut ringkasan toko.`;
  openModal(adminModal);
  try {
    const [stats] = await Promise.all([
      api.admin.stats(),
      loadAdminOrders(),
      loadAdminProducts(),
      loadAdminUsers(),
      loadAdminAnnouncements()
    ]);
    renderAdminStats(stats);
    showAdminTab(state.admin.tab);
  } catch (error) {
    showToast(error.message);
  }
}

function showAdminTab(tab) {
  state.admin.tab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.adminTab === tab);
  });
  document.querySelectorAll(".admin-panel").forEach(panel => {
    const panelName = tab === "berita" ? "Berita" : `${tab[0].toUpperCase()}${tab.slice(1)}`;
    panel.hidden = panel.id !== `adminPanel${panelName}`;
  });
}

function resetAdminProductForm() {
  state.admin.editingProductId = null;
  byId("adminProductForm").reset();
  byId("adminProductFormTitle").textContent = "Tambah produk baru";
  byId("adminProductSubmit").textContent = "Simpan produk";
  byId("adminProductCancel").hidden = true;
  clearImagePreview("adminProductImageFile", "adminProductImagePreview");
}

function editAdminProduct(productId) {
  const product = state.admin.products.find(item => item.id === Number(productId));
  if (!product) return;
  state.admin.editingProductId = product.id;
  byId("adminProductName").value = product.name;
  byId("adminProductCategory").value = product.categoryId;
  byId("adminProductPrice").value = product.price;
  byId("adminProductOldPrice").value = product.oldPrice ?? "";
  byId("adminProductStock").value = product.stock;
  byId("adminProductBadge").value = product.badge || "";
  byId("adminProductImage").value = product.image || "";
  byId("adminProductDescription").value = product.description || "";
  setImagePreview("adminProductImagePreview", product.image);
  byId("adminProductFormTitle").textContent = "Edit produk";
  byId("adminProductSubmit").textContent = "Simpan perubahan";
  byId("adminProductCancel").hidden = false;
  byId("adminProductForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

const imagePreviewUrls = new Map();

function setImagePreview(previewId, source) {
  const previousUrl = imagePreviewUrls.get(previewId);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  imagePreviewUrls.delete(previewId);
  const preview = byId(previewId);
  preview.src = source || "";
  preview.hidden = !source;
}

function clearImagePreview(inputId, previewId) {
  byId(inputId).value = "";
  setImagePreview(previewId, "");
}

function bindImagePreview(inputId, previewId) {
  byId(inputId).addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return setImagePreview(previewId, "");
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      clearImagePreview(inputId, previewId);
      return showToast("Pilih gambar JPG, PNG, WEBP, atau GIF maksimal 5 MB.");
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewId, previewUrl);
    imagePreviewUrls.set(previewId, previewUrl);
  });
}

async function uploadSelectedImage(inputId) {
  const file = byId(inputId).files[0];
  if (!file) return null;
  return (await api.admin.uploadImage(file)).image;
}

function resetAdminAnnouncementForm() {
  state.admin.editingAnnouncementId = null;
  byId("adminAnnouncementForm").reset();
  byId("adminAnnouncementFormTitle").textContent = "Buat berita atau pengumuman";
  byId("adminAnnouncementSubmit").textContent = "Simpan berita";
  byId("adminAnnouncementCancel").hidden = true;
  clearImagePreview("adminAnnouncementImageFile", "adminAnnouncementImagePreview");
}

function editAdminAnnouncement(announcementId) {
  const item = state.admin.announcements.find(entry => entry.id === Number(announcementId));
  if (!item) return;
  state.admin.editingAnnouncementId = item.id;
  byId("adminAnnouncementTitle").value = item.title;
  byId("adminAnnouncementKind").value = item.kind;
  byId("adminAnnouncementExcerpt").value = item.excerpt || "";
  byId("adminAnnouncementContent").value = item.content;
  byId("adminAnnouncementImage").value = item.image || "";
  byId("adminAnnouncementPublished").checked = Boolean(item.isPublished);
  setImagePreview("adminAnnouncementImagePreview", item.image);
  byId("adminAnnouncementFormTitle").textContent = "Edit berita atau pengumuman";
  byId("adminAnnouncementSubmit").textContent = "Simpan perubahan";
  byId("adminAnnouncementCancel").hidden = false;
  byId("adminAnnouncementForm").scrollIntoView({ behavior: "smooth", block: "start" });
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
byId("adminButton").addEventListener("click", openAdminDashboard);
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

document.querySelector(".admin-tabs").addEventListener("click", event => {
  const button = event.target.closest("[data-admin-tab]");
  if (button) showAdminTab(button.dataset.adminTab);
});

byId("adminOrderStatusFilter").addEventListener("change", () => {
  loadAdminOrders().catch(error => showToast(error.message));
});

let adminSearchTimer;
byId("adminOrderSearch").addEventListener("input", () => {
  clearTimeout(adminSearchTimer);
  adminSearchTimer = setTimeout(() => loadAdminOrders().catch(error => showToast(error.message)), 220);
});

byId("adminOrdersTable").addEventListener("change", async event => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  try {
    await api.admin.setOrderStatus(select.dataset.orderStatus, select.value);
    await Promise.all([loadAdminOrders(), api.admin.stats().then(renderAdminStats)]);
    showToast("Status pesanan diperbarui.");
  } catch (error) {
    showToast(error.message);
    loadAdminOrders().catch(() => {});
  }
});

byId("adminProductForm").addEventListener("submit", async event => {
  event.preventDefault();
  const oldPriceValue = byId("adminProductOldPrice").value;
  const payload = {
    name: byId("adminProductName").value.trim(),
    categoryId: Number(byId("adminProductCategory").value),
    price: Number(byId("adminProductPrice").value),
    oldPrice: oldPriceValue === "" ? null : Number(oldPriceValue),
    stock: Number(byId("adminProductStock").value),
    badge: byId("adminProductBadge").value.trim(),
    image: byId("adminProductImage").value.trim(),
    description: byId("adminProductDescription").value.trim()
  };
  try {
    const uploadedImage = await uploadSelectedImage("adminProductImageFile");
    if (uploadedImage) payload.image = uploadedImage;
    if (state.admin.editingProductId) {
      await api.admin.updateProduct(state.admin.editingProductId, payload);
      showToast("Produk diperbarui.");
    } else {
      await api.admin.createProduct(payload);
      showToast("Produk ditambahkan.");
    }
    resetAdminProductForm();
    await Promise.all([loadAdminProducts(), loadCatalog(), api.admin.stats().then(renderAdminStats)]);
    await loadProducts();
  } catch (error) {
    showToast(error.message);
  }
});

byId("adminProductCancel").addEventListener("click", resetAdminProductForm);

byId("adminProductsTable").addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) return editAdminProduct(editButton.dataset.editProduct);

  const toggleButton = event.target.closest("[data-toggle-product]");
  if (!toggleButton) return;
  const product = state.admin.products.find(item => item.id === Number(toggleButton.dataset.toggleProduct));
  if (!product) return;
  const active = Boolean(product.isActive);
  if (active && !window.confirm(`Nonaktifkan produk ${product.name}?`)) return;
  try {
    if (active) await api.admin.deactivateProduct(product.id);
    else await api.admin.updateProduct(product.id, { isActive: true });
    await Promise.all([loadAdminProducts(), loadCatalog(), api.admin.stats().then(renderAdminStats)]);
    await loadProducts();
    showToast(active ? "Produk dinonaktifkan." : "Produk diaktifkan kembali.");
  } catch (error) {
    showToast(error.message);
  }
});

byId("adminUserForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api.admin.createUser({
      name: byId("adminUserName").value.trim(),
      email: byId("adminUserEmail").value.trim(),
      password: byId("adminUserPassword").value,
      role: byId("adminUserRole").value
    });
    event.target.reset();
    await Promise.all([loadAdminUsers(), api.admin.stats().then(renderAdminStats)]);
    showToast("Akun berhasil dibuat.");
  } catch (error) {
    showToast(error.message);
  }
});

byId("adminUsersTable").addEventListener("change", async event => {
  const select = event.target.closest("[data-user-role]");
  if (!select) return;
  try {
    await api.admin.setUserRole(select.dataset.userRole, select.value);
    await Promise.all([loadAdminUsers(), api.admin.stats().then(renderAdminStats)]);
    showToast("Peran akun diperbarui.");
  } catch (error) {
    showToast(error.message);
    loadAdminUsers().catch(() => {});
  }
});

bindImagePreview("adminProductImageFile", "adminProductImagePreview");
bindImagePreview("adminAnnouncementImageFile", "adminAnnouncementImagePreview");

byId("adminAnnouncementForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    title: byId("adminAnnouncementTitle").value.trim(),
    kind: byId("adminAnnouncementKind").value,
    excerpt: byId("adminAnnouncementExcerpt").value.trim(),
    content: byId("adminAnnouncementContent").value.trim(),
    image: byId("adminAnnouncementImage").value.trim(),
    isPublished: byId("adminAnnouncementPublished").checked
  };
  try {
    const uploadedImage = await uploadSelectedImage("adminAnnouncementImageFile");
    if (uploadedImage) payload.image = uploadedImage;
    if (state.admin.editingAnnouncementId) {
      await api.admin.updateAnnouncement(state.admin.editingAnnouncementId, payload);
      showToast("Berita/pengumuman diperbarui.");
    } else {
      await api.admin.createAnnouncement(payload);
      showToast("Berita/pengumuman berhasil dibuat.");
    }
    resetAdminAnnouncementForm();
    await Promise.all([loadAdminAnnouncements(), loadAnnouncements()]);
  } catch (error) {
    showToast(error.message);
  }
});

byId("adminAnnouncementCancel").addEventListener("click", resetAdminAnnouncementForm);

byId("adminAnnouncementsTable").addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-announcement]");
  if (editButton) return editAdminAnnouncement(editButton.dataset.editAnnouncement);

  const toggleButton = event.target.closest("[data-toggle-announcement]");
  const deleteButton = event.target.closest("[data-delete-announcement]");
  const itemId = Number(toggleButton?.dataset.toggleAnnouncement || deleteButton?.dataset.deleteAnnouncement);
  const item = state.admin.announcements.find(entry => entry.id === itemId);
  if (!item) return;

  try {
    if (deleteButton) {
      if (!window.confirm(`Hapus berita/pengumuman “${item.title}”?`)) return;
      await api.admin.deleteAnnouncement(item.id);
      showToast("Berita/pengumuman dihapus.");
    } else if (toggleButton) {
      await api.admin.updateAnnouncement(item.id, {
        title: item.title,
        kind: item.kind,
        excerpt: item.excerpt || "",
        content: item.content,
        image: item.image || "",
        isPublished: !Boolean(item.isPublished)
      });
      showToast(item.isPublished ? "Berita disimpan sebagai draft." : "Berita diterbitkan.");
    }
    await Promise.all([loadAdminAnnouncements(), loadAnnouncements()]);
  } catch (error) {
    showToast(error.message);
  }
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
  await loadAnnouncements();
  await restoreSession();
  await Promise.all([loadCart(), loadFavorites()]);
}

init();
