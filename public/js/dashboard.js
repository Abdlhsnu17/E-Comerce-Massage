const dashboardMoney = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const dashboardEsc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const spreadsheetEscape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));
function spreadsheetCell(value, style = "cell") {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const safeValue = !isNumber && /^[\t\r ]*[=+\-@]/.test(String(value ?? "")) ? `'${value}` : value;
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${isNumber ? "Number" : "String"}">${spreadsheetEscape(safeValue)}</Data></Cell>`;
}
function downloadSpreadsheet(filename, { title, sheetName, columns, metadata = [], rows = [] }) {
  const metadataXml = metadata.map(([label, value]) => `<Row>${spreadsheetCell(label, "label")}${spreadsheetCell(value)}</Row>`).join("");
  const headersXml = `<Row ss:AutoFitHeight="0" ss:Height="24">${columns.map(column => spreadsheetCell(column.title, "header")).join("")}</Row>`;
  const dataXml = rows.map(row => `<Row>${row.map((value, index) => spreadsheetCell(value, columns[index]?.style || "cell")).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="12"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#17663A"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="label"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="header"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17663A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
<Style ss:ID="cell"><Font ss:FontName="Calibri" ss:Size="12"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="number"><Font ss:FontName="Calibri" ss:Size="12"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#\,##0"/></Style>
<Style ss:ID="currency"><Font ss:FontName="Calibri" ss:Size="12"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="Rp #\,##0"/></Style>
</Styles>
<Worksheet ss:Name="${spreadsheetEscape(sheetName)}"><Table>
${columns.map(column => `<Column ss:Width="${Number(column.width) || 120}"/>`).join("")}
<Row ss:AutoFitHeight="0" ss:Height="30"><Cell ss:StyleID="title" ss:MergeAcross="${columns.length - 1}"><Data ss:Type="String">${spreadsheetEscape(title)}</Data></Cell></Row>
${metadataXml}<Row/>${headersXml}${dataXml}
</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(new Blob(["\uFEFF", xml], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const orderStatuses = ["Menunggu pembayaran", "Menunggu konfirmasi", "Terkonfirmasi", "Dalam pelayanan", "Selesai", "Dibatalkan"];
const paymentStatuses = ["Menunggu pembayaran", "Menunggu verifikasi", "Dibayar", "Kedaluwarsa", "Gagal", "Dibatalkan", "Dikembalikan"];
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
let dashboardChangeRequests = [];
let dashboardCoupons = [];
let newsletterState = { q: "", page: 1, total: 0, items: [] };
let latestSalesReport = null;
let auditState = { page: 1, total: 0, items: [] };
let dashboardTherapists = [];
let dashboardCategories = [];
let currentAdminId = null;
let currentAdmin = null;

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

function dashboardUserActionButton(icon, label, dataAttribute, id, destructive = false) {
  return `<button class="user-action-button${destructive ? " user-action-button--danger" : ""}" ${dataAttribute}="${Number(id)}" type="button">${dashboardIcons[icon]}<span>${label}</span></button>`;
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
    ["Pesanan masuk", stats.totalOrders, "orders"],
    ["Menunggu diproses", stats.pendingOrders, "pending"],
    ["Layanan terdaftar", stats.totalProducts, "services"],
    ["Menunggu pembayaran", stats.pendingPayments, "payment"],
    ["Total transaksi", dashboardMoney(stats.revenue), "revenue"]
  ];
  const icons = {
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg>',
    pending: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    services: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    payment: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M16 15h2"/></svg>',
    revenue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5M4 20h17M7 16l4-5 3 3 5-7"/></svg>'
  };
  document.querySelector("#metric-grid").innerHTML = metrics.map(([label, value, type]) => `<article class="metric metric--${type}"><div class="metric__heading"><span>${label}</span><span class="metric__icon">${icons[type]}</span></div><strong>${dashboardEsc(value)}</strong></article>`).join("");
  renderDashboardCharts(stats.byStatus || []);
}

function renderDashboardCharts(byStatus) {
  const statuses = ["Menunggu pembayaran", "Menunggu konfirmasi", "Terkonfirmasi", "Dalam pelayanan", "Selesai", "Dibatalkan"];
  const colors = ["#ff1684", "#d18a42", "#0e8a48", "#2583a8", "#1f6f4a", "#8b7468"];
  const entries = statuses.map((status, index) => {
    const row = byStatus.find(item => item.status === status) || {};
    return { status, count: Number(row.jumlah) || 0, color: colors[index] };
  });
  const total = entries.reduce((sum, item) => sum + item.count, 0);
  const completed = entries.find(item => item.status === "Selesai")?.count || 0;
  const maximum = Math.max(...entries.map(item => item.count), 1);
  const completedPercent = total ? Math.round((completed / total) * 100) : 0;
  const chart = document.querySelector("#dashboard-charts");
  chart.innerHTML = `<article class="chart-card chart-card--bars"><div class="chart-card__heading"><div><span>AKTIVITAS PESANAN</span><h2>Status pesanan</h2></div><strong>${total} <small>pesanan</small></strong></div><div class="status-bars">${entries.map(item => `<div class="status-bar"><div class="status-bar__value">${item.count}</div><div class="status-bar__track"><i style="height:${Math.max(7, Math.round((item.count / maximum) * 100))}%;background:${item.color}"></i></div><span>${dashboardEsc(item.status)}</span></div>`).join("")}</div></article><article class="chart-card chart-card--progress"><div class="chart-card__heading"><div><span>TINGKAT PENYELESAIAN</span><h2>Pesanan selesai</h2></div></div><div class="completion-chart"><div class="completion-ring" style="--completion:${completedPercent}%"><div><strong>${completedPercent}%</strong><small>Selesai</small></div></div><div class="completion-copy"><strong>${completed} dari ${total}</strong><span>Pesanan telah selesai diproses.</span></div></div></article>`;
}

function renderOrders(orders) {
  window.invoiceExports.register(orders);
  document.querySelector("#order-count").textContent = `${orders.length} pesanan`;
  document.querySelector("#orders-empty").hidden = orders.length > 0;
  document.querySelector("#orders-table").innerHTML = orders.slice(0, 20).map(order => {
    const isCancelled = order.status === "Dibatalkan";
    const isCompleted = order.status === "Selesai" && order.appointmentStatus === "Selesai" && order.paymentStatus === "Dibayar";
    const isFinal = isCancelled || isCompleted;
    const finalAttributes = isFinal ? " disabled title=\"Status final tidak dapat diubah\"" : "";
    const services = (order.items || []).map(item => `${dashboardEsc(item.name)} × ${dashboardEsc(item.qty)}`).join(", ") || "-";
    const orderOptions = orderStatuses.map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("");
    const paymentOptions = paymentStatuses.map(status => `<option value="${status}" ${order.paymentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const appointmentOptions = appointmentStatuses.map(status => `<option value="${status}" ${order.appointmentStatus === status ? "selected" : ""}>${status}</option>`).join("");
    const date = order.appointmentDate ? new Date(`${String(order.appointmentDate).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Belum dijadwalkan";
    const location = order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio";
    const proof = order.paymentProofUrl
      ? `<a class="order-proof-link" href="${dashboardEsc(order.paymentProofUrl)}" target="_blank" rel="noopener">Lihat bukti</a>`
      : window.invoiceExports.actions(order.id);
    return `<tr>
      <td><div class="order-identity"><strong>${dashboardEsc(order.orderCode)}</strong><span>Pasien: ${dashboardEsc(order.patientName || "-")}</span><span>Orang tua: ${dashboardEsc(order.customerName || order.recipientName)}</span></div></td>
      <td><div class="order-booking"><strong>${services}</strong><span>${dashboardEsc(date)} · ${dashboardEsc(order.appointmentTime || "")} · ${dashboardEsc(location)}</span><small>${dashboardEsc(order.therapistName || "Belum ditetapkan")}</small></div></td>
      <td class="order-total">${dashboardMoney(order.total)}</td>
      <td>${proof}</td>
      <td><div class="order-status-stack"><label>Pesanan<select data-order-id="${Number(order.id)}" aria-label="Status pesanan ${dashboardEsc(order.orderCode)}"${finalAttributes}>${orderOptions}</select></label><label>Sesi<select data-appointment-order="${Number(order.id)}" aria-label="Status sesi ${dashboardEsc(order.orderCode)}"${finalAttributes}>${appointmentOptions}</select></label><label>Pembayaran<select data-payment-order="${Number(order.id)}" aria-label="Status pembayaran ${dashboardEsc(order.orderCode)}"${finalAttributes}>${paymentOptions}</select></label></div></td>
      <td>${isCancelled
        ? `<button class="icon-button icon-button--danger" type="button" data-delete-order="${Number(order.id)}" aria-label="Hapus pesanan ${dashboardEsc(order.orderCode)}" title="Hapus pesanan">×</button>`
        : `<button class="icon-button icon-button--danger" type="button" data-cancel-order="${Number(order.id)}" aria-label="Batalkan pesanan ${dashboardEsc(order.orderCode)}" title="${isCompleted ? "Pesanan selesai tidak dapat dibatalkan" : "Batalkan pesanan"}"${isCompleted ? " disabled" : ""}>×</button>`}</td>
    </tr>`;
  }).join("");
}

function dashboardDate(value) {
  if (!value) return "-";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function renderChangeRequests(requests) {
  dashboardChangeRequests = requests;
  const pending = requests.filter(request => request.status === "Menunggu").length;
  document.querySelector("#change-request-count").textContent = `${pending} menunggu`;
  document.querySelector("#change-requests-empty").hidden = requests.length > 0;
  document.querySelector("#change-requests-table").innerHTML = requests.map(request => {
    const requested = request.requestType === "reschedule" ? `${dashboardDate(request.requestedDate)} ${dashboardEsc(request.requestedTime || "")}` : "Batalkan pesanan";
    const actions = request.status === "Menunggu" ? `<div class="table-actions"><button class="request-action request-action--approve" type="button" data-change-approve="${Number(request.id)}">Setujui</button><button class="request-action request-action--reject" type="button" data-change-reject="${Number(request.id)}">Tolak</button></div>` : "-";
    return `<tr><td>${dashboardEsc(request.orderCode)}</td><td>${dashboardEsc(request.customerName)}<small class="table-subline">${dashboardEsc(request.customerEmail)}</small></td><td>${request.requestType === "cancel" ? "Pembatalan" : "Ubah jadwal"}</td><td>${dashboardDate(request.currentDate)} ${dashboardEsc(request.currentTime || "")}</td><td>${requested}</td><td>${dashboardEsc(request.reason || "-")}</td><td><span class="request-status request-status--${request.status.toLowerCase()}">${dashboardEsc(request.status)}</span></td><td>${actions}</td></tr>`;
  }).join("");
}

function couponDateTime(value, input = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (!input) return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function renderCoupons(coupons) {
  dashboardCoupons = coupons;
  document.querySelector("#coupon-count").textContent = `${coupons.length} voucher`;
  document.querySelector("#coupons-empty").hidden = coupons.length > 0;
  document.querySelector("#coupons-table").innerHTML = coupons.map(coupon => {
    const discount = coupon.discountType === "percent" ? `${Number(coupon.discountValue)}%` : dashboardMoney(coupon.discountValue);
    const usage = `${Number(coupon.usedCount) || 0} / ${coupon.usageLimit === null ? "∞" : Number(coupon.usageLimit)}`;
    const period = coupon.startsAt || coupon.endsAt ? `${coupon.startsAt ? couponDateTime(coupon.startsAt) : "Sekarang"} – ${coupon.endsAt ? couponDateTime(coupon.endsAt) : "Tanpa batas"}` : "Tanpa batas waktu";
    return `<tr><td>${dashboardEsc(coupon.code)}</td><td>${dashboardEsc(discount)}</td><td>${dashboardMoney(coupon.minimumOrder)}</td><td>${dashboardEsc(usage)}</td><td>${dashboardEsc(period)}</td><td>${coupon.isActive ? "Aktif" : "Nonaktif"}</td><td class="table-actions">${dashboardIconButton("edit", `Edit voucher ${dashboardEsc(coupon.code)}`, "data-coupon-edit", coupon.id)}${dashboardIconButton("delete", `Hapus voucher ${dashboardEsc(coupon.code)}`, "data-coupon-delete", coupon.id, true)}</td></tr>`;
  }).join("");
}

function openCouponForm(coupon = null) {
  const form = document.querySelector("#coupon-form");
  form.reset();
  form.elements.id.value = coupon?.id || "";
  form.elements.code.value = coupon?.code || "";
  form.elements.discountType.value = coupon?.discountType || "percent";
  form.elements.discountValue.value = coupon?.discountValue ?? "";
  form.elements.minimumOrder.value = coupon?.minimumOrder ?? 0;
  form.elements.usageLimit.value = coupon?.usageLimit ?? "";
  form.elements.startsAt.value = couponDateTime(coupon?.startsAt, true);
  form.elements.endsAt.value = couponDateTime(coupon?.endsAt, true);
  form.elements.isActive.value = coupon ? String(!!coupon.isActive) : "true";
  document.querySelector("#coupon-form-title").textContent = coupon ? `Edit voucher ${coupon.code}` : "Tambah voucher";
  document.querySelector("#coupon-message").textContent = "";
  form.hidden = false;
  form.elements.code.focus();
}

function renderScheduleSettings(settings) {
  const form = document.querySelector("#schedule-settings-form");
  form.elements.openTime.value = settings.openTime;
  form.elements.closeTime.value = settings.closeTime;
  form.elements.slotIntervalMinutes.value = String(settings.slotIntervalMinutes);
  form.elements.bufferMinutes.value = settings.bufferMinutes;
  form.elements.advanceDays.value = settings.advanceDays;
  const activeDays = new Set((settings.operatingDays || []).map(Number));
  form.querySelectorAll('[name="operatingDays"]').forEach(input => { input.checked = activeDays.has(Number(input.value)); });
}

function renderTherapists(therapists) {
  dashboardTherapists = therapists;
  document.querySelector("#therapists-table").innerHTML = therapists.map(therapist => `<tr><td>${dashboardEsc(therapist.name)}</td><td>${dashboardEsc(therapist.phone || "-")}</td><td>${therapist.isActive ? "Aktif" : "Nonaktif"}</td><td>${Number(therapist.totalBookings) || 0}</td><td class="table-actions">${dashboardIconButton("edit", `Edit ${dashboardEsc(therapist.name)}`, "data-therapist-edit", therapist.id)}${dashboardIconButton("delete", `Hapus ${dashboardEsc(therapist.name)}`, "data-therapist-delete", therapist.id, true)}</td></tr>`).join("") || '<tr><td colspan="5">Belum ada terapis.</td></tr>';
}

function openTherapistForm(therapist = null) {
  const form = document.querySelector("#therapist-form");
  form.reset();
  form.elements.id.value = therapist?.id || "";
  form.elements.name.value = therapist?.name || "";
  form.elements.phone.value = therapist?.phone || "";
  form.elements.isActive.value = therapist ? String(!!therapist.isActive) : "true";
  document.querySelector("#therapist-form-title").textContent = therapist ? `Edit ${therapist.name}` : "Tambah terapis";
  form.hidden = false;
  form.elements.name.focus();
}

function renderNewsletterSubscribers(result) {
  newsletterState = { ...newsletterState, ...result, items: result.items || [] };
  document.querySelector("#subscriber-count").textContent = `${result.total} subscriber`;
  document.querySelector("#subscribers-table").innerHTML = newsletterState.items.map(subscriber => {
    const date = new Date(subscriber.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" });
    return `<tr><td>${dashboardEsc(subscriber.email)}</td><td>${dashboardEsc(date)}</td><td>${dashboardIconButton("delete", `Hapus ${dashboardEsc(subscriber.email)}`, "data-subscriber-delete", subscriber.id, true)}</td></tr>`;
  }).join("") || '<tr><td colspan="3">Belum ada subscriber yang cocok.</td></tr>';
  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  document.querySelector("#subscriber-page").textContent = `Halaman ${result.page} dari ${totalPages}`;
  document.querySelector("#subscriber-prev").disabled = result.page <= 1;
  document.querySelector("#subscriber-next").disabled = result.page >= totalPages;
}

function dateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function renderSalesReport(report) {
  latestSalesReport = report;
  const summary = report.summary || {};
  const metrics = [
    ["Omzet terkonfirmasi", dashboardMoney(summary.revenue)],
    ["Order lunas", Number(summary.paidOrders) || 0],
    ["Rata-rata transaksi", dashboardMoney(summary.averageOrder)],
    ["Order dibatalkan", Number(summary.cancelledOrders) || 0]
  ];
  document.querySelector("#sales-report-summary").innerHTML = metrics.map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${dashboardEsc(value)}</strong></article>`).join("");
  const paymentRows = report.byPaymentMethod || [];
  document.querySelector("#payment-method-report").innerHTML = paymentRows.length ? `<ul class="report-list">${paymentRows.map(row => `<li><span>${dashboardEsc(row.paymentMethod)}</span><b>${Number(row.orders)} pesanan · ${dashboardMoney(row.revenue)}</b></li>`).join("")}</ul>` : "Belum ada transaksi.";
  const serviceRows = report.topServices || [];
  document.querySelector("#top-services-report").innerHTML = serviceRows.length ? `<ul class="report-list">${serviceRows.map(row => `<li><span>${dashboardEsc(row.name)}</span><b>${Number(row.sold)} sesi · ${dashboardMoney(row.revenue)}</b></li>`).join("")}</ul>` : "Belum ada layanan terjual.";
  document.querySelector("#sales-daily-report").innerHTML = (report.byDay || []).map(row => `<tr><td>${dashboardEsc(row.date)}</td><td>${Number(row.orders)}</td><td>${dashboardMoney(row.revenue)}</td></tr>`).join("") || '<tr><td colspan="3">Belum ada transaksi pada periode ini.</td></tr>';
}

function auditMetadata(value) {
  if (!value) return "-";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Object.entries(parsed).map(([key, item]) => `${key}: ${typeof item === "object" ? JSON.stringify(item) : item}`).join(" · ") || "-";
  } catch { return "-"; }
}

function renderAuditLogs(result) {
  auditState = { ...auditState, ...result, items: result.items || [] };
  document.querySelector("#audit-table").innerHTML = auditState.items.map(log => {
    const date = new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    const target = log.targetId ? `${log.targetType} #${log.targetId}` : log.targetType;
    return `<tr><td>${dashboardEsc(date)}</td><td>${dashboardEsc(log.actorName)}<small class="table-subline">${dashboardEsc(log.actorEmail)}</small></td><td>${dashboardEsc(log.action)}</td><td>${dashboardEsc(target)}</td><td>${dashboardEsc(auditMetadata(log.metadata))}</td></tr>`;
  }).join("") || '<tr><td colspan="5">Belum ada perubahan tercatat.</td></tr>';
  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  document.querySelector("#audit-page").textContent = `Halaman ${result.page} dari ${totalPages}`;
  document.querySelector("#audit-prev").disabled = result.page <= 1;
  document.querySelector("#audit-next").disabled = result.page >= totalPages;
}

async function loadAuditLogs(page = auditState.page) {
  try { renderAuditLogs(await api.admin.auditLogs(page)); }
  catch (error) { document.querySelector("#audit-message").textContent = error.message; }
}

async function loadSalesReport() {
  const form = document.querySelector("#sales-report-form");
  const values = Object.fromEntries(new FormData(form));
  const message = document.querySelector("#sales-report-message");
  message.textContent = "Memuat laporan…";
  try {
    renderSalesReport(await api.admin.salesReport(values.from, values.to));
    message.textContent = "Laporan diperbarui.";
  } catch (error) { message.textContent = error.message; }
}

async function loadNewsletterSubscribers(page = newsletterState.page) {
  const result = await api.admin.newsletterSubscribers(newsletterState.q, page);
  renderNewsletterSubscribers(result);
}

function renderServices(products) {
  dashboardProducts = products;
  document.querySelector("#service-count").textContent = `${products.length} layanan`;
  document.querySelector("#services-empty").hidden = products.length > 0;
  document.querySelector("#services-table").innerHTML = products.slice(0, 50).map(product => `<tr><td>${dashboardEsc(product.name)}</td><td>${dashboardEsc(product.category)}</td><td>${Number(product.durationMinutes) || 0} menit</td><td>${dashboardMoney(product.price)}</td><td>${product.isActive ? "Aktif" : "Nonaktif"}</td><td class="table-actions">${dashboardIconButton("edit", `Edit layanan ${dashboardEsc(product.name)}`, "data-edit-service", product.id)}${dashboardIconButton("delete", `Hapus layanan ${dashboardEsc(product.name)}`, "data-delete-service", product.id, true)}</td></tr>`).join("");
}

function renderCategories(categories) {
  dashboardCategories = categories;
  document.querySelector("#categories-table").innerHTML = categories.map(category => `<tr><td>${dashboardEsc(category.name)}</td><td>${dashboardEsc(category.slug)}</td><td>${Number(category.productCount) || 0}</td><td class="table-actions">${dashboardIconButton("edit", `Edit ${dashboardEsc(category.name)}`, "data-category-edit", category.id)}${dashboardIconButton("delete", `Hapus ${dashboardEsc(category.name)}`, "data-category-delete", category.id, true)}</td></tr>`).join("") || '<tr><td colspan="4">Belum ada kategori.</td></tr>';
}

function openCategoryForm(category = null) {
  const form = document.querySelector("#category-form");
  form.reset();
  form.elements.id.value = category?.id || "";
  form.elements.name.value = category?.name || "";
  form.elements.slug.value = category?.slug || "";
  document.querySelector("#category-form-title").textContent = category ? `Edit ${category.name}` : "Tambah kategori";
  document.querySelector("#category-message").textContent = "";
  document.querySelector("#categories-list").hidden = true;
  form.hidden = false;
  form.elements.name.focus();
}

function renderUsers(users) {
  if (!Array.isArray(users)) throw new Error("Format data pengguna tidak valid.");
  dashboardUsers = users;
  document.querySelector("#user-count").textContent = `${users.length} akun`;
  document.querySelector("#users-empty").hidden = users.length > 0;
  document.querySelector("#users-table").innerHTML = users.map(user => {
    const registeredDate = user.createdAt ? new Date(user.createdAt) : null;
    const registeredAt = !registeredDate || Number.isNaN(registeredDate.getTime())
      ? "-"
      : registeredDate.toLocaleDateString("id-ID", { dateStyle: "medium" });
    const roleControl = Number(user.id) === currentAdminId
      ? '<span class="role-badge">Admin (Anda)</span>'
      : `<select data-user-role="${Number(user.id)}" aria-label="Peran ${dashboardEsc(user.name)}"><option value="user" ${user.role === "user" ? "selected" : ""}>Pengguna</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option></select>`;
    const editButton = dashboardUserActionButton("edit", "Edit", "data-user-edit", user.id);
    const passwordButton = dashboardIconButton("key", `Ganti password ${dashboardEsc(user.name)}`, "data-user-password", user.id);
    const deleteButton = Number(user.id) === currentAdminId ? "" : dashboardUserActionButton("delete", "Hapus", "data-user-delete", user.id, true);
    const currentUserRow = Number(user.id) === currentAdminId ? ' class="is-current-user"' : "";
    return `<tr${currentUserRow}><td>${dashboardEsc(user.name)}</td><td>${dashboardEsc(user.email)}</td><td>${dashboardEsc(user.phone || "-")}</td><td>${roleControl}</td><td>${Number(user.totalOrders) || 0}</td><td>${dashboardEsc(registeredAt)}</td><td class="table-actions">${editButton}${passwordButton}${deleteButton}</td></tr>`;
  }).join("");
}

function renderReviews(reviews) {
  document.querySelector("#reviews-empty").hidden = reviews.length > 0;
  document.querySelector("#reviews-table").innerHTML = reviews.map(review => `<tr><td>${dashboardEsc(review.customerName)}</td><td>${dashboardEsc(review.orderCode)}</td><td>${"★".repeat(Number(review.rating))}</td><td>${dashboardEsc(review.comment || "-")}</td><td>${review.isPublished ? "Terbit" : "Menunggu"}</td><td><button class="icon-button" type="button" data-review-toggle="${review.id}" data-review-published="${review.isPublished ? "1" : "0"}" aria-label="${review.isPublished ? "Sembunyikan" : "Terbitkan"} ulasan" title="${review.isPublished ? "Sembunyikan" : "Terbitkan"}">${review.isPublished ? "−" : "✓"}</button></td></tr>`).join("");
}

async function refreshReviews() {
  try { renderReviews(await api.admin.reviews()); }
  catch (error) { document.querySelector("#reviews-message").textContent = error.message; }
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
  const refreshButton = document.querySelector("#refresh-dashboard");
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.classList.add("is-loading");
  }
  dashboardMessage.textContent = "Memuat data dashboard…";
  // Muat pengguna secara mandiri. Kegagalan modul dashboard lain tidak boleh
  // membuat tabel pengguna terlihat kosong tanpa penjelasan.
  try {
    renderUsers(await api.admin.users());
    setUsersMessage("");
  } catch (error) {
    const fallbackUser = currentAdmin ? [{ ...currentAdmin, totalOrders: 0, createdAt: null }] : [];
    renderUsers(fallbackUser);
    setUsersMessage(`Daftar pengguna belum dapat dimuat: ${error.message}`, "error");
  }

  // Ringkasan dan katalog adalah konten utama dashboard. Muat keduanya
  // terpisah dari modul tambahan agar kegagalan satu fitur tidak membuat
  // statistik dan daftar layanan ikut kosong.
  try {
    const [stats, products, categories] = await Promise.all([
      api.admin.stats(), api.admin.products(), api.admin.categories()
    ]);
    renderMetrics(stats);
    renderServices(products);
    renderServiceCategories(categories);
    renderCategories(categories);
  } catch (error) {
    dashboardMessage.textContent = `Ringkasan atau katalog belum dapat dimuat: ${error.message}`;
    if (refreshButton) { refreshButton.disabled = false; refreshButton.classList.remove("is-loading"); }
    return;
  }

  try {
    const [orders, siteContent, changeRequests, coupons, scheduleSettings, subscribers, auditLogs, therapists] = await Promise.all([
      api.admin.orders(), api.admin.siteContent(), api.admin.orderChangeRequests(),
      api.admin.coupons(), api.admin.scheduleSettings(), api.admin.newsletterSubscribers(),
      api.admin.auditLogs(), api.admin.therapists()
    ]);
    renderOrders(orders);
    renderChangeRequests(changeRequests);
    renderCoupons(coupons);
    renderScheduleSettings(scheduleSettings);
    renderNewsletterSubscribers(subscribers);
    renderAuditLogs(auditLogs);
    renderTherapists(therapists);
    try { renderReviews(await api.admin.reviews()); }
    catch { document.querySelector("#reviews-table").innerHTML = ""; document.querySelector("#reviews-empty").hidden = false; }
    Object.entries(siteContent).forEach(([name, value]) => {
      const field = document.querySelector(`#site-content-form [name="${name}"]`);
      if (field) field.value = value || "";
    });
    await renderAdminAnnouncements();
    dashboardMessage.textContent = "Data terbaru berhasil dimuat.";
  } catch (error) {
    dashboardMessage.textContent = `Ringkasan dan katalog sudah dimuat, tetapi sebagian modul lain gagal: ${error.message}`;
  }
  const updated = document.querySelector("#summary-updated");
  if (updated) updated.textContent = `Terakhir diperbarui ${new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`;
  if (refreshButton) {
    refreshButton.disabled = false;
    refreshButton.classList.remove("is-loading");
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
  let user;
  try {
    user = await api.me();
  } catch {
    dashboardContent.hidden = true;
    accessMessage.hidden = false;
    document.querySelector("#access-title").textContent = "Silakan masuk untuk melanjutkan.";
    document.querySelector("#access-copy").textContent = "Masuk menggunakan akun admin, lalu buka dashboard dari menu akun.";
    return;
  }

  if (user.role !== "admin") {
    dashboardContent.hidden = true;
    accessMessage.hidden = false;
    document.querySelector("#access-title").textContent = "Dashboard hanya untuk admin.";
    return;
  }

  document.querySelector("#admin-name").textContent = user.name;
  currentAdminId = Number(user.id);
  currentAdmin = user;
  document.querySelector("#current-user-name").textContent = user.name;
  document.querySelector("#current-user-email").textContent = user.email;
  document.querySelector("#current-user-card").hidden = false;
  dashboardContent.hidden = false;
  const reportForm = document.querySelector("#sales-report-form");
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(today.getDate() - 29);
  reportForm.elements.from.value = dateInputValue(monthAgo);
  reportForm.elements.to.value = dateInputValue(today);

  try {
    await refreshDashboard();
    await loadSalesReport();
    window.setInterval(() => {
      if (!document.hidden) refreshReviews();
    }, 15000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshReviews();
    });
  } catch (error) {
    dashboardMessage.textContent = `Akun tetap masuk, tetapi sebagian data gagal dimuat: ${error.message}`;
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
  const cancelButton = event.target.closest("[data-cancel-order]");
  const deleteButton = event.target.closest("[data-delete-order]");
  const button = cancelButton || deleteButton;
  if (!button) return;
  const confirmation = deleteButton
    ? "Hapus permanen pesanan yang dibatalkan ini? Tindakan ini tidak dapat dikembalikan."
    : "Batalkan pesanan ini dan kembalikan stok?";
  if (!window.confirm(confirmation)) return;
  button.disabled = true;
  try {
    if (deleteButton) await api.admin.deleteOrder(deleteButton.dataset.deleteOrder);
    else await api.admin.cancelOrder(cancelButton.dataset.cancelOrder);
    await refreshDashboard();
  } catch (error) {
    dashboardMessage.textContent = error.message;
    button.disabled = false;
  }
});
document.querySelector("#change-requests-table").addEventListener("click", async event => {
  const approve = event.target.closest("[data-change-approve]");
  const reject = event.target.closest("[data-change-reject]");
  const button = approve || reject;
  if (!button) return;
  const requestId = Number(approve?.dataset.changeApprove || reject?.dataset.changeReject);
  const request = dashboardChangeRequests.find(item => Number(item.id) === requestId);
  const decision = approve ? "approve" : "reject";
  const action = approve ? "menyetujui" : "menolak";
  if (!request || !window.confirm(`Yakin ${action} permintaan untuk ${request.orderCode}?`)) return;
  button.disabled = true;
  const message = document.querySelector("#change-requests-message");
  message.textContent = "Memproses permintaan…";
  try {
    const result = await api.admin.reviewOrderChangeRequest(requestId, { decision });
    message.textContent = result.message;
    message.className = "section-message is-success";
    await refreshDashboard();
  } catch (error) {
    message.textContent = error.message;
    message.className = "section-message is-error";
    button.disabled = false;
  }
});
document.querySelector("#schedule-settings-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const payload = {
    openTime: values.openTime,
    closeTime: values.closeTime,
    slotIntervalMinutes: Number(values.slotIntervalMinutes),
    bufferMinutes: Number(values.bufferMinutes),
    advanceDays: Number(values.advanceDays),
    operatingDays: [...form.querySelectorAll('[name="operatingDays"]:checked')].map(input => Number(input.value))
  };
  const message = document.querySelector("#schedule-settings-message");
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  message.textContent = "Menyimpan pengaturan…";
  try {
    const result = await api.admin.updateScheduleSettings(payload);
    renderScheduleSettings(result);
    message.textContent = result.message;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
const therapistForm = document.querySelector("#therapist-form");
document.querySelector("#add-therapist-button").addEventListener("click", () => openTherapistForm());
document.querySelector("#cancel-therapist").addEventListener("click", () => { therapistForm.hidden = true; });
therapistForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(therapistForm));
  const payload = { name: values.name, phone: values.phone, isActive: values.isActive === "true" };
  const message = document.querySelector("#therapist-message");
  try {
    if (values.id) await api.admin.updateTherapist(values.id, payload);
    else await api.admin.createTherapist(payload);
    therapistForm.hidden = true;
    renderTherapists(await api.admin.therapists());
  } catch (error) { message.textContent = error.message; }
});
document.querySelector("#therapists-table").addEventListener("click", async event => {
  const edit = event.target.closest("[data-therapist-edit]");
  const remove = event.target.closest("[data-therapist-delete]");
  const id = Number(edit?.dataset.therapistEdit || remove?.dataset.therapistDelete);
  const therapist = dashboardTherapists.find(item => Number(item.id) === id);
  if (edit && therapist) return openTherapistForm(therapist);
  if (!remove || !therapist || !window.confirm(`Hapus ${therapist.name}?`)) return;
  remove.disabled = true;
  try { await api.admin.deleteTherapist(id); renderTherapists(await api.admin.therapists()); }
  catch (error) { document.querySelector("#schedule-settings-message").textContent = error.message; remove.disabled = false; }
});
document.querySelector("#sales-report-form").addEventListener("submit", async event => { event.preventDefault(); await loadSalesReport(); });
document.querySelector("#export-sales-report").addEventListener("click", () => {
  if (!latestSalesReport) return;
  const rows = latestSalesReport.byDay || [];
  downloadSpreadsheet(`laporan-penjualan-${latestSalesReport.period.from}-${latestSalesReport.period.to}.xls`, {
    title: "Laporan Penjualan",
    sheetName: "Penjualan",
    columns: [
      { title: "Tanggal", width: 115 },
      { title: "Jumlah pesanan", width: 125, style: "number" },
      { title: "Omzet terkonfirmasi (Rp)", width: 190, style: "currency" }
    ],
    metadata: [["Periode", `${latestSalesReport.period.from} s.d. ${latestSalesReport.period.to}`]],
    rows: rows.map(row => [row.date, Number(row.orders) || 0, Number(row.revenue) || 0])
  });
});
document.querySelector("#audit-prev").addEventListener("click", () => loadAuditLogs(Math.max(1, auditState.page - 1)));
document.querySelector("#audit-next").addEventListener("click", () => loadAuditLogs(auditState.page + 1));
document.querySelector("#subscriber-search-button").addEventListener("click", async () => {
  newsletterState.q = document.querySelector("#subscriber-search").value.trim();
  newsletterState.page = 1;
  try { await loadNewsletterSubscribers(1); }
  catch (error) { document.querySelector("#newsletter-message").textContent = error.message; }
});
document.querySelector("#subscriber-search").addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); document.querySelector("#subscriber-search-button").click(); }
});
document.querySelector("#subscriber-prev").addEventListener("click", () => loadNewsletterSubscribers(Math.max(1, newsletterState.page - 1)));
document.querySelector("#subscriber-next").addEventListener("click", () => loadNewsletterSubscribers(newsletterState.page + 1));
document.querySelector("#subscribers-table").addEventListener("click", async event => {
  const button = event.target.closest("[data-subscriber-delete]");
  if (!button) return;
  const subscriber = newsletterState.items.find(item => Number(item.id) === Number(button.dataset.subscriberDelete));
  if (!subscriber || !window.confirm(`Hapus ${subscriber.email} dari newsletter?`)) return;
  button.disabled = true;
  try {
    const result = await api.admin.removeNewsletterSubscriber(subscriber.id);
    document.querySelector("#newsletter-message").textContent = result.message;
    const page = newsletterState.items.length === 1 && newsletterState.page > 1 ? newsletterState.page - 1 : newsletterState.page;
    await loadNewsletterSubscribers(page);
  } catch (error) { document.querySelector("#newsletter-message").textContent = error.message; button.disabled = false; }
});
document.querySelector("#export-subscribers").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  const message = document.querySelector("#newsletter-message");
  message.textContent = "Menyiapkan file Excel…";
  try {
    const first = await api.admin.newsletterSubscribers(newsletterState.q, 1, 200);
    const pages = Math.ceil(first.total / first.limit);
    const results = [first, ...await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => api.admin.newsletterSubscribers(newsletterState.q, index + 2, 200)))];
    const subscribers = results.flatMap(result => result.items);
    const filter = newsletterState.q || "Semua subscriber";
    downloadSpreadsheet("subscriber-newsletter.xls", {
      title: "Daftar Subscriber Newsletter",
      sheetName: "Subscriber",
      columns: [
        { title: "No.", width: 50, style: "number" },
        { title: "Email", width: 270 },
        { title: "Tanggal terdaftar", width: 180 }
      ],
      metadata: [["Filter", filter], ["Total subscriber", subscribers.length]],
      rows: subscribers.map((item, index) => [index + 1, item.email, new Date(item.createdAt).toLocaleString("id-ID")])
    });
    message.textContent = `${subscribers.length} subscriber diekspor.`;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
const couponForm = document.querySelector("#coupon-form");
document.querySelector("#add-coupon-button").addEventListener("click", () => openCouponForm());
document.querySelector("#cancel-coupon").addEventListener("click", () => { couponForm.hidden = true; });
couponForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(couponForm));
  const payload = {
    code: values.code,
    discountType: values.discountType,
    discountValue: Number(values.discountValue),
    minimumOrder: Number(values.minimumOrder),
    usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
    startsAt: values.startsAt || null,
    endsAt: values.endsAt || null,
    isActive: values.isActive === "true"
  };
  const message = document.querySelector("#coupon-message");
  const button = couponForm.querySelector("[type=submit]");
  button.disabled = true;
  message.textContent = "Menyimpan voucher…";
  try {
    if (values.id) await api.admin.updateCoupon(values.id, payload);
    else await api.admin.createCoupon(payload);
    couponForm.hidden = true;
    renderCoupons(await api.admin.coupons());
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
document.querySelector("#coupons-table").addEventListener("click", async event => {
  const edit = event.target.closest("[data-coupon-edit]");
  const remove = event.target.closest("[data-coupon-delete]");
  const couponId = Number(edit?.dataset.couponEdit || remove?.dataset.couponDelete);
  const coupon = dashboardCoupons.find(item => Number(item.id) === couponId);
  if (edit && coupon) return openCouponForm(coupon);
  if (!remove || !coupon || !window.confirm(`Hapus voucher ${coupon.code}?`)) return;
  remove.disabled = true;
  try { await api.admin.deleteCoupon(couponId); renderCoupons(await api.admin.coupons()); }
  catch (error) { dashboardMessage.textContent = error.message; remove.disabled = false; }
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
document.querySelector("#reviews-table").addEventListener("click", async event => {
  const button = event.target.closest("[data-review-toggle]");
  if (!button) return;
  button.disabled = true;
  try {
    const isPublished = button.dataset.reviewPublished !== "1";
    await api.admin.moderateReview(button.dataset.reviewToggle, isPublished);
    renderReviews(await api.admin.reviews());
    document.querySelector("#reviews-message").textContent = isPublished ? "Ulasan berhasil diterbitkan." : "Ulasan berhasil disembunyikan.";
  } catch (error) {
    document.querySelector("#reviews-message").textContent = error.message;
    button.disabled = false;
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
    if (!user) return;
    const relatedDataWarning = Number(user.totalOrders) > 0
      ? `\n\n${Number(user.totalOrders)} pesanan dan seluruh data akun yang terkait juga akan dihapus.`
      : "";
    if (!window.confirm(`Hapus akun ${user.name}?${relatedDataWarning}\n\nTindakan ini tidak dapat dibatalkan.`)) return;
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
const categoryForm = document.querySelector("#category-form");
const categoriesList = document.querySelector("#categories-list");
document.querySelector("#add-category-button").addEventListener("click", () => openCategoryForm());
document.querySelector("#cancel-category").addEventListener("click", () => {
  categoryForm.hidden = true;
  categoriesList.hidden = false;
});
categoryForm.addEventListener("submit", async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(categoryForm));
  const message = document.querySelector("#category-message");
  try {
    if (values.id) await api.admin.updateCategory(values.id, { name: values.name, slug: values.slug });
    else await api.admin.createCategory({ name: values.name, slug: values.slug });
    categoryForm.hidden = true;
    categoriesList.hidden = false;
    const categories = await api.admin.categories();
    renderCategories(categories);
    renderServiceCategories(categories);
  } catch (error) { message.textContent = error.message; }
});
document.querySelector("#categories-table").addEventListener("click", async event => {
  const edit = event.target.closest("[data-category-edit]");
  const remove = event.target.closest("[data-category-delete]");
  const id = Number(edit?.dataset.categoryEdit || remove?.dataset.categoryDelete);
  const category = dashboardCategories.find(item => Number(item.id) === id);
  if (edit && category) return openCategoryForm(category);
  if (!remove || !category || !window.confirm(`Hapus kategori ${category.name}?`)) return;
  remove.disabled = true;
  try {
    await api.admin.deleteCategory(id);
    const categories = await api.admin.categories();
    renderCategories(categories);
    renderServiceCategories(categories);
  } catch (error) { document.querySelector("#category-message").textContent = error.message; remove.disabled = false; }
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  await api.logout();
  window.location.href = "/";
});
document.querySelector("#refresh-dashboard").addEventListener("click", refreshDashboard);
setupPasswordToggles();
initDashboard();
