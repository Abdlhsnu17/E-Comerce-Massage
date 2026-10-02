const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
let currentUser = null;
const whatsappNumber = "6289634208909";
const scheduleSelection = { date: "", time: "" };

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

async function renderCart() {
  try {
    const cart = await api.cart();
    const el = document.querySelector("#cart");
    document.querySelector("#cart-count").textContent = cart.totalQty || 0;
    if (!cart.items?.length) {
      el.innerHTML = '<p class="store-muted">Keranjang kosong.</p>';
      return;
    }

    el.innerHTML = `${cart.items.map(item => `<div class="cart-row"><span>${esc(item.name)}<small>${rupiah(item.price)} per sesi</small></span><strong>${rupiah(item.price * item.qty)}</strong><div class="cart-controls"><button class="cart-minus" data-id="${item.id}" data-qty="${item.qty}" type="button" aria-label="Kurangi jumlah ${esc(item.name)}">−</button><b>${item.qty}</b><button class="cart-plus" data-id="${item.id}" data-qty="${item.qty}" type="button" aria-label="Tambah jumlah ${esc(item.name)}">+</button><button class="cart-remove" data-id="${item.id}" type="button">Hapus</button></div></div>`).join("")}<div class="cart-total"><span>Total layanan</span><strong>${rupiah(cart.subtotal)}</strong></div>${currentUser ? `<form id="checkout-form" class="checkout-form"><h3>Data pemesan</h3><input name="recipientName" placeholder="Nama orang tua" autocomplete="name" required><input name="recipientEmail" type="email" placeholder="Email" autocomplete="email" required><input name="recipientPhone" type="tel" placeholder="Nomor WhatsApp"><textarea name="address" placeholder="Alamat lengkap" required></textarea><select name="shippingMethod"><option value="regular">Sesi di lokasi layanan</option><option value="express">Kunjungan ke rumah</option></select><label>Metode pembayaran<select name="paymentMethod" required><option value="">Pilih metode pembayaran</option><option value="QRIS">QRIS</option><option value="Virtual Account">Virtual Account</option><option value="Kartu Debit/Kredit">Kartu debit/kredit</option></select></label><p class="payment-note">Total hanya mencakup tarif sesi. Biaya dan jadwal kunjungan rumah, serta pembayaran, dikonfirmasi manual melalui WhatsApp; belum ada payment gateway.</p><button class="button button--primary" type="submit">Buat pesanan</button><p id="checkout-message" class="store-muted" role="status" aria-live="polite"></p></form>` : `<div class="checkout-required"><p>Masuk atau daftar untuk melanjutkan pemesanan.</p><button id="checkout-login" class="button button--primary" type="button">Masuk untuk checkout</button></div>`}`;

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
      const bookingFields = document.createElement("div");
      bookingFields.className = "booking-fields";
      bookingFields.innerHTML = '<label>Hari dan tanggal sesi<select name="appointmentDate" required></select></label><label>Jam sesi<select name="appointmentTime" required></select></label><p class="booking-hours">Pilihan jadwal otomatis tersedia pukul 09.00–17.00.</p>';
      form.querySelector("h3").after(bookingFields);
      const dateSelect = bookingFields.querySelector('[name="appointmentDate"]');
      const timeSelect = bookingFields.querySelector('[name="appointmentTime"]');
      const dateOptions = getScheduleDateOptions();
      dateSelect.innerHTML = dateOptions.map(option => `<option value="${option.value}">${esc(option.label)}</option>`).join("");
      dateSelect.value = dateOptions.some(option => option.value === scheduleSelection.date) ? scheduleSelection.date : dateOptions[0].value;
      const renderTimeOptions = () => {
        const slots = getScheduleTimes(dateSelect.value);
        timeSelect.innerHTML = slots.length
          ? slots.map(time => `<option value="${time}">${time.replace(":", ".")}</option>`).join("")
          : '<option value="">Tidak ada jadwal</option>';
        timeSelect.value = slots.includes(scheduleSelection.time) ? scheduleSelection.time : slots[0];
        scheduleSelection.date = dateSelect.value;
        scheduleSelection.time = timeSelect.value;
        timeSelect.disabled = slots.length === 0;
      };
      dateSelect.addEventListener("change", renderTimeOptions);
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
        const confirmation = document.createElement("p");
        confirmation.className = "order-confirmation";
        confirmation.setAttribute("role", "status");
        confirmation.innerHTML = `Permintaan sesi <strong>${esc(order.orderCode)}</strong> untuk ${esc(order.appointmentDate)} pukul ${esc(order.appointmentTime)} tercatat. Jadwal menunggu konfirmasi dan pembayaran dilakukan manual. <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Konfirmasi sesi ${order.orderCode} pada ${order.appointmentDate} pukul ${order.appointmentTime}`)}" target="_blank" rel="noopener">Konfirmasi melalui WhatsApp</a>.`;
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
  let mode = "login";
  const showOnly = visible => [form, forgotForm, resetForm].forEach(item => item.hidden = item !== visible);
  const open = m => { mode = m; title.textContent = m === "login" ? "Masuk" : "Daftar akun"; nameLabel.hidden = m === "login"; name.required = m !== "login"; name.disabled = m === "login"; form.password.minLength = m === "login" ? 6 : 12; form.reset(); msg.textContent = ""; showOnly(form); modal.hidden = false; };
  const openForgot = () => { title.textContent = "Lupa password"; forgotForm.reset(); forgotForm.querySelector("p").textContent = ""; showOnly(forgotForm); modal.hidden = false; };
  const openReset = () => { title.textContent = "Atur ulang password"; resetForm.reset(); resetForm.querySelector("p").textContent = ""; showOnly(resetForm); modal.hidden = false; };
  document.querySelector("#login-open").onclick = () => open("login");
  document.querySelector("#register-open").onclick = () => open("register");
  document.querySelector("#auth-close").onclick = () => modal.hidden = true;
  document.querySelector("#forgot-password").onclick = openForgot;
  document.querySelectorAll(".back-to-login").forEach(button => button.onclick = () => open("login"));
  form.onsubmit = async event => { event.preventDefault(); msg.textContent = "Memproses…"; try { const response = mode === "login" ? await api.login(Object.fromEntries(new FormData(form))) : await api.register(Object.fromEntries(new FormData(form))); modal.hidden = true; showUser(response.user); } catch (error) { msg.textContent = error.message; } };
  forgotForm.onsubmit = async event => { event.preventDefault(); const notice = forgotForm.querySelector("p"); notice.textContent = "Mengirim…"; try { const response = await api.requestPasswordReset(Object.fromEntries(new FormData(forgotForm))); notice.textContent = response.message; } catch (error) { notice.textContent = error.message; } };
  resetForm.onsubmit = async event => { event.preventDefault(); const notice = resetForm.querySelector("p"), values = Object.fromEntries(new FormData(resetForm)); if (values.newPassword !== values.confirmPassword) return notice.textContent = "Konfirmasi password tidak sama."; notice.textContent = "Menyimpan…"; try { const response = await api.resetPassword({ token: new URLSearchParams(location.search).get("reset"), newPassword: values.newPassword }); notice.textContent = response.message; history.replaceState({}, "", location.pathname); setTimeout(() => open("login"), 1200); } catch (error) { notice.textContent = error.message; } };
  api.me().then(showUser).catch(() => {});
  const query = new URLSearchParams(location.search); if (query.has("reset")) openReset(); else if (query.has("login")) open("login");
}
function showUser(user){currentUser=user;const menu=document.querySelector("#user-menu");document.querySelector("#login-open").hidden=true;document.querySelector("#register-open").hidden=true;menu.hidden=false;menu.innerHTML=`Halo, ${esc(user.name)} ${user.role==="admin"?'<a class="auth-link dashboard-link" href="/dashboard.html">Dashboard</a>':""} <button id="logout-btn" class="auth-link">Keluar</button>`;document.querySelector("#logout-btn").onclick=async()=>{await api.logout();currentUser=null;location.reload();};renderCart();}
document.addEventListener("DOMContentLoaded", () => { setupCurrentDateTime(); setupSchedulePicker(); loadStore(); loadSiteContent().catch(() => {}); renderCart(); setupAuth(); });
