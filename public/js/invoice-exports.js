(() => {
  const orders = new Map();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function itemTotal(item) {
    return Number(item.lineTotal ?? Number(item.price) * Number(item.qty)) || 0;
  }

  function createCsv(order) {
    const rows = [
      ["Invoice", order.orderCode],
      ["Tanggal pesanan", formatDate(order.createdAt)],
      ["Nama pelanggan", order.customerName || order.recipientName],
      ["Email pelanggan", order.customerEmail || order.recipientEmail],
      ["Metode pembayaran", order.paymentMethod],
      ["Status pembayaran", order.paymentStatus],
      ["Status pesanan", order.status],
      ["Tanggal sesi", formatDate(order.appointmentDate)],
      ["Jam sesi", order.appointmentTime],
      ["Lokasi sesi", order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio"],
      [],
      ["Layanan", "Jumlah", "Harga satuan (Rp)", "Total (Rp)"],
      ...(order.items || []).map(item => [item.name, Number(item.qty) || 0, Number(item.price) || 0, itemTotal(item)]),
      [],
      ["Subtotal (Rp)", Number(order.subtotal) || 0],
      ["Biaya kunjungan (Rp)", Number(order.shippingCost) || 0],
      ["Total (Rp)", Number(order.total) || 0]
    ];
    const csvCell = value => {
      let text = String(value ?? "");
      if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  }

  function printPdf(order) {
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("Izinkan pop-up untuk mencetak atau menyimpan invoice sebagai PDF.");
      return;
    }
    popup.opener = null;
    const items = (order.items || []).map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${Number(item.qty) || 0}</td><td>${formatMoney(item.price)}</td><td>${formatMoney(itemTotal(item))}</td></tr>`).join("");
    const title = `Invoice ${order.orderCode || ""}`;
    popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#202820;max-width:760px;margin:32px auto;padding:0 20px}
      h1{font-size:24px;margin:0 0 24px}.details{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:24px}
      .details p{margin:0}.details strong{display:block;color:#526358;font-size:12px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px 8px;border-bottom:1px solid #dce5de;text-align:left}
      th{background:#f1f6f2}td:nth-child(n+2),th:nth-child(n+2){text-align:right}
      .totals{margin-left:auto;width:min(100%,300px)}.totals p{display:flex;justify-content:space-between;margin:8px 0}
      .totals .grand-total{font-size:18px;border-top:1px solid #8c9b90;padding-top:12px;font-weight:bold}
      @media print{body{margin:0 auto;padding:0}@page{margin:16mm}}
    </style></head><body><h1>${escapeHtml(title)}</h1><div class="details">
      <p><strong>Nama pelanggan</strong>${escapeHtml(order.customerName || order.recipientName || "-")}</p>
      <p><strong>Email pelanggan</strong>${escapeHtml(order.customerEmail || order.recipientEmail || "-")}</p>
      <p><strong>Tanggal pesanan</strong>${escapeHtml(formatDate(order.createdAt))}</p>
      <p><strong>Status pesanan</strong>${escapeHtml(order.status || "-")}</p>
      <p><strong>Status pembayaran</strong>${escapeHtml(order.paymentStatus || "-")}</p>
      <p><strong>Metode pembayaran</strong>${escapeHtml(order.paymentMethod || "-")}</p>
      <p><strong>Jadwal sesi</strong>${escapeHtml(formatDate(order.appointmentDate))} ${escapeHtml(order.appointmentTime || "")}</p>
      <p><strong>Lokasi sesi</strong>${escapeHtml(order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio")}</p>
    </div><table><thead><tr><th>Layanan</th><th>Jumlah</th><th>Harga satuan</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
    <div class="totals"><p><span>Subtotal</span><span>${formatMoney(order.subtotal)}</span></p>
      <p><span>Biaya kunjungan</span><span>${formatMoney(order.shippingCost)}</span></p>
      <p class="grand-total"><span>Total</span><span>${formatMoney(order.total)}</span></p></div>
    <script>window.addEventListener("load", () => window.print());<\/script></body></html>`);
    popup.document.close();
  }

  function downloadExcel(order) {
    const blob = new Blob(["\uFEFF", createCsv(order)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${String(order.orderCode || order.id).replace(/[^a-zA-Z0-9_-]/g, "-")}.csv`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-invoice-action]");
    if (!button) return;
    const order = orders.get(String(button.dataset.invoiceId));
    if (!order) return;
    if (button.dataset.invoiceAction === "pdf") printPdf(order);
    else if (button.dataset.invoiceAction === "excel") downloadExcel(order);
  });

  window.invoiceExports = {
    register(ordersToRegister) {
      ordersToRegister.forEach(order => orders.set(String(order.id), order));
    },
    actions(orderId) {
      return `<div class="invoice-export-actions"><button class="text-button" type="button" data-invoice-action="pdf" data-invoice-id="${Number(orderId)}">PDF</button><button class="text-button" type="button" data-invoice-action="excel" data-invoice-id="${Number(orderId)}">Excel</button></div>`;
    },
    createCsv
  };
})();
