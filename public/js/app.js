const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
let currentUser = null;
const whatsappNumber = "6289634208909";

async function loadSiteContent() {
  const content = await api.siteContent();
  const set = (selector, value) => { const element = document.querySelector(selector); if (element && value) element.textContent = value; };
  set("#services-title", content.servicesTitle); set("#services-intro", content.servicesIntro);
  set("#about-label", content.aboutLabel); set("#about-title", content.aboutTitle); set("#about-text", content.aboutText);
  const image = document.querySelector("#about-image"); if (image && content.aboutImage) image.src = content.aboutImage;
}

async function loadStore() {
  try {
    const [products, announcements] = await Promise.all([api.products(), api.announcements()]);
    document.querySelector("#products").innerHTML = products.length ? products.map(p => `<article class="store-card"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div><span class="store-card__tag">${esc(p.category || "Layanan")}</span><h3>${esc(p.name)}</h3>${p.durationMinutes ? `<small class="store-card__duration">${Number(p.durationMinutes)} menit</small>` : ""}<p>${esc(p.description || "Sesi perawatan lembut untuk bayi dan keluarga.")}</p><strong>${rupiah(p.price)}</strong><button class="button button--primary add-cart" data-id="${p.id}">Tambah ke keranjang</button></div></article>`).join("") : `<div class="store-empty"><p>Jadwal layanan sedang disiapkan. Hubungi kami untuk menanyakan sesi dan tarif.</p><a class="button button--primary" href="https://wa.me/${whatsappNumber}?text=Halo%20Sentuhan%20Kecil%2C%20saya%20ingin%20bertanya%20tentang%20jadwal%20dan%20tarif%20pijat%20bayi." target="_blank" rel="noopener">Tanya via WhatsApp</a></div>`;
    document.querySelector("#announcements").innerHTML = announcements.length ? announcements.map(n => `<article class="news-card"><span class="store-card__tag">${esc(n.kind)}</span><h3>${esc(n.title)}</h3><p>${esc(n.excerpt || n.content)}</p></article>`).join("") : '<p class="store-muted">Belum ada berita.</p>';
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
  } catch (e) { document.querySelector("#products").innerHTML = `<p class="store-muted">${esc(e.message)} Pastikan server dan database sudah berjalan.</p>`; }
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
      bookingFields.innerHTML = '<label>Tanggal sesi<input name="appointmentDate" type="date" required /></label><label>Waktu sesi<input name="appointmentTime" type="time" required /></label>';
      form.querySelector("h3").after(bookingFields);
      const dateInput = bookingFields.querySelector('[name="appointmentDate"]');
      const localToday = new Date();
      localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
      dateInput.min = localToday.toISOString().slice(0, 10);
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
function setupAuth() { const modal=document.querySelector("#auth-modal"), form=document.querySelector("#auth-form"), title=document.querySelector("#auth-title"), name=document.querySelector("#auth-name"), nameLabel=document.querySelector("#auth-name-label"), msg=document.querySelector("#auth-message"); let mode="login"; const open=m=>{mode=m;title.textContent=m==="login"?"Masuk":"Daftar akun";nameLabel.hidden=m==="login";name.required=m!=="login";name.disabled=m==="login";form.reset();msg.textContent="";modal.hidden=false;}; document.querySelector("#login-open").onclick=()=>open("login");document.querySelector("#register-open").onclick=()=>open("register");document.querySelector("#auth-close").onclick=()=>modal.hidden=true;form.onsubmit=async e=>{e.preventDefault();msg.textContent="Memproses…";try{const r=mode==="login"?await api.login(Object.fromEntries(new FormData(form))):await api.register(Object.fromEntries(new FormData(form)));modal.hidden=true;showUser(r.user);}catch(x){msg.textContent=x.message;}};api.me().then(showUser).catch(()=>{});if(new URLSearchParams(location.search).has("login"))open("login"); }
function showUser(user){currentUser=user;const menu=document.querySelector("#user-menu");document.querySelector("#login-open").hidden=true;document.querySelector("#register-open").hidden=true;menu.hidden=false;menu.innerHTML=`Halo, ${esc(user.name)} ${user.role==="admin"?'<a class="auth-link dashboard-link" href="/dashboard.html">Dashboard</a>':""} <button id="logout-btn" class="auth-link">Keluar</button>`;document.querySelector("#logout-btn").onclick=async()=>{await api.logout();currentUser=null;location.reload();};renderCart();}
document.addEventListener("DOMContentLoaded", () => { loadStore(); loadSiteContent().catch(() => {}); renderCart(); setupAuth(); });
