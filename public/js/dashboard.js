const dashboardMoney = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const dashboardEsc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const orderStatuses = ["Sedang diproses", "Dikirim", "Selesai", "Dibatalkan"];
const paymentStatuses = ["Menunggu pembayaran", "Dibayar", "Gagal", "Dibatalkan"];
const appointmentStatuses = ["Menunggu konfirmasi", "Dikonfirmasi", "Selesai", "Dibatalkan"];
const menuToggle = document.querySelector("#menu-toggle");
const dashboardSidebar = document.querySelector("#dashboard-sidebar");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
function closeSidebar() { dashboardSidebar.classList.remove("is-open"); sidebarBackdrop.classList.remove("is-visible"); menuToggle.setAttribute("aria-expanded", "false"); }
menuToggle.addEventListener("click", () => { const open = dashboardSidebar.classList.toggle("is-open"); sidebarBackdrop.classList.toggle("is-visible", open); menuToggle.setAttribute("aria-expanded", String(open)); });
sidebarBackdrop.addEventListener("click", closeSidebar);
dashboardSidebar.querySelectorAll(".sidebar-link").forEach(link => link.addEventListener("click", closeSidebar));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
const sidebarLinks = [...dashboardSidebar.querySelectorAll(".sidebar-link")];
const dashboardSections = sidebarLinks.map(link => document.querySelector(link.hash)).filter(Boolean);
function switchDashboardTab(targetId) {
  const isSummary = targetId === "ringkasan";
  document.querySelector("#dashboard-message").hidden = !isSummary;
  dashboardSections.forEach(section => { section.hidden = section.id !== targetId; });
  sidebarLinks.forEach(link => {
    const active = link.hash === `#${targetId}`;
    link.classList.toggle("is-active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
}
sidebarLinks.forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  switchDashboardTab(link.hash.slice(1));
  closeSidebar();
}));
switchDashboardTab("ringkasan");
const dashboardMessage = document.querySelector("#dashboard-message");
const dashboardContent = document.querySelector("#dashboard-content");
const accessMessage = document.querySelector("#access-message");
const serviceForm = document.querySelector("#service-form");
const serviceEditor = document.querySelector("#service-editor");
let dashboardProducts = [];
let servicePreviewUrl = null;
const serviceImagePreview = document.querySelector("#service-image-preview");

function setServiceImagePreview(source, temporary = false) {
  if (servicePreviewUrl) URL.revokeObjectURL(servicePreviewUrl);
  servicePreviewUrl = temporary ? source : null;
  serviceImagePreview.hidden = !source;
  if (source) serviceImagePreview.src = source;
  else serviceImagePreview.removeAttribute("src");
}

function renderMetrics(stats) {
  const metrics = [
    ["Pesanan masuk", stats.totalOrders],
    ["Menunggu diproses", stats.pendingOrders],
    ["Layanan terdaftar", stats.totalProducts],
    ["Menunggu pembayaran", stats.pendingPayments],
    ["Total transaksi", dashboardMoney(stats.revenue)]
  ];
  document.querySelector("#metric-grid").innerHTML = metrics.map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${dashboardEsc(value)}</strong></article>`).join("");
}

function renderOrders(orders) {
  document.querySelector("#order-count").textContent = `${orders.length} pesanan`;
  document.querySelector("#orders-empty").hidden = orders.length > 0;
  document.querySelector("#orders-table").innerHTML = orders.slice(0, 20).map(order => {
    const services = (order.items || []).map(item => `${dashboardEsc(item.name)} × ${dashboardEsc(item.qty)}`).join(", ") || "-";
    const orderOptions = orderStatuses.map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("");
    const paymentOptions = paymentStatuses.map(status => `<option value="${status}" ${order.paymentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const appointmentOptions = appointmentStatuses.map(status => `<option value="${status}" ${order.appointmentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const date = order.appointmentDate ? new Date(`${String(order.appointmentDate).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Belum dijadwalkan";
    const location = order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio";
    return `<tr><td>${dashboardEsc(order.orderCode)}</td><td>${dashboardEsc(order.customerName || order.recipientName)}</td><td>${services}</td><td>${dashboardEsc(date)} ${dashboardEsc(order.appointmentTime || "")}</td><td>${location}</td><td>${dashboardMoney(order.total)}</td><td><select data-order-id="${Number(order.id)}" aria-label="Status pesanan ${dashboardEsc(order.orderCode)}">${orderOptions}</select></td><td><select data-appointment-order="${Number(order.id)}" aria-label="Status sesi ${dashboardEsc(order.orderCode)}">${appointmentOptions}</select></td><td><select data-payment-order="${Number(order.id)}" aria-label="Status pembayaran ${dashboardEsc(order.orderCode)}">${paymentOptions}</select></td></tr>`;
  }).join("");
}

function renderServices(products) {
  dashboardProducts = products;
  document.querySelector("#service-count").textContent = `${products.length} layanan`;
  document.querySelector("#services-empty").hidden = products.length > 0;
  document.querySelector("#services-table").innerHTML = products.slice(0, 50).map(product => `<tr><td>${dashboardEsc(product.name)}</td><td>${dashboardEsc(product.category)}</td><td>${Number(product.durationMinutes) || 0} menit</td><td>${dashboardMoney(product.price)}</td><td>${product.isActive ? "Aktif" : "Nonaktif"}</td><td><button class="edit-product" data-edit-service="${Number(product.id)}" type="button">Edit</button> <button class="delete-product" data-delete-service="${Number(product.id)}" type="button">Hapus</button></td></tr>`).join("");
}

function renderServiceCategories(categories) {
  const select = serviceForm.elements.categoryId;
  select.innerHTML = '<option value="">Pilih kategori</option>' + categories.map(category => `<option value="${Number(category.id)}">${dashboardEsc(category.name)}</option>`).join("");
}

function openServiceEditor(product = null) {
  serviceForm.reset();
  setServiceImagePreview("");
  serviceForm.elements.id.value = product?.id || "";
  serviceForm.elements.name.value = product?.name || "";
  serviceForm.elements.categoryId.value = product?.categoryId || "";
  serviceForm.elements.durationMinutes.value = product?.durationMinutes ?? "";
  serviceForm.elements.price.value = product?.price ?? "";
  serviceForm.elements.stock.value = product?.stock ?? 0;
  serviceForm.elements.description.value = product?.description || "";
  serviceForm.elements.image.value = product?.image || "";
  setServiceImagePreview(product?.image || "");
  document.querySelector("#service-form-title").textContent = product ? "Edit layanan" : "Tambah layanan";
  document.querySelector("#save-service-button").textContent = product ? "Simpan perubahan" : "Simpan layanan";
  document.querySelector("#service-form-message").textContent = "";
  serviceEditor.hidden = false;
  serviceEditor.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function refreshDashboard() {
  dashboardMessage.textContent = "Memuat data dashboard…";
  try {
    const [stats, orders, products, categories, siteContent] = await Promise.all([api.admin.stats(), api.admin.orders(), api.admin.products(), api.categories(), api.admin.siteContent()]);
    renderMetrics(stats);
    renderOrders(orders);
    renderServices(products);
    renderServiceCategories(categories);
    Object.entries(siteContent).forEach(([name, value]) => {
      const field = document.querySelector(`#site-content-form [name="${name}"]`);
      if (field) field.value = value || "";
    });
    await renderAdminAnnouncements();
    dashboardMessage.textContent = "Data terbaru berhasil dimuat.";
  } catch (error) {
    dashboardMessage.textContent = error.message;
  }
}
async function renderAdminAnnouncements(){const rows=await api.admin.announcements();document.querySelector("#announcements-admin-list").innerHTML=rows.length?`<table><thead><tr><th>Judul</th><th>Jenis</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(n=>`<tr><td>${dashboardEsc(n.title)}</td><td>${n.kind}</td><td>${n.isPublished?"Terbit":"Draft"}</td><td><button data-ann-edit="${n.id}">Edit</button> <button data-ann-delete="${n.id}">Hapus</button></td></tr>`).join("")}</tbody></table>`:"Belum ada berita atau pengumuman.";}
const announcementForm=document.querySelector("#announcement-form");
const announcementImageInput=document.createElement("input");
const announcementImageUrl=document.createElement("input");
announcementImageUrl.type="hidden";
announcementImageUrl.name="image";
announcementImageInput.type="file";
announcementImageInput.accept="image/jpeg,image/png,image/webp,image/gif";
announcementImageInput.name="imageFile";
announcementImageInput.style.gridColumn="1 / -1";
announcementImageInput.setAttribute("aria-label","Foto berita atau pengumuman");
const announcementImageField=document.createElement("label");
announcementImageField.textContent="Foto berita/pengumuman (JPG, PNG, WEBP, GIF; maks. 5 MB)";
announcementImageField.style.display="grid";
announcementImageField.style.gap="6px";
announcementImageField.style.gridColumn="1 / -1";
announcementImageField.appendChild(announcementImageInput);
announcementForm.querySelector(".service-form-grid").appendChild(announcementImageUrl);
announcementForm.querySelector(".service-form-grid").appendChild(announcementImageField);
document.querySelector("#add-announcement").onclick=()=>{announcementForm.reset();announcementForm.id.value="";announcementForm.hidden=false;};document.querySelector("#cancel-announcement").onclick=()=>announcementForm.hidden=true;
announcementForm.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(announcementForm));v.isPublished=announcementForm.isPublished.checked;try{const imageFile=announcementImageInput.files[0];if(imageFile){if(imageFile.size>5*1024*1024)throw new Error("Ukuran foto maksimal 5 MB.");v.image=(await api.admin.uploadImage(imageFile)).image;}if(v.id)await api.admin.updateAnnouncement(v.id,v);else await api.admin.createAnnouncement(v);announcementForm.hidden=true;await renderAdminAnnouncements();}catch(x){document.querySelector("#announcement-message").textContent=x.message;}};
document.querySelector("#announcements-admin-list").onclick=async e=>{const del=e.target.closest("[data-ann-delete]"),edit=e.target.closest("[data-ann-edit]");if(del&&confirm("Hapus konten ini?")){await api.admin.deleteAnnouncement(del.dataset.annDelete);await renderAdminAnnouncements();}if(edit){const rows=await api.admin.announcements(),n=rows.find(x=>String(x.id)===edit.dataset.annEdit);if(!n)return;announcementForm.hidden=false;announcementForm.reset();announcementForm.id.value=n.id;announcementForm.kind.value=n.kind;announcementForm.title.value=n.title;announcementForm.excerpt.value=n.excerpt||"";announcementForm.content.value=n.content;announcementForm.isPublished.checked=!!n.isPublished;announcementImageUrl.value=n.image||"";announcementImageInput.value="";announcementForm.scrollIntoView({behavior:"smooth",block:"center"});}};

async function initDashboard() {
  try {
    const user = await api.me();
    if (user.role !== "admin") {
      dashboardContent.hidden = true;
      accessMessage.hidden = false;
      document.querySelector("#access-title").textContent = "Dashboard hanya untuk admin.";
      return;
    }
    document.querySelector("#admin-name").textContent = user.name;
    dashboardContent.hidden = false;
    await refreshDashboard();
  } catch {
    dashboardContent.hidden = true;
    accessMessage.hidden = false;
    document.querySelector("#access-title").textContent = "Silakan masuk untuk melanjutkan.";
    document.querySelector("#access-copy").textContent = "Masuk menggunakan akun admin, lalu buka dashboard dari menu akun.";
  }
}

document.querySelector("#orders-table").addEventListener("change", async event => {
  const select = event.target.closest("[data-order-id], [data-payment-order], [data-appointment-order]");
  if (!select) return;
  select.disabled = true;
  try {
    if (select.dataset.paymentOrder) await api.admin.setPaymentStatus(select.dataset.paymentOrder, select.value);
    else if (select.dataset.appointmentOrder) await api.admin.setAppointmentStatus(select.dataset.appointmentOrder, select.value);
    else await api.admin.setOrderStatus(select.dataset.orderId, select.value);
    await refreshDashboard();
  } catch (error) {
    dashboardMessage.textContent = error.message;
    select.disabled = false;
  }
});
document.querySelector("#site-content-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#site-content-message");
  try {
    await api.admin.updateSiteContent(Object.fromEntries(new FormData(form)));
    message.textContent = "Konten halaman berhasil disimpan.";
  } catch (error) {
    message.textContent = error.message;
  }
});
document.querySelector("#password-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const message = document.querySelector("#password-message");
  if (values.newPassword !== values.confirmPassword) {
    message.textContent = "Konfirmasi password baru tidak sama.";
    return;
  }
  try {
    await api.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    form.reset();
    message.textContent = "Password berhasil diperbarui.";
  } catch (error) {
    message.textContent = error.message;
  }
});
document.querySelector("#add-service-button").addEventListener("click", () => openServiceEditor());
document.querySelector("#cancel-service-edit").addEventListener("click", () => { serviceEditor.hidden = true; setServiceImagePreview(""); });
serviceForm.elements.imageFile.addEventListener("change", () => {
  const file = serviceForm.elements.imageFile.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    serviceForm.elements.imageFile.value = "";
    document.querySelector("#service-form-message").textContent = "Pilih gambar JPG, PNG, WEBP, atau GIF maksimal 5 MB.";
    return;
  }
  setServiceImagePreview(URL.createObjectURL(file), true);
  document.querySelector("#service-form-message").textContent = "";
});
serviceForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(serviceForm));
  const productId = values.id;
  const payload = {
    name: values.name.trim(),
    categoryId: Number(values.categoryId),
    durationMinutes: Number(values.durationMinutes),
    price: Number(values.price),
    stock: Number(values.stock),
    description: values.description.trim(),
    image: values.image
  };
  const submitButton = document.querySelector("#save-service-button");
  submitButton.disabled = true;
  document.querySelector("#service-form-message").textContent = "Menyimpan…";
  try {
    const imageFile = serviceForm.elements.imageFile.files[0];
    if (imageFile) payload.image = (await api.admin.uploadImage(imageFile)).image;
    if (productId) await api.admin.updateProduct(productId, payload);
    else await api.admin.createProduct(payload);
    serviceEditor.hidden = true;
    setServiceImagePreview("");
    await refreshDashboard();
  } catch (error) {
    document.querySelector("#service-form-message").textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
document.querySelector("#services-table").addEventListener("click", async event => {
  const edit = event.target.closest("[data-edit-service]");
  const remove = event.target.closest("[data-delete-service]");
  const productId = Number(edit?.dataset.editService || remove?.dataset.deleteService);
  if (!productId) return;
  const product = dashboardProducts.find(item => item.id === productId);
  if (edit && product) return openServiceEditor(product);
  if (!remove || !product) return;
  if (!window.confirm(`Hapus layanan ${product.name}? Riwayat pesanan yang sudah ada tetap tersimpan.`)) return;
  const button = remove;
  button.disabled = true;
  try {
    await api.admin.deleteProduct(productId);
    await refreshDashboard();
  } catch (error) {
    dashboardMessage.textContent = error.message;
    button.disabled = false;
  }
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  await api.logout();
  window.location.href = "/";
});
initDashboard();
