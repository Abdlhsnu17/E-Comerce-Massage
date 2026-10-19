const dashboardMoney = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const dashboardEsc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const orderStatuses = ["Sedang diproses", "Dikirim", "Selesai", "Dibatalkan"];
const paymentStatuses = ["Menunggu pembayaran", "Dibayar", "Gagal", "Dibatalkan"];
const appointmentStatuses = ["Menunggu konfirmasi", "Dikonfirmasi", "Selesai", "Dibatalkan"];
const menuToggle = document.querySelector("#menu-toggle");
const dashboardSidebar = document.querySelector("#dashboard-sidebar");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
function setSidebarOpen(open) {
  dashboardSidebar.classList.toggle("is-open", open);
  sidebarBackdrop.classList.toggle("is-visible", open);
  menuToggle.classList.toggle("is-active", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
}
function closeSidebar() { setSidebarOpen(false); }
menuToggle.addEventListener("click", () => setSidebarOpen(!dashboardSidebar.classList.contains("is-open")));
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
  const targetId = link.hash.slice(1);
  switchDashboardTab(targetId);
  window.history.replaceState(null, "", `#${targetId}`);
  closeSidebar();
}));
const initialDashboardTab = sidebarLinks.some(link => link.hash === window.location.hash) ? window.location.hash.slice(1) : "ringkasan";
switchDashboardTab(initialDashboardTab);
const dashboardMessage = document.querySelector("#dashboard-message");
const dashboardContent = document.querySelector("#dashboard-content");
const accessMessage = document.querySelector("#access-message");
const serviceForm = document.querySelector("#service-form");
const serviceEditor = document.querySelector("#service-editor");
const servicesList = document.querySelector("#services-list");
let dashboardProducts = [];
let dashboardUsers = [];
let currentAdminId = null;

function setupPasswordToggles() {
  const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  const eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.4 9.4 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  document.querySelectorAll('.service-form-grid input[type="password"]').forEach(input => {
    const wrapper = document.createElement("span");
    wrapper.className = "password-input";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement("button");
    button.className = "password-toggle";
    button.type = "button";
    button.setAttribute("aria-label", "Tampilkan password");
    button.setAttribute("aria-pressed", "false");
    button.title = "Tampilkan password";
    button.innerHTML = eyeIcon;
    button.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-label", visible ? "Tampilkan password" : "Sembunyikan password");
      button.setAttribute("aria-pressed", String(!visible));
      button.title = visible ? "Tampilkan password" : "Sembunyikan password";
      button.innerHTML = visible ? eyeIcon : eyeOffIcon;
    });
    wrapper.appendChild(button);
  });
}
let servicePreviewUrl = null;
const serviceImagePreview = document.querySelector("#service-image-preview");
const dashboardIcons = {
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.8 7.2 3 3"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7l1-3h4l1 3"/></svg>'
};

function dashboardIconButton(icon, label, dataAttribute, id, destructive = false) {
  return `<button class="icon-button${destructive ? " icon-button--danger" : ""}" ${dataAttribute}="${Number(id)}" type="button" aria-label="${label}" title="${label}">${dashboardIcons[icon]}</button>`;
}

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
  window.invoiceExports.register(orders);
  document.querySelector("#order-count").textContent = `${orders.length} pesanan`;
  document.querySelector("#orders-empty").hidden = orders.length > 0;
  document.querySelector("#orders-table").innerHTML = orders.slice(0, 20).map(order => {
    const services = (order.items || []).map(item => `${dashboardEsc(item.name)} × ${dashboardEsc(item.qty)}`).join(", ") || "-";
    const orderOptions = orderStatuses.map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("");
    const paymentOptions = paymentStatuses.map(status => `<option value="${status}" ${order.paymentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const appointmentOptions = appointmentStatuses.map(status => `<option value="${status}" ${order.appointmentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const date = order.appointmentDate ? new Date(`${String(order.appointmentDate).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Belum dijadwalkan";
    const location = order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio";
    return `<tr><td>${dashboardEsc(order.orderCode)}</td><td>${dashboardEsc(order.customerName || order.recipientName)}</td><td>${services}</td><td>${dashboardEsc(date)} ${dashboardEsc(order.appointmentTime || "")}</td><td>${location}</td><td>${dashboardMoney(order.total)}</td><td>${window.invoiceExports.actions(order.id)}</td><td><select data-order-id="${Number(order.id)}" aria-label="Status pesanan ${dashboardEsc(order.orderCode)}">${orderOptions}</select></td><td><select data-appointment-order="${Number(order.id)}" aria-label="Status sesi ${dashboardEsc(order.orderCode)}">${appointmentOptions}</select></td><td><select data-payment-order="${Number(order.id)}" aria-label="Status pembayaran ${dashboardEsc(order.orderCode)}">${paymentOptions}</select></td><td><button class="icon-button" type="button" data-cancel-order="${Number(order.id)}" aria-label="Batalkan pesanan ${dashboardEsc(order.orderCode)}" title="Batalkan pesanan">×</button></td></tr>`;
  }).join("");
}

function renderServices(products) {
  dashboardProducts = products;
  document.querySelector("#service-count").textContent = `${products.length} layanan`;
  document.querySelector("#services-empty").hidden = products.length > 0;
  document.querySelector("#services-table").innerHTML = products.slice(0, 50).map(product => `<tr><td>${dashboardEsc(product.name)}</td><td>${dashboardEsc(product.category)}</td><td>${Number(product.durationMinutes) || 0} menit</td><td>${dashboardMoney(product.price)}</td><td>${product.isActive ? "Aktif" : "Nonaktif"}</td><td class="table-actions">${dashboardIconButton("edit", `Edit layanan ${dashboardEsc(product.name)}`, "data-edit-service", product.id)}${dashboardIconButton("delete", `Hapus layanan ${dashboardEsc(product.name)}`, "data-delete-service", product.id, true)}</td></tr>`).join("");
}

function renderUsers(users) {
  dashboardUsers = users;
  document.querySelector("#user-count").textContent = `${users.length} akun`;
  document.querySelector("#users-empty").hidden = users.length > 0;
  document.querySelector("#users-table").innerHTML = users.map(user => {
    const registeredAt = new Date(user.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" });
    const roleControl = Number(user.id) === currentAdminId
      ? '<span class="role-badge">Admin (Anda)</span>'
      : `<select data-user-role="${Number(user.id)}" aria-label="Peran ${dashboardEsc(user.name)}"><option value="user" ${user.role === "user" ? "selected" : ""}>Pengguna</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option></select>`;
    const editButton = dashboardIconButton("edit", `Edit akun ${dashboardEsc(user.name)}`, "data-user-edit", user.id);
    const passwordButton = dashboardIconButton("key", `Ganti password ${dashboardEsc(user.name)}`, "data-user-password", user.id);
    const deleteButton = Number(user.id) === currentAdminId ? "" : dashboardIconButton("delete", `Hapus akun ${dashboardEsc(user.name)}`, "data-user-delete", user.id, true);
    return `<tr><td>${dashboardEsc(user.name)}</td><td>${dashboardEsc(user.email)}</td><td>${dashboardEsc(user.phone || "-")}</td><td>${roleControl}</td><td>${Number(user.totalOrders) || 0}</td><td>${dashboardEsc(registeredAt)}</td><td class="table-actions">${editButton}${passwordButton}${deleteButton}</td></tr>`;
  }).join("");
}

function setUsersMessage(message, type = "") {
  const notice = document.querySelector("#users-message");
  notice.textContent = message;
  notice.classList.toggle("is-error", type === "error");
  notice.classList.toggle("is-success", type === "success");
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
  serviceForm.elements.isActive.value = product ? String(!!product.isActive) : "true";
  serviceForm.elements.price.value = product?.price ?? "";
  serviceForm.elements.stock.value = product?.stock ?? 0;
  serviceForm.elements.description.value = product?.description || "";
  serviceForm.elements.image.value = product?.image || "";
  setServiceImagePreview(product?.image || "");
  document.querySelector("#service-form-title").textContent = product ? "Edit layanan" : "Tambah layanan";
  document.querySelector("#save-service-button").textContent = product ? "Simpan perubahan" : "Simpan layanan";
  document.querySelector("#service-form-message").textContent = "";
  servicesList.hidden = true;
  serviceEditor.hidden = false;
  serviceEditor.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function refreshDashboard() {
  dashboardMessage.textContent = "Memuat data dashboard…";
  try {
    const [stats, orders, products, categories, siteContent, users] = await Promise.all([api.admin.stats(), api.admin.orders(), api.admin.products(), api.categories(), api.admin.siteContent(), api.admin.users()]);
    renderMetrics(stats);
    renderOrders(orders);
    renderServices(products);
    renderServiceCategories(categories);
    renderUsers(users);
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
async function renderAdminAnnouncements(){const rows=await api.admin.announcements();document.querySelector("#announcements-admin-list").innerHTML=rows.length?`<table><thead><tr><th>Judul</th><th>Jenis</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(n=>`<tr><td>${dashboardEsc(n.title)}</td><td>${n.kind}</td><td>${n.isPublished?"Terbit":"Draft"}</td><td class="table-actions">${dashboardIconButton("edit", `Edit ${dashboardEsc(n.title)}`, "data-ann-edit", n.id)}${dashboardIconButton("delete", `Hapus ${dashboardEsc(n.title)}`, "data-ann-delete", n.id, true)}</td></tr>`).join("")}</tbody></table>`:"Belum ada berita atau pengumuman.";}
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
    currentAdminId = Number(user.id);
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
document.querySelector("#orders-table").addEventListener("click", async event => {
  const button = event.target.closest("[data-cancel-order]");
  if (!button || !window.confirm("Batalkan pesanan ini dan kembalikan stok?")) return;
  button.disabled = true;
  try {
    await api.admin.cancelOrder(button.dataset.cancelOrder);
    await refreshDashboard();
  } catch (error) {
    dashboardMessage.textContent = error.message;
    button.disabled = false;
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
const userForm = document.querySelector("#user-form");
function openUserForm(user = null) {
  userForm.reset();
  userForm.elements.id.value = user?.id || "";
  userForm.elements.name.value = user?.name || "";
  userForm.elements.email.value = user?.email || "";
  userForm.elements.phone.value = user?.phone || "";
  userForm.elements.role.value = user?.role || "user";
  const editing = !!user;
  document.querySelector("#user-form-title").textContent = editing ? `Edit akun ${user.name}` : "Tambah akun baru";
  document.querySelector("#save-user-button").textContent = editing ? "Simpan perubahan" : "Buat akun";
  document.querySelector("#user-role-field").hidden = false;
  ["#user-password-field", "#user-password-confirm-field"].forEach(selector => { document.querySelector(selector).hidden = editing; });
  userForm.elements.role.disabled = editing && Number(user.id) === currentAdminId;
  userForm.elements.password.disabled = editing;
  userForm.elements.confirmPassword.disabled = editing;
  document.querySelector("#user-form-message").textContent = "";
  userForm.hidden = false;
  userForm.elements.name.focus();
  userForm.scrollIntoView({ behavior: "smooth", block: "center" });
}
document.querySelector("#add-user-button").addEventListener("click", () => openUserForm());
document.querySelector("#cancel-user").addEventListener("click", () => { userForm.hidden = true; });
userForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(userForm));
  const message = document.querySelector("#user-form-message");
  if (!values.id && values.password !== values.confirmPassword) {
    message.textContent = "Konfirmasi password tidak sama.";
    return;
  }
  const button = document.querySelector("#save-user-button");
  button.disabled = true;
  message.textContent = values.id ? "Menyimpan perubahan…" : "Membuat akun…";
  try {
    const payload = { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() };
    if (values.id) {
      await api.admin.updateUser(values.id, payload);
      const previousRole = dashboardUsers.find(user => Number(user.id) === Number(values.id))?.role;
      if (values.role && values.role !== previousRole) await api.admin.updateUserRole(values.id, values.role);
    } else {
      await api.admin.createUser({ ...payload, role: values.role, password: values.password });
    }
    userForm.reset();
    userForm.hidden = true;
    renderUsers(await api.admin.users());
    setUsersMessage(values.id ? "Data akun berhasil diperbarui." : "Akun baru berhasil dibuat.", "success");
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#users-table").addEventListener("change", async event => {
  const select = event.target.closest("[data-user-role]");
  if (!select) return;
  const previousRole = dashboardUsers.find(user => Number(user.id) === Number(select.dataset.userRole))?.role;
  select.disabled = true;
  try {
    await api.admin.updateUserRole(select.dataset.userRole, select.value);
    renderUsers(await api.admin.users());
    setUsersMessage("Peran akun berhasil diperbarui.", "success");
  } catch (error) {
    select.value = previousRole || "user";
    select.disabled = false;
    setUsersMessage(error.message, "error");
  }
});
const userPasswordForm = document.querySelector("#user-password-form");
document.querySelector("#users-table").addEventListener("click", async event => {
  const editButton = event.target.closest("[data-user-edit]");
  const deleteButton = event.target.closest("[data-user-delete]");
  if (editButton) {
    const user = dashboardUsers.find(item => Number(item.id) === Number(editButton.dataset.userEdit));
    if (user) openUserForm(user);
    return;
  }
  if (deleteButton) {
    const user = dashboardUsers.find(item => Number(item.id) === Number(deleteButton.dataset.userDelete));
    if (!user || !window.confirm(`Hapus akun ${user.name}? Tindakan ini tidak dapat dibatalkan.`)) return;
    deleteButton.disabled = true;
    setUsersMessage(`Menghapus akun ${user.name}…`);
    try {
      await api.admin.deleteUser(user.id);
      renderUsers(await api.admin.users());
      setUsersMessage(`Akun ${user.name} berhasil dihapus.`, "success");
    } catch (error) {
      setUsersMessage(error.message, "error");
      deleteButton.disabled = false;
    }
    return;
  }
  const button = event.target.closest("[data-user-password]");
  if (!button) return;
  const user = dashboardUsers.find(item => Number(item.id) === Number(button.dataset.userPassword));
  if (!user) return;
  userPasswordForm.reset();
  userPasswordForm.elements.userId.value = user.id;
  document.querySelector("#user-password-title").textContent = `Ganti password ${user.name}`;
  document.querySelector("#user-password-message").textContent = "";
  userPasswordForm.hidden = false;
  userPasswordForm.elements.password.focus();
  userPasswordForm.scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#cancel-user-password").addEventListener("click", () => { userPasswordForm.hidden = true; });
userPasswordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(userPasswordForm));
  const message = document.querySelector("#user-password-message");
  if (values.password !== values.confirmPassword) {
    message.textContent = "Konfirmasi password baru tidak sama.";
    return;
  }
  const button = document.querySelector("#save-user-password");
  button.disabled = true;
  message.textContent = "Memperbarui password…";
  try {
    await api.admin.updateUserPassword(values.userId, values.password);
    userPasswordForm.reset();
    userPasswordForm.hidden = true;
    setUsersMessage("Password akun berhasil diperbarui.", "success");
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#add-service-button").addEventListener("click", () => openServiceEditor());
document.querySelector("#cancel-service-edit").addEventListener("click", () => {
  serviceEditor.hidden = true;
  servicesList.hidden = false;
  setServiceImagePreview("");
});
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
    isActive: values.isActive === "true",
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
    servicesList.hidden = false;
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
setupPasswordToggles();
initDashboard();
