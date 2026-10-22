const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
let currentUser = null;
const whatsappNumber = "6289634208909";
const scheduleSelection = { date: "", time: "" };
let paymentPollTimer = null;
let activeOrderId = null;
const claimedCouponKey = "aera_claimed_coupon";

function getClaimedCoupon() {
  try { return localStorage.getItem(claimedCouponKey) || ""; }
  catch { return ""; }
}

function saveClaimedCoupon(code) {
  try { localStorage.setItem(claimedCouponKey, code); }
  catch { /* Checkout tetap bisa diisi pada sesi halaman saat ini. */ }
}

function couponDiscountLabel(coupon) {
  return coupon.discountType === "percent"
    ? `${Number(coupon.discountValue)}%`
    : rupiah(coupon.discountValue);
}

async function loadCoupons() {
  const section = document.querySelector("#voucher-promo");
  const container = document.querySelector("#public-coupons");
  if (!section || !container) return;
  try {
    const coupons = await api.coupons();
    if (!coupons.length) {
      try { localStorage.removeItem(claimedCouponKey); } catch { /* Penyimpanan browser mungkin dinonaktifkan. */ }
      section.remove();
      return;
    }
    let claimedCode = getClaimedCoupon();
    if (claimedCode && !coupons.some(coupon => String(coupon.code) === claimedCode)) {
      try { localStorage.removeItem(claimedCouponKey); } catch { /* Penyimpanan browser mungkin dinonaktifkan. */ }
      claimedCode = "";
    }
    container.innerHTML = coupons.map(coupon => {
      const code = String(coupon.code);
      const claimed = code === claimedCode;
      const minimum = Number(coupon.minimumOrder) > 0 ? `Min. transaksi ${rupiah(coupon.minimumOrder)}` : "Tanpa minimum transaksi";
      const expiry = coupon.endsAt ? `Berlaku hingga ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(coupon.endsAt))}` : "Tanpa batas waktu";
      return `<article class="voucher-card${claimed ? " is-claimed" : ""}"><div class="voucher-card__discount"><strong>${esc(couponDiscountLabel(coupon))}</strong><span>diskon</span></div><div class="voucher-card__copy"><span class="voucher-card__code">${esc(code)}</span><h3>Voucher perawatan Aera</h3><p>${esc(minimum)} · ${esc(expiry)}</p></div><button class="button button--primary voucher-claim" type="button" data-coupon-code="${esc(code)}">${claimed ? "Sudah diklaim ✓" : "Klaim voucher"}</button></article>`;
    }).join("");
    container.addEventListener("click", event => {
      const button = event.target.closest("[data-coupon-code]");
      if (!button) return;
      const code = button.dataset.couponCode;
      saveClaimedCoupon(code);
      container.querySelectorAll(".voucher-card").forEach(card => {
        const cardButton = card.querySelector("[data-coupon-code]");
        const selected = cardButton.dataset.couponCode === code;
        card.classList.toggle("is-claimed", selected);
        cardButton.textContent = selected ? "Sudah diklaim ✓" : "Klaim voucher";
      });
      const checkoutCoupon = document.querySelector('#checkout-form [name="couponCode"]');
      if (checkoutCoupon) checkoutCoupon.value = code;
      const message = document.querySelector("#voucher-claim-message");
      message.textContent = `Voucher ${code} berhasil diklaim dan akan otomatis digunakan saat checkout.`;
    });
  } catch {
    section.remove();
  }
}

function setupCurrentDateTime() {
  const dateElement = document.querySelector("#current-date");
  const timeElement = document.querySelector("#current-time");
  if (!dateElement || !timeElement) return;

  const timeZone = "Asia/Jakarta";
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const timeFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone, hour: "2-digit", minute: "2-digit", hour12: false
  });
  const machineDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  });
  const render = () => {
    const now = new Date();
    dateElement.textContent = dateFormatter.format(now);
    dateElement.dateTime = machineDateFormatter.format(now);
    timeElement.textContent = `${timeFormatter.format(now)} WIB`;
  };

  render();
  window.setInterval(render, 30_000);
}

function getScheduleTimes(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Array.from({ length: 9 }, (_, index) => index + 9).filter(hour => {
    const slot = new Date(date);
    slot.setHours(hour, 0, 0, 0);
    return slot > new Date();
  }).map(hour => `${String(hour).padStart(2, "0")}:00`);
}

function getScheduleDateOptions() {
  const formatter = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" });
  return Array.from({ length: 14 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { value, label: formatter.format(date) };
  }).filter(option => getScheduleTimes(option.value).length > 0);
}

function setupSchedulePicker() {
  const dateSelect = document.querySelector("#schedule-date");
  const timesContainer = document.querySelector("#schedule-times");
  const summary = document.querySelector("#schedule-summary");
  if (!dateSelect || !timesContainer || !summary) return;

  const dateOptions = getScheduleDateOptions();
  dateSelect.innerHTML = dateOptions.map(option => `<option value="${option.value}">${esc(option.label)}</option>`).join("");
  dateSelect.value = dateOptions.some(option => option.value === scheduleSelection.date) ? scheduleSelection.date : dateOptions[0].value;

  const renderTimes = () => {
    const times = getScheduleTimes(dateSelect.value);
    scheduleSelection.date = dateSelect.value;
    scheduleSelection.time = times.includes(scheduleSelection.time) ? scheduleSelection.time : times[0];
    timesContainer.innerHTML = times.map(time => `<button class="schedule-time${time === scheduleSelection.time ? " is-selected" : ""}" type="button" data-schedule-time="${time}" aria-pressed="${time === scheduleSelection.time}">${time.replace(":", ".")}</button>`).join("");
    timesContainer.querySelectorAll("[data-schedule-time]").forEach(button => button.addEventListener("click", () => {
      scheduleSelection.time = button.dataset.scheduleTime;
      renderTimes();
    }));
    const selectedDate = dateOptions.find(option => option.value === scheduleSelection.date);
    summary.textContent = `Pilihan Anda: ${selectedDate?.label || ""} pukul ${scheduleSelection.time.replace(":", ".")}`;
  };

  dateSelect.addEventListener("change", renderTimes);
  renderTimes();
}

async function loadSiteContent() {
  const content = await api.siteContent();
  const set = (selector, value) => { const element = document.querySelector(selector); if (element && value) element.textContent = value; };
  set("#services-title", content.servicesTitle); set("#services-intro", content.servicesIntro);
  set("#about-label", content.aboutLabel); set("#about-title", content.aboutTitle); set("#about-text", content.aboutText);
  const image = document.querySelector("#about-image"); if (image && content.aboutImage) image.src = content.aboutImage;
}

async function loadStore() {
  try {
    const products = await api.products();
    document.querySelector("#products").innerHTML = products.length ? products.map(p => `<article class="store-card"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div><span class="store-card__tag">${esc(p.category || "Layanan")}</span><h3>${esc(p.name)}</h3>${p.durationMinutes ? `<small class="store-card__duration">${Number(p.durationMinutes)} menit</small>` : ""}<p>${esc(p.description || "Sesi perawatan lembut untuk bayi dan keluarga.")}</p><div class="service-like-row"><strong>${rupiah(p.price)}</strong><button class="service-like${p.likedByMe ? " is-active" : ""}" data-like="${p.id}" type="button" aria-label="${p.likedByMe ? "Batalkan suka" : "Sukai"} ${esc(p.name)}" aria-pressed="${p.likedByMe ? "true" : "false"}" title="${p.likedByMe ? "Batalkan suka" : "Sukai layanan"}"><span aria-hidden="true">${p.likedByMe ? "♥" : "♡"}</span><span data-like-count>${Number(p.likeCount) || 0}</span></button></div><button class="button button--primary add-cart" data-id="${p.id}">Tambah ke keranjang</button></div></article>`).join("") : `<div class="store-empty"><p>Jadwal layanan sedang disiapkan. Hubungi kami untuk menanyakan sesi dan tarif.</p><a class="button button--primary" href="https://wa.me/${whatsappNumber}?text=Halo%20Aera%20Baby%20Spa%2C%20saya%20ingin%20bertanya%20tentang%20jadwal%20dan%20tarif%20pijat%20bayi." target="_blank" rel="noopener">Tanya via WhatsApp</a></div>`;
    document.querySelectorAll(".add-cart").forEach(button => button.addEventListener("click", async () => {
      if (button.disabled) return;
      const originalLabel = button.textContent;
      button.disabled = true;
      try {
        await api.addToCart(button.dataset.id);
        await renderCart();
        button.textContent = "Ditambahkan ✓";
      } catch (error) {
        alert(error.message);
        button.textContent = originalLabel;
      } finally {
        button.disabled = false;
      }
    }));
    document.querySelectorAll("[data-like]").forEach(button => button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        const result = await api.likeProduct(button.dataset.like);
        button.classList.toggle("is-active", result.likedByMe);
        button.setAttribute("aria-pressed", String(result.likedByMe));
        button.setAttribute("aria-label", `${result.likedByMe ? "Batalkan suka" : "Sukai"} ${products.find(product => product.id === result.productId)?.name || "layanan"}`);
        button.title = result.likedByMe ? "Batalkan suka" : "Sukai layanan";
        button.querySelector("[aria-hidden]").textContent = result.likedByMe ? "♥" : "♡";
        button.querySelector("[data-like-count]").textContent = result.likeCount;
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
      }
    }));
  } catch (e) { document.querySelector("#products").innerHTML = `<p class="store-muted">${esc(e.message)} Pastikan server dan database sudah berjalan.</p>`; }

  // Pengumuman bukan prasyarat katalog. Jika modulnya belum dimigrasikan,
  // layanan tetap dapat dipilih dan dipesan.
  try {
    const announcements = await api.announcements();
    document.querySelector("#announcements").innerHTML = announcements.length ? announcements.map(n => `<article class="news-card"><span class="store-card__tag">${esc(n.kind)}</span><h3>${esc(n.title)}</h3><p>${esc(n.excerpt || n.content)}</p></article>`).join("") : '<p class="store-muted">Belum ada berita.</p>';
  } catch (_error) {
    document.querySelector("#announcements").innerHTML = '<p class="store-muted">Pengumuman sedang tidak tersedia.</p>';
  }
}

function paymentInstructions(order) {
  const deadline = order.paymentDueAt
    ? new Date(order.paymentDueAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "";
  const deadlineCopy = deadline ? `<small class="payment-deadline">Bayar sebelum ${esc(deadline)}. Setelah itu slot dilepas otomatis.</small>` : "";
  if (order.paymentMethod === "QRIS") {
    const hasQrisImage = Boolean(order.paymentDetails?.qrisImageUrl);
    const automatic = order.paymentDetails?.qrisAutomatic === true;
    const qrisImage = hasQrisImage ? `<img class="qris-code qris-code--image${automatic ? "" : " qris-code--static"}" src="${esc(order.paymentDetails.qrisImageUrl)}" alt="Barcode QRIS Aera Baby Spa">` : `<div class="qris-code" aria-label="Penanda QRIS belum dikonfigurasi"><span>QRIS</span><small>Belum diatur</small></div>`;
    const message = hasQrisImage
      ? automatic ? "Scan QR ini dengan aplikasi pembayaran Anda. Nominal sudah terisi otomatis." : `Scan QR ini, lalu masukkan nominal tepat sebesar ${rupiah(order.total)}.`
      : "Gambar QRIS belum tersedia. Hubungi petugas.";
    const confirmation = automatic
      ? '<small class="payment-auto-status">Status pembayaran diperiksa otomatis…</small>'
      : `<form class="payment-proof-form" data-proof-order="${Number(order.id)}"><label>Bukti pembayaran QRIS<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label><button class="button button--primary" type="submit">Kirim bukti pembayaran</button><small role="status">Setelah dikirim, pembayaran akan diverifikasi admin.</small></form>`;
    return `<div class="payment-instructions payment-instructions--qris">${qrisImage}<div><strong>Bayar ${rupiah(order.total)}</strong><p>${message}</p>${deadlineCopy}${confirmation}</div></div>`;
  }
  if (order.paymentMethod === "Transfer Bank") {
    const details = order.paymentDetails || {};
    return `<div class="payment-instructions"><div><strong>Transfer ${esc(details.bankName || "Bank Mandiri")}</strong><p>No. rekening: <b>${esc(details.bankAccountNumber || "9000050103739")}</b><br>a.n. <b>${esc(details.bankAccountHolder || "HAFSAH QUROTUN AINI")}</b><br>Transfer tepat sebesar: <b>${rupiah(order.total)}</b></p>${deadlineCopy}<form class="payment-proof-form" data-proof-order="${Number(order.id)}"><label>Bukti transfer<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label><button class="button button--primary" type="submit">Kirim bukti transfer</button><small role="status">JPEG, PNG, atau WEBP maksimal 5 MB. Status akan menjadi “Menunggu verifikasi”.</small></form></div></div>`;
  }
  return `<div class="payment-instructions"><div><strong>Bayar tunai</strong><p>Siapkan <b>${rupiah(order.total)}</b> dan lakukan pembayaran kepada petugas saat sesi berlangsung.</p></div></div>`;
}

function paymentMethodNotice(method) {
  if (method === "QRIS") {
    return '<strong>Pembayaran QRIS</strong><span>QR code ditampilkan setelah pesanan dikirim. Ikuti petunjuk konfirmasi yang muncul bersama QR.</span>';
  }
  if (method === "Transfer Bank") {
    return '<strong>Transfer bank</strong><span>Setelah transfer, unggah foto bukti pembayaran untuk diverifikasi admin.</span>';
  }
  if (method === "Tunai") {
    return '<strong>Pembayaran tunai</strong><span>Bayar langsung kepada petugas saat sesi di studio.</span>';
  }
  return '<span>Pilih metode pembayaran untuk melihat petunjuknya.</span>';
}

function bindPaymentProofForms(root) {
  root.querySelectorAll(".payment-proof-form").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const status = form.querySelector('[role="status"]');
    const file = form.elements.image.files[0];
    if (!file) { status.textContent = "Pilih gambar bukti pembayaran terlebih dahulu."; return; }
    if (file.size > 5 * 1024 * 1024) { status.textContent = "Ukuran gambar terlalu besar. Maksimal 5 MB."; return; }
    button.disabled = true;
    status.textContent = "Mengirim bukti pembayaran…";
    try { await api.uploadPaymentProof(form.dataset.proofOrder, file); await renderOrderHistory(); }
    catch (error) { status.textContent = error.message; button.disabled = false; }
  }));
}

function invoiceMarkup(order) {
  const items = (order.items || []).map(item => `<li><span>${esc(item.name)} × ${Number(item.qty)}</span><b>${rupiah(item.lineTotal ?? item.price * item.qty)}</b></li>`).join("");
  const finalInvoice = ["Dibayar", "Dikembalikan"].includes(order.paymentStatus);
  const completionNote = order.appointmentStatus === "Selesai"
    ? `<div class="order-completion-note" role="status"><span>Keterangan</span><strong>Pelayanan telah selesai</strong><p>Pesanan ini sudah selesai diproses. Terima kasih telah menggunakan layanan Aera Baby Spa.</p></div>`
    : "";
  const review = currentUser && order.status === "Selesai" && order.appointmentStatus === "Selesai"
    ? reviewMarkup(order)
    : "";
  return `<article class="invoice" data-invoice="${Number(order.id)}"><div class="invoice__head"><div><span>${finalInvoice ? "INVOICE" : "RINGKASAN BOOKING"}</span><h3>${esc(order.orderCode)}</h3></div><b class="payment-badge ${order.paymentStatus === "Dibayar" ? "is-paid" : ""}">${esc(order.paymentStatus)}</b></div><ul>${items}</ul><div class="invoice__total"><span>Total</span><b>${rupiah(order.total)}</b></div><p>Metode: ${esc(order.paymentMethod)} · Jadwal: ${esc(order.appointmentDate)} ${esc(order.appointmentTime || "")}</p>${completionNote}${finalInvoice ? window.invoiceExports.actions(order.id) : ""}${review}</article>`;
}

function isActiveOrder(order) {
  const inactivePayments = ["Kedaluwarsa", "Gagal", "Dibatalkan", "Dikembalikan"];
  return order.status !== "Dibatalkan"
    && order.status !== "Selesai"
    && order.appointmentStatus !== "Dibatalkan"
    && order.appointmentStatus !== "Selesai"
    && !inactivePayments.includes(order.paymentStatus);
}

function orderCardMarkup(order) {
  const canRequestChange = isActiveOrder(order) && order.changeRequestStatus !== "Menunggu";
  return `<article class="order-card" data-order-card="${Number(order.id)}"><div><strong>${esc(order.orderCode)}</strong><p>Pasien: <b>${esc(order.patientName || "-")}</b></p><p>${esc(order.status)} · ${esc(order.paymentMethod)} · ${rupiah(order.total)} · <b>${esc(order.paymentStatus)}</b></p><p class="order-therapist"><span>Terapis</span><b>${esc(order.therapistName || "Belum ditetapkan")}</b></p>${order.changeRequestStatus ? `<small>Permintaan ${order.changeRequestType === "cancel" ? "pembatalan" : "ubah jadwal"}: <b>${esc(order.changeRequestStatus)}</b></small>` : ""}</div>${order.paymentStatus === "Menunggu pembayaran" ? paymentInstructions(order) : invoiceMarkup(order)}${canRequestChange ? `<div class="order-change-actions"><button type="button" data-reschedule-order="${order.id}">Ubah jadwal</button><button type="button" data-cancel-request="${order.id}">Ajukan pembatalan</button></div>` : ""}</article>`;
}

function reviewMarkup(order) {
  const orderId = Number(order.id);
  if (order.hasReview) return `<div class="review-section"><p class="review-sent" role="status"><span aria-hidden="true">♥</span> Ulasan sudah dikirim ke admin.</p></div>`;
  const stars = [5, 4, 3, 2, 1].map(value => `<input id="review-${orderId}-${value}" name="rating" type="radio" value="${value}" required><label for="review-${orderId}-${value}" title="${value} bintang"><span aria-hidden="true">★</span><span class="sr-only">${value} bintang</span></label>`).join("");
  return `<div class="review-section"><button class="review-open-button" type="button" data-review-toggle="${orderId}" aria-expanded="false"><span aria-hidden="true">♥</span> Beri ulasan</button><form class="review-form" data-review-form="${orderId}" hidden><div class="review-form__heading"><span class="review-form__heart" aria-hidden="true">♥</span><div><strong>Bagaimana pengalaman Anda?</strong><p>Ulasan hanya dapat dibuat setelah sesi selesai.</p></div></div><fieldset><legend>Pilih rating</legend><div class="review-stars">${stars}</div></fieldset><label class="review-comment">Ceritakan pengalaman Anda <small>(opsional)</small><textarea name="comment" maxlength="1000" rows="4" placeholder="Contoh: Terapis ramah dan pelayanan sangat nyaman untuk si kecil."></textarea></label><div class="review-form__footer"><p role="status" aria-live="polite"></p><button type="submit"><span aria-hidden="true">♥</span> Kirim ulasan</button></div></form></div>`;
}

async function renderOrderHistory() {
  const history = document.querySelector("#riwayat");
  if (!history) return;
  if (paymentPollTimer) { clearTimeout(paymentPollTimer); paymentPollTimer = null; }
  try {
    const orders = await api.orders();
    window.invoiceExports.register(orders.map(order => ({
      ...order,
      recipientName: order.recipientName || currentUser?.name,
      recipientEmail: order.recipientEmail || currentUser?.email
    })));
    history.hidden = false;
    const activeOrders = orders.filter(isActiveOrder);
    const archivedOrders = orders.filter(order => !isActiveOrder(order));
    if (activeOrderId) {
      activeOrders.sort((a, b) => Number(b.id === activeOrderId) - Number(a.id === activeOrderId));
    }
    const customerProfile = currentUser ? await api.profile().catch(() => ({})) : null;
    const profileMarkup = customerProfile ? `<details class="customer-profile"><summary><span>Profil keluarga</span><small>Simpan data bayi untuk booking lebih cepat</small></summary><form id="customer-profile-form" class="checkout-form"><input name="childName" value="${esc(customerProfile.childName || "")}" placeholder="Nama bayi / anak"><label>Tanggal lahir anak<input name="childBirthDate" type="date" value="${esc(customerProfile.childBirthDate || "")}"></label><textarea name="allergies" placeholder="Alergi atau kondisi yang perlu diperhatikan">${esc(customerProfile.allergies || "")}</textarea><textarea name="careNotes" placeholder="Catatan perawatan khusus">${esc(customerProfile.careNotes || "")}</textarea><textarea name="defaultAddress" placeholder="Alamat utama untuk home care">${esc(customerProfile.defaultAddress || "")}</textarea><div class="profile-inline"><input name="defaultCity" value="${esc(customerProfile.defaultCity || "")}" placeholder="Kota"><input name="defaultZip" value="${esc(customerProfile.defaultZip || "")}" placeholder="Kode pos"></div><button class="button button--primary" type="submit">Simpan profil</button><p class="store-muted" role="status"></p></form></details>` : "";
    const activeMarkup = activeOrders.length
      ? activeOrders.map(orderCardMarkup).join("")
      : '<p class="store-muted order-list-empty">Tidak ada pesanan aktif.</p>';
    const archiveMarkup = archivedOrders.length
      ? `<details class="order-archive"><summary>Riwayat pesanan <span>${archivedOrders.length}</span></summary><div class="order-archive__list">${archivedOrders.map(orderCardMarkup).join("")}</div></details>`
      : "";
    history.innerHTML = `${profileMarkup}<div class="order-history__heading"><span class="eyebrow"><i></i> Pesanan aktif</span><h3>Pembayaran &amp; booking Anda</h3><p>Setiap pesanan ditampilkan terpisah dan tidak menggantikan pesanan lainnya.</p></div>${activeMarkup}${archiveMarkup}`;
    history.querySelector("#customer-profile-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector("p");
      message.textContent = "Menyimpan…";
      try { const result = await api.updateProfile(Object.fromEntries(new FormData(form))); message.textContent = result.message; }
      catch (error) { message.textContent = error.message; }
    });
    history.querySelectorAll("[data-cancel-request]").forEach(button => button.addEventListener("click", async () => { if (!confirm("Kirim permintaan pembatalan ke admin?")) return; try { alert((await api.requestOrderChange(button.dataset.cancelRequest, { requestType: "cancel" })).message); } catch (error) { alert(error.message); } }));
    history.querySelectorAll("[data-review-toggle]").forEach(button => button.addEventListener("click", () => {
      const form = history.querySelector(`[data-review-form="${button.dataset.reviewToggle}"]`);
      form.hidden = !form.hidden;
      button.setAttribute("aria-expanded", String(!form.hidden));
      button.innerHTML = form.hidden ? '<span aria-hidden="true">♥</span> Beri ulasan' : "Tutup formulir";
      if (!form.hidden) form.querySelector('input[name="rating"]')?.focus();
    }));
    history.querySelectorAll("[data-review-form]").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      const message = form.querySelector('[role="status"]');
      const data = Object.fromEntries(new FormData(form));
      submitButton.disabled = true;
      message.textContent = "Mengirim ulasan…";
      try {
        const result = await api.createReview(form.dataset.reviewForm, data);
        const section = form.closest(".review-section");
        const toggle = section.querySelector("[data-review-toggle]");
        form.hidden = true;
        toggle.hidden = true;
        section.insertAdjacentHTML("beforeend", `<p class="review-sent" role="status"><span aria-hidden="true">♥</span> ${esc(result.message)}</p>`);
      } catch (error) {
        message.textContent = error.message;
        submitButton.disabled = false;
      }
    }));
    history.querySelectorAll("[data-reschedule-order]").forEach(button => button.addEventListener("click", async () => { const appointmentDate = prompt("Tanggal baru (YYYY-MM-DD):"); const appointmentTime = prompt("Jam baru (HH:MM):"); if (!appointmentDate || !appointmentTime) return; try { alert((await api.requestOrderChange(button.dataset.rescheduleOrder, { requestType: "reschedule", appointmentDate, appointmentTime })).message); } catch (error) { alert(error.message); } }));
    bindPaymentProofForms(history);
    const pendingQris = activeOrders.filter(order => order.paymentMethod === "QRIS" && order.paymentDetails?.qrisAutomatic && order.paymentStatus === "Menunggu pembayaran");
    if (pendingQris.length) {
      paymentPollTimer = setTimeout(async () => {
        const results = await Promise.allSettled(pendingQris.map(order => api.refreshPayment(order.id)));
        const changed = results.some(result => result.status === "fulfilled" && result.value.paymentStatus !== "Menunggu pembayaran");
        if (changed || document.visibilityState === "visible") await renderOrderHistory();
      }, 5000);
    }
  } catch (error) {
    history.hidden = false;
    history.innerHTML = `<p class="store-muted">${esc(error.message)}</p>`;
  }
}

async function renderCart() {
  try {
    const cart = await api.cart();
    const el = document.querySelector("#cart");
    document.querySelector("#cart-count").textContent = cart.totalQty || 0;
    if (!cart.items?.length) {
      el.innerHTML = '<p class="store-muted">Keranjang kosong.</p>';
      await renderOrderHistory();
      return;
    }

    el.innerHTML = `${cart.items.map(item => `<div class="cart-row"><img class="cart-row__image" src="${esc(item.image || "assets/img/bag.svg")}" alt="${esc(item.name)}" loading="lazy"><span>${esc(item.name)}<small>${rupiah(item.price)} per sesi</small></span><strong>${rupiah(item.price * item.qty)}</strong><div class="cart-controls"><button class="cart-minus" data-id="${item.id}" data-qty="${item.qty}" type="button" aria-label="Kurangi jumlah ${esc(item.name)}">−</button><b>${item.qty}</b><button class="cart-plus" data-id="${item.id}" data-qty="${item.qty}" type="button">+</button><button class="cart-remove" data-id="${item.id}" type="button">Hapus</button></div></div>`).join("")}<div class="cart-total"><span>Total layanan</span><strong>${rupiah(cart.subtotal)}</strong></div><form id="checkout-form" class="checkout-form"><h3>Data booking</h3><input name="patientName" placeholder="Nama pasien / anak" autocomplete="off" required><input name="recipientName" placeholder="Nama orang tua" autocomplete="name" required><input name="recipientEmail" type="email" placeholder="Email (opsional)" autocomplete="email"><input name="recipientPhone" type="tel" placeholder="Nomor WhatsApp" autocomplete="tel" required><textarea name="address" placeholder="Alamat lengkap" required></textarea><input name="couponCode" placeholder="Kode voucher (opsional)" autocomplete="off"><select name="shippingMethod"><option value="regular">Sesi di lokasi layanan</option><option value="express">Kunjungan ke rumah</option></select><label>Metode pembayaran<select name="paymentMethod" required><option value="">Pilih metode pembayaran</option><option value="QRIS">QRIS</option><option value="Transfer Bank">Transfer bank</option><option value="Tunai">Tunai saat sesi</option></select></label><p class="payment-note">Tidak perlu membuat akun. Status pesanan disimpan aman di perangkat ini.</p><button class="button button--primary" type="submit">Buat pesanan</button><p id="checkout-message" class="store-muted" role="status" aria-live="polite"></p></form>`;

    el.querySelectorAll(".cart-minus, .cart-plus").forEach(button => button.addEventListener("click", async () => {
      const change = button.classList.contains("cart-plus") ? 1 : -1;
      try { await api.setCartQty(button.dataset.id, Number(button.dataset.qty) + change); await renderCart(); }
      catch (error) { alert(error.message); }
    }));
    el.querySelectorAll(".cart-remove").forEach(button => button.addEventListener("click", async () => {
      try { await api.removeFromCart(button.dataset.id); await renderCart(); }
      catch (error) { alert(error.message); }
    }));
    el.querySelector("#checkout-login")?.addEventListener("click", () => document.querySelector("#login-open").click());
    const form = el.querySelector("#checkout-form");
    if (form) {
      const claimedCoupon = getClaimedCoupon();
      if (claimedCoupon) form.elements.couponCode.value = claimedCoupon;
      const locationSelect = form.querySelector('[name="shippingMethod"]');
      locationSelect.name = "serviceLocation";
      locationSelect.innerHTML = '<option value="studio">Datang ke studio</option><option value="home">Kunjungan ke rumah</option>';
      const paymentSelect = form.querySelector('[name="paymentMethod"]');
      const paymentNotice = document.createElement("p");
      paymentNotice.className = "payment-method-notice";
      paymentNotice.setAttribute("aria-live", "polite");
      paymentSelect.closest("label").after(paymentNotice);
      const renderPaymentNotice = () => {
        paymentNotice.innerHTML = paymentMethodNotice(paymentSelect.value);
      };
      const syncPaymentMethods = () => {
        const cashOption = paymentSelect.querySelector('option[value="Tunai"]');
        cashOption.disabled = locationSelect.value === "home";
        if (cashOption.disabled && paymentSelect.value === "Tunai") paymentSelect.value = "";
        renderPaymentNotice();
      };
      locationSelect.addEventListener("change", syncPaymentMethods);
      paymentSelect.addEventListener("change", renderPaymentNotice);
      syncPaymentMethods();
      const bookingFields = document.createElement("div");
      bookingFields.className = "booking-fields";
      bookingFields.innerHTML = '<label>Hari dan tanggal sesi<select name="appointmentDate" required></select></label><label>Jam sesi<select name="appointmentTime" required></select></label><p class="booking-hours">Pilihan jadwal otomatis tersedia pukul 09.00–17.00.</p>';
      form.querySelector("h3").after(bookingFields);
      const dateSelect = bookingFields.querySelector('[name="appointmentDate"]');
      const timeSelect = bookingFields.querySelector('[name="appointmentTime"]');
      const dateOptions = getScheduleDateOptions();
      dateSelect.innerHTML = dateOptions.map(option => `<option value="${option.value}">${esc(option.label)}</option>`).join("");
      dateSelect.value = dateOptions.some(option => option.value === scheduleSelection.date) ? scheduleSelection.date : dateOptions[0].value;
      const renderTimeOptions = async () => {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Memeriksa ketersediaan…</option>';
        const durationMinutes = cart.items.reduce((total, item) => total + (Number(item.durationMinutes) || 60) * Number(item.qty || 1), 0);
        let serverSlots = null;
        try { serverSlots = (await api.appointmentAvailability(dateSelect.value, durationMinutes)).availableTimes || []; }
        catch { /* Validasi akhir tetap dilakukan server saat checkout. */ }
        const slots = serverSlots || getScheduleTimes(dateSelect.value);
        timeSelect.innerHTML = slots.length
          ? slots.map(time => `<option value="${time}">${time.replace(":", ".")}</option>`).join("")
          : '<option value="">Jadwal penuh</option>';
        timeSelect.value = slots.includes(scheduleSelection.time) ? scheduleSelection.time : slots[0];
        scheduleSelection.date = dateSelect.value;
        scheduleSelection.time = timeSelect.value;
        timeSelect.disabled = slots.length === 0;
      };
      dateSelect.addEventListener("change", () => { renderTimeOptions(); });
      timeSelect.addEventListener("change", () => { scheduleSelection.time = timeSelect.value; });
      renderTimeOptions();
      form.onsubmit = async event => {
      event.preventDefault();
      const message = document.querySelector("#checkout-message");
      const submit = form.querySelector("[type=submit]");
      submit.disabled = true;
      message.textContent = "Membuat pesanan…";
      try {
        const order = await api.createOrder(Object.fromEntries(new FormData(form)));
        api.rememberOrder(order);
        activeOrderId = Number(order.id);
        await renderCart();
        const confirmation = document.createElement("section");
        confirmation.className = "checkout-payment-result";
        confirmation.setAttribute("role", "status");
        confirmation.innerHTML = `<p class="order-confirmation">Pesanan <strong>${esc(order.orderCode)}</strong> berhasil dibuat. Silakan selesaikan pembayaran pada kartu pesanan di bawah.</p>`;
        el.prepend(confirmation);
        document.querySelector(`[data-order-card="${Number(order.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (error) {
        message.textContent = error.message;
        submit.disabled = false;
        submit.textContent = "Coba buat pesanan lagi";
      }
      };
    }
  } catch (error) {
    document.querySelector("#cart").innerHTML = `<p class="store-muted">${esc(error.message)}</p>`;
  }
}
function setupAuth() {
  const modal = document.querySelector("#auth-modal"), form = document.querySelector("#auth-form"), title = document.querySelector("#auth-title");
  const name = document.querySelector("#auth-name"), nameLabel = document.querySelector("#auth-name-label"), msg = document.querySelector("#auth-message");
  const forgotForm = document.querySelector("#forgot-form"), resetForm = document.querySelector("#reset-form");
  const passwordInput = document.querySelector("#auth-password"), passwordToggle = document.querySelector("#toggle-auth-password");
  let mode = "login";
  const showOnly = visible => [form, forgotForm, resetForm].forEach(item => item.hidden = item !== visible);
  const hidePassword = () => { passwordInput.type = "password"; passwordToggle.setAttribute("aria-pressed", "false"); passwordToggle.setAttribute("aria-label", "Lihat password"); };
  const open = m => { mode = m; title.textContent = m === "login" ? "Masuk" : "Daftar akun"; nameLabel.hidden = m === "login"; name.required = m !== "login"; name.disabled = m === "login"; form.password.minLength = m === "login" ? 6 : 12; form.reset(); hidePassword(); msg.textContent = ""; showOnly(form); modal.hidden = false; };
  const openForgot = () => { title.textContent = "Lupa password"; forgotForm.reset(); forgotForm.querySelector("p").textContent = ""; showOnly(forgotForm); modal.hidden = false; };
  const openReset = () => { title.textContent = "Atur ulang password"; resetForm.reset(); resetForm.querySelector("p").textContent = ""; showOnly(resetForm); modal.hidden = false; };
  const loginButton = document.querySelector("#login-open");
  const registerButton = document.querySelector("#register-open");
  if (loginButton) loginButton.onclick = () => open("login");
  if (registerButton) registerButton.onclick = () => open("register");
  document.querySelector("#auth-close").onclick = () => modal.hidden = true;
  passwordToggle.onclick = () => { const visible = passwordInput.type === "password"; passwordInput.type = visible ? "text" : "password"; passwordToggle.setAttribute("aria-pressed", String(visible)); passwordToggle.setAttribute("aria-label", visible ? "Sembunyikan password" : "Lihat password"); passwordInput.focus(); };
  document.querySelector("#forgot-password").onclick = openForgot;
  document.querySelectorAll(".back-to-login").forEach(button => button.onclick = () => open("login"));
  form.onsubmit = async event => { event.preventDefault(); msg.textContent = "Memproses…"; try { const response = mode === "login" ? await api.login(Object.fromEntries(new FormData(form))) : await api.register(Object.fromEntries(new FormData(form))); modal.hidden = true; showUser(response.user); } catch (error) { msg.textContent = error.message; } };
  forgotForm.onsubmit = async event => { event.preventDefault(); const notice = forgotForm.querySelector("p"); notice.textContent = "Mengirim…"; try { const response = await api.requestPasswordReset(Object.fromEntries(new FormData(forgotForm))); notice.textContent = response.message; } catch (error) { notice.textContent = error.message; } };
  resetForm.onsubmit = async event => { event.preventDefault(); const notice = resetForm.querySelector("p"), values = Object.fromEntries(new FormData(resetForm)); if (values.newPassword !== values.confirmPassword) return notice.textContent = "Konfirmasi password tidak sama."; notice.textContent = "Menyimpan…"; try { const response = await api.resetPassword({ token: new URLSearchParams(location.search).get("reset"), newPassword: values.newPassword }); notice.textContent = response.message; history.replaceState({}, "", location.pathname); setTimeout(() => open("login"), 1200); } catch (error) { notice.textContent = error.message; } };
  api.me().then(showUser).catch(() => {});
  const query = new URLSearchParams(location.search); if (query.has("reset")) openReset(); else if (query.has("login")) open("login");
}
function showUser(user) {
  currentUser = user;
  const loginButton = document.querySelector("#login-open");
  const registerButton = document.querySelector("#register-open");
  if (loginButton) loginButton.hidden = true;
  if (registerButton) registerButton.hidden = true;
  const menu = document.querySelector("#user-menu");
  menu.hidden = false;
  document.querySelector("#user-menu-greeting").textContent = `Halo, ${user.name}`;
  const dropdown = document.querySelector("#user-menu-dropdown");
  dropdown.innerHTML = user.role === "admin"
    ? '<a href="/dashboard.html">Dashboard</a><button id="logout-btn" type="button">Keluar</button>'
    : '<a href="#riwayat">Transaksi Saya</a><button id="logout-btn" type="button">Keluar</button>';
  document.querySelector("#logout-btn").addEventListener("click", async () => {
    try {
      await api.logout();
      currentUser = null;
      location.reload();
    } catch (error) {
      alert(error.message);
    }
  });
  renderCart();
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  const backdrop = document.querySelector(".nav-backdrop");
  const closeButton = document.querySelector("#mobile-nav-close");
  const accountToggle = document.querySelector("#user-menu-toggle");
  const accountDropdown = document.querySelector("#user-menu-dropdown");
  if (!toggle || !nav || !backdrop || !accountToggle || !accountDropdown) return;

  const closeAccountMenu = () => {
    accountDropdown.hidden = true;
    accountToggle.setAttribute("aria-expanded", "false");
  };
  const close = () => {
    nav.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Buka menu");
    document.body.classList.remove("nav-open");
    closeAccountMenu();
  };
  const open = () => {
    nav.classList.add("is-open");
    backdrop.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Tutup menu");
    document.body.classList.add("nav-open");
  };

  toggle.addEventListener("click", () => nav.classList.contains("is-open") ? close() : open());
  closeButton?.addEventListener("click", close);
  accountToggle.addEventListener("click", event => {
    event.stopPropagation();
    const isOpen = !accountDropdown.hidden;
    accountDropdown.hidden = isOpen;
    accountToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  backdrop.addEventListener("click", close);
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
  document.addEventListener("click", event => {
    if (!event.target.closest("#user-menu")) closeAccountMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
}
function setupSectionPanels() {
  const sections = [...document.querySelectorAll("[data-section-panel]")];
  const links = [...document.querySelectorAll(".main-nav a[href^='#']")];
  const showPanelForHash = hash => {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    const activePanel = target?.closest("[data-section-panel]")?.dataset.sectionPanel || "";
    const historyOnly = activePanel === "keranjang" && target?.id === "riwayat";
    sections.forEach(section => { section.hidden = section.dataset.sectionPanel !== activePanel; });
    const cartHeading = document.querySelector("#cart-heading");
    const cart = document.querySelector("#cart");
    if (cartHeading) cartHeading.hidden = historyOnly;
    if (cart) cart.hidden = historyOnly;
    links.forEach(link => {
      const linkTarget = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      const linkPanel = linkTarget?.closest("[data-section-panel]")?.dataset.sectionPanel;
      if (linkPanel && linkPanel === activePanel) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a[href^='#']");
    if (link) showPanelForHash(link.hash);
  });
  window.addEventListener("hashchange", () => showPanelForHash(window.location.hash));
  showPanelForHash(window.location.hash);
  if (window.location.hash) {
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }
}
function setupBackToTop() {
  const button = document.querySelector("#back-to-top");
  if (!button) return;
  const updateVisibility = () => { button.hidden = window.scrollY < 420; };
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
}
function setupOrderLookup() {
  const form = document.querySelector("#order-lookup-form");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const message = document.querySelector("#order-lookup-message");
    button.disabled = true;
    message.textContent = "Memeriksa pesanan…";
    try {
      const values = Object.fromEntries(new FormData(form));
      values.orderCode = String(values.orderCode || "").trim().toUpperCase().replace(/[‐‑‒–—―]/g, "-").replace(/\s+/g, "");
      values.phone = String(values.phone || "").replace(/[^0-9+]/g, "");
      const order = await api.lookupOrder(values);
      api.rememberOrder(order);
      activeOrderId = Number(order.id);
      message.textContent = `Pesanan ${order.orderCode} ditemukan.`;
      await renderOrderHistory();
      window.location.hash = "keranjang";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
document.addEventListener("DOMContentLoaded", () => { setupCurrentDateTime(); setupSchedulePicker(); loadStore(); loadCoupons(); loadSiteContent().catch(() => {}); renderCart(); setupAuth(); setupNavigation(); setupSectionPanels(); setupOrderLookup(); setupBackToTop(); });
