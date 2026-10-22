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

  function pdfText(value) {
    return String(value ?? "-")
      .normalize("NFKD").replace(/[^\x20-\x7E]/g, "")
      .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function pdfMoney(value) {
    return `Rp${new Intl.NumberFormat("id-ID").format(Number(value) || 0)}`;
  }

  function createPdf(order) {
    const commands = [];
    const text = (value, x, y, size = 10, bold = false, color = "0.12 0.25 0.18") => {
      commands.push(`${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`);
    };
    const line = (x1, y1, x2, y2, color = "0.82 0.89 0.84") => commands.push(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
    const fill = (x, y, width, height, color) => commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
    const shorten = (value, length) => {
      const result = String(value || "-");
      return result.length > length ? `${result.slice(0, length - 3)}...` : result;
    };

    // Header invoice
    fill(0, 750, 595, 92, "0.03 0.36 0.17");
    text("AERA BABY SPA", 50, 805, 11, true, "1 1 1");
    text("INVOICE", 50, 776, 23, true, "1 1 1");
    text(order.orderCode || "-", 365, 783, 12, true, "1 1 1");
    text(formatDate(order.createdAt), 365, 765, 9, false, "0.82 0.94 0.86");

    // Informasi pelanggan dan transaksi
    fill(50, 616, 495, 108, "0.96 0.98 0.96");
    text("PELANGGAN", 66, 700, 9, true, "0.18 0.45 0.28");
    text(shorten(order.customerName || order.recipientName, 34), 66, 680, 12, true);
    text(shorten(order.customerEmail || order.recipientEmail, 42), 66, 662, 9);
    text("TRANSAKSI", 315, 700, 9, true, "0.18 0.45 0.28");
    text(`Metode: ${order.paymentMethod || "-"}`, 315, 680, 9);
    text(`Pembayaran: ${order.paymentStatus || "-"}`, 315, 662, 9);
    text(`Pesanan: ${order.status || "-"}`, 315, 644, 9);
    text("JADWAL", 66, 638, 9, true, "0.18 0.45 0.28");
    text(`${formatDate(order.appointmentDate)} ${order.appointmentTime || ""} - ${order.serviceLocation === "home" ? "Kunjungan rumah" : "Studio"}`, 66, 622, 9);

    // Tabel layanan
    const tableTop = 584;
    fill(50, tableTop, 495, 28, "0.88 0.95 0.90");
    text("LAYANAN", 62, tableTop + 10, 9, true, "0.10 0.38 0.20");
    text("JUMLAH", 326, tableTop + 10, 9, true, "0.10 0.38 0.20");
    text("HARGA", 390, tableTop + 10, 9, true, "0.10 0.38 0.20");
    text("TOTAL", 482, tableTop + 10, 9, true, "0.10 0.38 0.20");
    const items = (order.items || []).slice(0, 14);
    let rowY = tableTop - 27;
    items.forEach(item => {
      text(shorten(item.name, 42), 62, rowY + 8, 9);
      text(Number(item.qty) || 0, 343, rowY + 8, 9);
      text(pdfMoney(item.price), 390, rowY + 8, 9);
      text(pdfMoney(itemTotal(item)), 482, rowY + 8, 9, true);
      line(50, rowY, 545, rowY);
      rowY -= 28;
    });
    if (!items.length) {
      text("Tidak ada rincian layanan", 62, rowY + 8, 9);
      line(50, rowY, 545, rowY);
      rowY -= 28;
    }
    line(315, tableTop + 28, 315, rowY + 28);
    line(375, tableTop + 28, 375, rowY + 28);
    line(470, tableTop + 28, 470, rowY + 28);

    // Ringkasan pembayaran
    const totalY = Math.max(72, rowY - 105);
    fill(330, totalY, 215, 88, "0.96 0.98 0.96");
    text("Subtotal", 346, totalY + 64, 9);
    text(pdfMoney(order.subtotal), 465, totalY + 64, 9, true);
    text("Biaya kunjungan", 346, totalY + 44, 9);
    text(pdfMoney(order.shippingCost), 465, totalY + 44, 9, true);
    line(346, totalY + 33, 529, totalY + 33);
    text("TOTAL", 346, totalY + 14, 11, true, "0.03 0.36 0.17");
    text(pdfMoney(order.total), 455, totalY + 14, 12, true, "0.03 0.36 0.17");
    text("Terima kasih telah mempercayakan perawatan si kecil kepada Aera Baby Spa.", 50, 38, 8, false, "0.40 0.52 0.44");

    const content = commands.join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    ];
    let pdf = "%PDF-1.4\n%1234\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Uint8Array.from(pdf, character => character.charCodeAt(0));
  }

  function downloadPdf(order) {
    const blob = new Blob([createPdf(order)], { type: "application/pdf" });
    downloadBlob(blob, `invoice-${safeFilename(order)}.pdf`);
  }

  function safeFilename(order) {
    return String(order.orderCode || order.id).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadExcel(order) {
    const blob = new Blob(["\uFEFF", createCsv(order)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `invoice-${safeFilename(order)}.csv`);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-invoice-action]");
    if (!button) return;
    const order = orders.get(String(button.dataset.invoiceId));
    if (!order) return;
    if (button.dataset.invoiceAction === "pdf") downloadPdf(order);
    else if (button.dataset.invoiceAction === "excel") downloadExcel(order);
  });

  window.invoiceExports = {
    register(ordersToRegister) {
      ordersToRegister.forEach(order => orders.set(String(order.id), order));
    },
    actions(orderId) {
      return `<details class="invoice-export-menu"><summary>Unduh</summary><div class="invoice-export-actions"><button class="text-button" type="button" data-invoice-action="pdf" data-invoice-id="${Number(orderId)}">PDF</button><button class="text-button" type="button" data-invoice-action="excel" data-invoice-id="${Number(orderId)}">Excel</button></div></details>`;
    },
    createCsv,
    createPdf
  };
})();
