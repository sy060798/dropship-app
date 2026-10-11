document.addEventListener("DOMContentLoaded", () => {
  // --- STATE APLIKASI ---
  let barangList = [];
  let penjualanList = [];

  let barangPageCurrent = 1;
  const barangPerPage = 10;
  let penjualanPageCurrent = 1;
  const penjualanPerPage = 10;

  // --- ELEMEN DOM ---
  const navLinks = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");
  const pageTitle = document.getElementById("pageTitle");
  const todayDateEl = document.getElementById("todayDate");

  // Format Tanggal Hari Ini di Topbar
  if (todayDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDateEl.textContent = new Date().toLocaleDateString('id-ID', options);
  }

  // --- NAVIGASI HALAMAN ---
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      const targetPage = link.getAttribute("data-page");

      navLinks.forEach(item => item.classList.remove("active"));
      link.classList.add("active");

      pages.forEach(page => {
        page.classList.remove("active");
        if (page.id === `page-${targetPage}`) {
          page.classList.add("active");
        }
      });

      if (targetPage === "dashboard") {
        pageTitle.textContent = "Dashboard";
        loadDashboard();
      } else if (targetPage === "barang") {
        pageTitle.textContent = "Data Barang";
        loadBarang();
      } else if (targetPage === "penjualan") {
        pageTitle.textContent = "Data Penjualan";
        loadPenjualan();
      } else if (targetPage === "keuangan") {
        pageTitle.textContent = "Modal & Keuntungan";
        loadKeuangan();
      }
    });
  });

  // Shortcut tombol navigasi cepat ([data-go])
  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      const targetLink = document.querySelector(`.nav-link[data-page="${target}"]`);
      if (targetLink) targetLink.click();
    });
  });

  // Toggle Sidebar Mobile
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  // Helper Format Rupiah
  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number || 0);
  }

  // Notifikasi Pesan Singkat
  function showNotice(message, isError = false) {
    const notice = document.getElementById("notice");
    if (!notice) return;
    notice.textContent = message;
    notice.style.backgroundColor = isError ? "#fee2e2" : "#f0fdfa";
    notice.style.color = isError ? "#ef4444" : "#0f766e";
    notice.style.borderColor = isError ? "#fecaca" : "#99f6e4";
    notice.hidden = false;
    setTimeout(() => {
      notice.hidden = true;
    }, 4000);
  }

  // ==========================================
  // 1. MODUL DATA BARANG
  // ==========================================
  async function loadBarang(search = "") {
    try {
      const res = await fetch(`/api/barang${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      barangList = await res.json();
      renderBarangTable();
      populateBarangDropdown();
    } catch (err) {
      console.error("Gagal memuat barang:", err);
      showNotice("Gagal memuat data barang dari server.", true);
    }
  }

  function renderBarangTable() {
    const tbody = document.getElementById("barangTable");
    const info = document.getElementById("barangInfo");
    const pageSpan = document.getElementById("barangPage");
    if (!tbody) return;

    if (barangList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada data barang.</td></tr>`;
      if (info) info.textContent = "Menampilkan 0 barang";
      if (pageSpan) pageSpan.textContent = "1 / 1";
      return;
    }

    const totalPages = Math.ceil(barangList.length / barangPerPage) || 1;
    if (barangPageCurrent > totalPages) barangPageCurrent = totalPages;

    const start = (barangPageCurrent - 1) * barangPerPage;
    const paginated = barangList.slice(start, start + barangPerPage);

    tbody.innerHTML = paginated.map((item, idx) => {
      const untung = item.harga_jual - item.harga_modal;
      return `
        <tr>
          <td>${start + idx + 1}</td>
          <td><strong>${escapeHtml(item.nama)}</strong></td>
          <td>${formatRupiah(item.harga_modal)}</td>
          <td>${formatRupiah(item.harga_jual)}</td>
          <td style="color: #10b981; font-weight: 600;">${formatRupiah(untung)}</td>
          <td>
            <button class="btn btn-light" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.editBarang(${item.id})">Edit</button>
            <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.deleteBarang(${item.id})">Hapus</button>
          </td>
        </tr>
      `;
    }).join("");

    if (info) info.textContent = `Menampilkan ${start + 1} - ${start + paginated.length} dari ${barangList.length} barang`;
    if (pageSpan) pageSpan.textContent = `${barangPageCurrent} / ${totalPages}`;
  }

  // Pencarian Barang
  document.getElementById("searchBarang")?.addEventListener("input", (e) => {
    barangPageCurrent = 1;
    loadBarang(e.target.value);
  });

  // Pagination Barang
  document.getElementById("barangPrev")?.addEventListener("click", () => {
    if (barangPageCurrent > 1) {
      barangPageCurrent--;
      renderBarangTable();
    }
  });
  document.getElementById("barangNext")?.addEventListener("click", () => {
    const totalPages = Math.ceil(barangList.length / barangPerPage) || 1;
    if (barangPageCurrent < totalPages) {
      barangPageCurrent++;
      renderBarangTable();
    }
  });

  // Form Tambah/Edit Barang Dialog
  const barangDialog = document.getElementById("barangDialog");
  const barangForm = document.getElementById("barangForm");

  document.getElementById("addBarang")?.addEventListener("click", () => {
    barangForm.reset();
    document.getElementById("barangId").value = "";
    document.getElementById("barangFormTitle").textContent = "Tambah Barang";
    document.getElementById("previewUntung").textContent = "Rp0";
    barangDialog?.showModal();
  });

  // Preview keuntungan otomatis di form barang
  const modalInput = document.getElementById("modalBarang");
  const jualInput = document.getElementById("jualBarang");
  function updateBarangPreview() {
    const m = Number(modalInput?.value) || 0;
    const j = Number(jualInput?.value) || 0;
    const preview = document.getElementById("previewUntung");
    if (preview) preview.textContent = formatRupiah(j - m);
  }
  modalInput?.addEventListener("input", updateBarangPreview);
  jualInput?.addEventListener("input", updateBarangPreview);

  barangForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("barangId").value;
    const nama = document.getElementById("namaBarang").value;
    const harga_modal = modalInput.value;
    const harga_jual = jualInput.value;

    const method = id ? "PUT" : "POST";
    const payload = id ? { id, nama, harga_modal, harga_jual } : { nama, harga_modal, harga_jual };

    try {
      const res = await fetch("/api/barang", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan barang");

      showNotice(data.message);
      barangDialog?.close();
      loadBarang();
    } catch (err) {
      showNotice(err.message, true);
    }
  });

  // Global window methods untuk Edit & Hapus Barang
  window.editBarang = (id) => {
    const item = barangList.find(b => b.id === id);
    if (!item) return;
    document.getElementById("barangId").value = item.id;
    document.getElementById("namaBarang").value = item.nama;
    document.getElementById("modalBarang").value = item.harga_modal;
    document.getElementById("jualBarang").value = item.harga_jual;
    document.getElementById("barangFormTitle").textContent = "Edit Barang";
    updateBarangPreview();
    barangDialog?.showModal();
  };

  window.deleteBarang = async (id) => {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    try {
      const res = await fetch("/api/barang", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      showNotice(data.message);
      loadBarang();
    } catch (err) {
      showNotice(err.message, true);
    }
  };


  // ==========================================
  // 2. MODUL DATA PENJUALAN
  // ==========================================
  async function loadPenjualan(search = "") {
    try {
      const res = await fetch(`/api/penjualan${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      penjualanList = await res.json();
      renderPenjualanTable();
      loadDashboardStats();
    } catch (err) {
      console.error("Gagal memuat penjualan:", err);
    }
  }

  function renderPenjualanTable() {
    const tbody = document.getElementById("penjualanTable");
    const info = document.getElementById("penjualanInfo");
    const pageSpan = document.getElementById("penjualanPage");
    if (!tbody) return;

    if (penjualanList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Belum ada data penjualan.</td></tr>`;
      if (info) info.textContent = "Menampilkan 0 transaksi";
      if (pageSpan) pageSpan.textContent = "1 / 1";
      return;
    }

    const totalPages = Math.ceil(penjualanList.length / penjualanPerPage) || 1;
    if (penjualanPageCurrent > totalPages) penjualanPageCurrent = totalPages;

    const start = (penjualanPageCurrent - 1) * penjualanPerPage;
    const paginated = penjualanList.slice(start, start + penjualanPerPage);

    tbody.innerHTML = paginated.map((item, idx) => `
      <tr>
        <td>${start + idx + 1}</td>
        <td>${item.tanggal}</td>
        <td><strong>${escapeHtml(item.nama_barang || "Barang Dihapus")}</strong></td>
        <td>${item.jumlah}</td>
        <td>${formatRupiah(item.total_modal)}</td>
        <td>${formatRupiah(item.total_penjualan)}</td>
        <td style="color: #10b981; font-weight: 600;">${formatRupiah(item.keuntungan)}</td>
        <td>
          <button class="btn btn-light" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.editPenjualan(${item.id})">Edit</button>
          <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.deletePenjualan(${item.id})">Hapus</button>
        </td>
      </tr>
    `).join("");

    if (info) info.textContent = `Menampilkan ${start + 1} - ${start + paginated.length} dari ${penjualanList.length} transaksi`;
    if (pageSpan) pageSpan.textContent = `${penjualanPageCurrent} / ${totalPages}`;
  }

  // Pencarian Penjualan
  document.getElementById("searchPenjualan")?.addEventListener("input", (e) => {
    penjualanPageCurrent = 1;
    loadPenjualan(e.target.value);
  });

  // Pagination Penjualan
  document.getElementById("penjualanPrev")?.addEventListener("click", () => {
    if (penjualanPageCurrent > 1) {
      penjualanPageCurrent--;
      renderPenjualanTable();
    }
  });
  document.getElementById("penjualanNext")?.addEventListener("click", () => {
    const totalPages = Math.ceil(penjualanList.length / penjualanPerPage) || 1;
    if (penjualanPageCurrent < totalPages) {
      penjualanPageCurrent++;
      renderPenjualanTable();
    }
  });

  // Populate dropdown barang di form penjualan
  function populateBarangDropdown() {
    const select = document.getElementById("pilihBarang");
    if (!select) return;
    select.innerHTML = '<option value="">Pilih barang</option>' + barangList.map(b => `
      <option value="${b.id}" data-harga="${b.harga_jual}">${b.nama} (Jual: ${formatRupiah(b.harga_jual)})</option>
    `).join("");
  }

  const penjualanDialog = document.getElementById("penjualanDialog");
  const penjualanForm = document.getElementById("penjualanForm");

  document.getElementById("addPenjualan")?.addEventListener("click", () => {
    penjualanForm.reset();
    document.getElementById("penjualanId").value = "";
    document.getElementById("penjualanFormTitle").textContent = "Catat Penjualan";
    document.getElementById("tanggalPenjualan").value = new Date().toISOString().split('T')[0];
    document.getElementById("previewProfit").textContent = "Rp0";
    penjualanDialog?.showModal();
  });

  // Event saat barang dipilih di form penjualan (otomatis set harga jual)
  const pilihBarangSelect = document.getElementById("pilihBarang");
  const jumlahJualInput = document.getElementById("jumlahPenjualan");
  const hargaJualTransaksiInput = document.getElementById("hargaJualTransaksi");

  pilihBarangSelect?.addEventListener("change", () => {
    const selectedOption = pilihBarangSelect.selectedOptions[0];
    const hargaJual = selectedOption?.getAttribute("data-harga") || 0;
    if (hargaJualTransaksiInput) hargaJualTransaksiInput.value = hargaJual;
    updatePenjualanPreview();
  });

  function updatePenjualanPreview() {
    const barangId = pilihBarangSelect?.value;
    const jml = Number(jumlahJualInput?.value) || 0;
    const hrgJual = Number(hargaJualTransaksiInput?.value) || 0;
    
    const barangObj = barangList.find(b => b.id == barangId);
    const hrgModal = barangObj ? Number(barangObj.harga_modal) : 0;

    const totalModal = hrgModal * jml;
    const totalJual = hrgJual * jml;
    const profit = totalJual - totalModal;

    const preview = document.getElementById("previewProfit");
    if (preview) preview.textContent = formatRupiah(profit);
  }

  jumlahJualInput?.addEventListener("input", updatePenjualanPreview);
  hargaJualTransaksiInput?.addEventListener("input", updatePenjualanPreview);

  penjualanForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("penjualanId").value;
    const tanggal = document.getElementById("tanggalPenjualan").value;
    const barang_id = pilihBarangSelect.value;
    const jumlah = jumlahJualInput.value;
    const harga_jual = hargaJualTransaksiInput.value;

    const method = id ? "PUT" : "POST";
    const payload = id ? { id, tanggal, barang_id, jumlah, harga_jual } : { tanggal, barang_id, jumlah, harga_jual };

    try {
      const res = await fetch("/api/penjualan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan penjualan");

      showNotice(data.message);
      penjualanDialog?.close();
      loadPenjualan();
    } catch (err) {
      showNotice(err.message, true);
    }
  });

  window.editPenjualan = (id) => {
    const item = penjualanList.find(p => p.id === id);
    if (!item) return;
    document.getElementById("penjualanId").value = item.id;
    document.getElementById("tanggalPenjualan").value = item.tanggal;
    document.getElementById("pilihBarang").value = item.barang_id;
    document.getElementById("jumlahPenjualan").value = item.jumlah;
    document.getElementById("hargaJualTransaksi").value = item.harga_jual;
    document.getElementById("penjualanFormTitle").textContent = "Edit Penjualan";
    updatePenjualanPreview();
    penjualanDialog?.showModal();
  };

  window.deletePenjualan = async (id) => {
    if (!confirm("Yakin ingin menghapus catatan penjualan ini?")) return;
    try {
      const res = await fetch("/api/penjualan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      showNotice(data.message);
      loadPenjualan();
    } catch (err) {
      showNotice(err.message, true);
    }
  };


  // ==========================================
  // 3. DASHBOARD & KEUANGAN
  // ==========================================
  async function loadDashboard() {
    await loadBarang();
    await loadPenjualan();
  }

  function loadDashboardStats() {
    let totalModal = 0;
    let totalPenjualan = 0;
    let totalUntung = 0;

    penjualanList.forEach(p => {
      totalModal += Number(p.total_modal || 0);
      totalPenjualan += Number(p.total_penjualan || 0);
      totalUntung += Number(p.keuntungan || 0);
    });

    // Update Dashboard Cards
    document.getElementById("statModal").textContent = formatRupiah(totalModal);
    document.getElementById("statPenjualan").textContent = formatRupiah(totalPenjualan);
    document.getElementById("statUntung").textContent = formatRupiah(totalUntung);
    document.getElementById("statBarang").textContent = barangList.length;

    // Render Recent Sales (5 transaksi terbaru)
    const recentSalesEl = document.getElementById("recentSales");
    if (recentSalesEl) {
      if (penjualanList.length === 0) {
        recentSalesEl.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada transaksi terbaru.</td></tr>`;
      } else {
        recentSalesEl.innerHTML = penjualanList.slice(0, 5).map(item => `
          <tr>
            <td>${item.tanggal}</td>
            <td><strong>${escapeHtml(item.nama_barang || "Barang Dihapus")}</strong> (${item.jumlah}x)</td>
            <td>${item.jumlah}</td>
            <td>${formatRupiah(item.total_penjualan)}</td>
            <td style="color: #10b981; font-weight: 600;">${formatRupiah(item.keuntungan)}</td>
          </tr>
        `).join("");
      }
    }
  }

  function loadKeuangan() {
    let totalModal = 0;
    let totalOmzet = 0;
    let totalProfit = 0;

    penjualanList.forEach(p => {
      totalModal += Number(p.total_modal || 0);
      totalOmzet += Number(p.total_penjualan || 0);
      totalProfit += Number(p.keuntungan || 0);
    });

    const fModal = document.getElementById("financeModal");
    const fOmzet = document.getElementById("financeOmzet");
    const fProfit = document.getElementById("financeProfit");

    if (fModal) fModal.textContent = formatRupiah(totalModal);
    if (fOmzet) fOmzet.textContent = formatRupiah(totalOmzet);
    if (fProfit) fProfit.textContent = formatRupiah(totalProfit);
  }

  // --- TOMBOL TUTUP MODAL & DOWNLOAD CSV ---
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const dialogId = btn.getAttribute("data-close");
      document.getElementById(dialogId)?.close();
    });
  });

  // Download CSV Barang
  document.getElementById("downloadBarang")?.addEventListener("click", () => {
    exportToCSV("data-barang.csv", ["No", "Nama Barang", "Harga Modal", "Harga Jual"], barangList.map((b, i) => [i + 1, b.nama, b.harga_modal, b.harga_jual]));
  });

  // Download CSV Penjualan
  document.getElementById("downloadPenjualan")?.addEventListener("click", () => {
    exportToCSV("data-penjualan.csv", ["No", "Tanggal", "Nama Barang", "Jumlah", "Total Modal", "Total Penjualan", "Keuntungan"], penjualanList.map((p, i) => [i + 1, p.tanggal, p.nama_barang, p.jumlah, p.total_modal, p.total_penjualan, p.keuntungan]));
  });

  // Download Laporan Keuangan
  document.getElementById("downloadKeuangan")?.addEventListener("click", () => {
    let totalModal = 0, totalOmzet = 0, totalProfit = 0;
    penjualanList.forEach(p => {
      totalModal += Number(p.total_modal || 0);
      totalOmzet += Number(p.total_penjualan || 0);
      totalProfit += Number(p.keuntungan || 0);
    });
    exportToCSV("laporan-keuangan.csv", ["Keterangan", "Jumlah (Rp)"], [
      ["Modal Barang Terjual", totalModal],
      ["Omzet Penjualan", totalOmzet],
      ["Keuntungan Kotor", totalProfit]
    ]);
  });

  function exportToCSV(filename, headers, rows) {
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Load awal saat aplikasi dibuka
  loadDashboard();
});
