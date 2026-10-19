const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
let currentUser = null;
const whatsappNumber = "6289634208909";
const scheduleSelection = { date: "", time: "" };
let paymentPollTimer = null;

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
    const qrisImage = hasQrisImage ? `<img class="qris-code qris-code--image" src="${esc(order.paymentDetails.qrisImageUrl)}" alt="Barcode QRIS Aera Baby Spa">` : `<div class="qris-code" aria-label="Penanda QRIS belum dikonfigurasi"><span>QRIS</span><small>Belum diatur</small></div>`;
    const message = hasQrisImage ? "Scan QR ini dengan aplikasi pembayaran Anda. Nominal sudah terisi otomatis." : "QRIS dinamis belum tersedia. Hubungi petugas.";
    return `<div class="payment-instructions payment-instructions--qris">${qrisImage}<div><strong>Bayar ${rupiah(order.total)}</strong><p>${message}</p>${deadlineCopy}<small class="payment-auto-status">Status pembayaran diperiksa otomatis…</small></div></div>`;
  }
  if (order.paymentMethod === "Transfer Bank") {
    const details = order.paymentDetails || {};
    return `<div class="payment-instructions"><div><strong>Transfer ${esc(details.bankName || "Bank Mandiri")}</strong><p>No. rekening: <b>${esc(details.bankAccountNumber || "9000050103739")}</b><br>a.n. <b>${esc(details.bankAccountHolder || "HAFSAH QUROTUN AINI")}</b><br>Transfer tepat sebesar: <b>${rupiah(order.total)}</b></p>${deadlineCopy}<form class="payment-proof-form" data-proof-order="${Number(order.id)}"><label>Bukti transfer<input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required></label><button class="button button--primary" type="submit">Kirim bukti transfer</button><small role="status">Status akan menjadi “Menunggu verifikasi”.</small></form></div></div>`;
  }
  return `<div class="payment-instructions"><div><strong>Bayar tunai</strong><p>Siapkan <b>${rupiah(order.total)}</b> dan lakukan pembayaran kepada petugas saat sesi berlangsung.</p></div></div>`;
}

function invoiceMarkup(order) {
  const items = (order.items || []).map(item => `<li><span>${esc(item.name)} × ${Number(item.qty)}</span><b>${rupiah(item.lineTotal ?? item.price * item.qty)}</b></li>`).join("");
  const finalInvoice = ["Dibayar", "Dikembalikan"].includes(order.paymentStatus);
  return `<article class="invoice" data-invoice="${Number(order.id)}"><div class="invoice__head"><div><span>${finalInvoice ? "INVOICE" : "RINGKASAN BOOKING"}</span><h3>${esc(order.orderCode)}</h3></div><b class="payment-badge ${order.paymentStatus === "Dibayar" ? "is-paid" : ""}">${esc(order.paymentStatus)}</b></div><ul>${items}</ul><div class="invoice__total"><span>Total</span><b>${rupiah(order.total)}</b></div><p>Metode: ${esc(order.paymentMethod)} · Jadwal: ${esc(order.appointmentDate)} ${esc(order.appointmentTime || "")}</p>${finalInvoice ? window.invoiceExports.actions(order.id) : ""}</article>`;
}

async function renderOrderHistory() {
  const history = document.querySelector("#riwayat");
  if (!history) return;
  if (paymentPollTimer) { clearTimeout(paymentPollTimer); paymentPollTimer = null; }
  if (!currentUser) { history.hidden = true; return; }
  try {
    const orders = await api.orders();
    window.invoiceExports.register(orders.map(order => ({
      ...order,
      recipientName: order.recipientName || currentUser.name,
      recipientEmail: order.recipientEmail || currentUser.email
    })));
    history.hidden = false;
    const customerProfile = await api.profile().catch(() => ({}));
    history.innerHTML = `<details class="customer-profile"><summary><span>Profil keluarga</span><small>Simpan data bayi untuk booking lebih cepat</small></summary><form id="customer-profile-form" class="checkout-form"><input name="childName" value="${esc(customerProfile.childName || "")}" placeholder="Nama bayi / anak"><label>Tanggal lahir anak<input name="childBirthDate" type="date" value="${esc(customerProfile.childBirthDate || "")}"></label><textarea name="allergies" placeholder="Alergi atau kondisi yang perlu diperhatikan">${esc(customerProfile.allergies || "")}</textarea><textarea name="careNotes" placeholder="Catatan perawatan khusus">${esc(customerProfile.careNotes || "")}</textarea><textarea name="defaultAddress" placeholder="Alamat utama untuk home care">${esc(customerProfile.defaultAddress || "")}</textarea><div class="profile-inline"><input name="defaultCity" value="${esc(customerProfile.defaultCity || "")}" placeholder="Kota"><input name="defaultZip" value="${esc(customerProfile.defaultZip || "")}" placeholder="Kode pos"></div><button class="button button--primary" type="submit">Simpan profil</button><p class="store-muted" role="status"></p></form></details><div class="order-history__heading"><span class="eyebrow"><i></i> Riwayat pembayaran</span><h3>Pesanan &amp; invoice Anda</h3></div>${orders.length ? orders.map(order => `<article class="order-card"><div><strong>${esc(order.orderCode)}</strong><p>${esc(order.status)} · ${esc(order.paymentMethod)} · ${rupiah(order.total)} · <b>${esc(order.paymentStatus)}</b></p></div>${order.paymentStatus === "Menunggu pembayaran" ? paymentInstructions(order) : invoiceMarkup(order)}${order.status !== "Dibatalkan" && order.appointmentStatus !== "Selesai" ? `<div class="order-change-actions"><button type="button" data-reschedule-order="${order.id}">Ubah jadwal</button><button type="button" data-cancel-request="${order.id}">Ajukan pembatalan</button></div>` : ""}${order.status === "Selesai" && order.appointmentStatus === "Selesai" ? `<div class="order-change-actions"><button type="button" data-review-order="${order.id}">Beri ulasan</button></div>` : ""}</article>`).join("") : "<p class=\"store-muted\">Belum ada riwayat pesanan.</p>"}`;
    history.querySelector("#customer-profile-form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector("p");
      message.textContent = "Menyimpan…";
      try { const result = await api.updateProfile(Object.fromEntries(new FormData(form))); message.textContent = result.message; }
      catch (error) { message.textContent = error.message; }
    });
    history.querySelectorAll("[data-cancel-request]").forEach(button => button.addEventListener("click", async () => { if (!confirm("Kirim permintaan pembatalan ke admin?")) return; try { alert((await api.requestOrderChange(button.dataset.cancelRequest, { requestType: "cancel" })).message); } catch (error) { alert(error.message); } }));
    history.querySelectorAll("[data-review-order]").forEach(button => button.addEventListener("click", async () => { const rating = prompt("Beri rating 1–5:"); if (!rating) return; const comment = prompt("Tulis ulasan singkat (opsional):") || ""; try { alert((await api.createReview(button.dataset.reviewOrder, { rating, comment })).message); button.disabled = true; } catch (error) { alert(error.message); } }));
    history.querySelectorAll("[data-reschedule-order]").forEach(button => button.addEventListener("click", async () => { const appointmentDate = prompt("Tanggal baru (YYYY-MM-DD):"); const appointmentTime = prompt("Jam baru (HH:MM):"); if (!appointmentDate || !appointmentTime) return; try { alert((await api.requestOrderChange(button.dataset.rescheduleOrder, { requestType: "reschedule", appointmentDate, appointmentTime })).message); } catch (error) { alert(error.message); } }));
    history.querySelectorAll(".payment-proof-form").forEach(form => form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button");
      const status = form.querySelector('[role="status"]');
      const file = form.elements.image.files[0];
      button.disabled = true;
      status.textContent = "Mengirim bukti transfer…";
      try { await api.uploadPaymentProof(form.dataset.proofOrder, file); await renderOrderHistory(); }
      catch (error) { status.textContent = error.message; button.disabled = false; }
    }));
    const pendingQris = orders.filter(order => order.paymentMethod === "QRIS" && order.paymentStatus === "Menunggu pembayaran");
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

    el.innerHTML = `${cart.items.map(item => `<div class="cart-row"><img class="cart-row__image" src="${esc(item.image || "assets/img/bag.svg")}" alt="${esc(item.name)}" loading="lazy"><span>${esc(item.name)}<small>${rupiah(item.price)} per sesi</small></span><strong>${rupiah(item.price * item.qty)}</strong><div class="cart-controls"><button class="cart-minus" data-id="${item.id}" data-qty="${item.qty}" type="button" aria-label="Kurangi jumlah ${esc(item.name)}">−</button><b>${item.qty}</b><button class="cart-plus" data-id="${item.id}" data-qty="${item.qty}" type="button">+</button><button class="cart-remove" data-id="${item.id}" type="button">Hapus</button></div></div>`).join("")}<div class="cart-total"><span>Total layanan</span><strong>${rupiah(cart.subtotal)}</strong></div>${currentUser ? `<form id="checkout-form" class="checkout-form"><h3>Data pemesan</h3><input name="recipientName" placeholder="Nama orang tua" autocomplete="name" required><input name="recipientEmail" type="email" placeholder="Email" autocomplete="email" required><input name="recipientPhone" type="tel" placeholder="Nomor WhatsApp"><textarea name="address" placeholder="Alamat lengkap" required></textarea><input name="couponCode" placeholder="Kode voucher (opsional)" autocomplete="off"><select name="shippingMethod"><option value="regular">Sesi di lokasi layanan</option><option value="express">Kunjungan ke rumah</option></select><label>Metode pembayaran<select name="paymentMethod" required><option value="">Pilih metode pembayaran</option><option value="QRIS">QRIS</option><option value="Transfer Bank">Transfer bank</option><option value="Tunai">Tunai saat sesi</option></select></label><p class="payment-note">Setelah pesanan dibuat, instruksi QRIS/transfer akan tampil di riwayat pembayaran. Pembayaran tunai dilakukan kepada petugas saat sesi.</p><button class="button button--primary" type="submit">Buat pesanan</button><p id="checkout-message" class="store-muted" role="status" aria-live="polite"></p></form>` : `<div class="checkout-required"><p>Masuk atau daftar untuk melanjutkan pemesanan.</p><button id="checkout-login" class="button button--primary" type="button">Masuk untuk checkout</button></div>`}`;

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
      const locationSelect = form.querySelector('[name="shippingMethod"]');
      locationSelect.name = "serviceLocation";
      locationSelect.innerHTML = '<option value="studio">Datang ke studio</option><option value="home">Kunjungan ke rumah</option>';
      const paymentSelect = form.querySelector('[name="paymentMethod"]');
      const syncPaymentMethods = () => {
        const cashOption = paymentSelect.querySelector('option[value="Tunai"]');
        cashOption.disabled = locationSelect.value === "home";
        if (cashOption.disabled && paymentSelect.value === "Tunai") paymentSelect.value = "";
      };
      locationSelect.addEventListener("change", syncPaymentMethods);
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
        let occupiedTimes = [];
        try { occupiedTimes = (await api.appointmentAvailability(dateSelect.value)).occupiedTimes || []; }
        catch { /* Validasi akhir tetap dilakukan server saat checkout. */ }
        const slots = getScheduleTimes(dateSelect.value).filter(time => !occupiedTimes.includes(time));
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
        await renderCart();
        await renderOrderHistory();
        const confirmation = document.createElement("p");
        confirmation.className = "order-confirmation";
        confirmation.setAttribute("role", "status");
        confirmation.innerHTML = `Pesanan <strong>${esc(order.orderCode)}</strong> berhasil dibuat. ${order.paymentMethod === "QRIS" ? "Scan QRIS dinamis pada riwayat pembayaran; nominalnya sudah sesuai total pesanan dan status akan berubah otomatis setelah pembayaran diterima." : "Lanjutkan pembayaran pada bagian riwayat di bawah."}`;
        el.prepend(confirmation);
      } catch (error) {
        message.textContent = error.message;
        submit.disabled = false;
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
  document.querySelector("#login-open").onclick = () => open("login");
  document.querySelector("#register-open").onclick = () => open("register");
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
  document.querySelector("#login-open").hidden = true;
  document.querySelector("#register-open").hidden = true;
  const menu = document.querySelector("#user-menu");
  menu.hidden = false;
  document.querySelector("#user-menu-greeting").textContent = `Halo, ${user.name}`;
  const dropdown = document.querySelector("#user-menu-dropdown");
  dropdown.innerHTML = `${user.role === "admin" ? '<a href="/dashboard.html">Dashboard</a>' : ""}<a href="#riwayat">Transaksi Saya</a><button id="logout-btn" type="button">Keluar</button>`;
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
    sections.forEach(section => { section.hidden = section.dataset.sectionPanel !== activePanel; });
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
document.addEventListener("DOMContentLoaded", () => { setupCurrentDateTime(); setupSchedulePicker(); loadStore(); loadSiteContent().catch(() => {}); renderCart(); setupAuth(); setupNavigation(); setupSectionPanels(); setupBackToTop(); });
