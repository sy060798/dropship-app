let barangList = [];
let penjualanList = [];

let barangPage = 1;
let penjualanPage = 1;
const limit = 10;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModals();
  loadData();

  document.getElementById('tanggalPenjualan').valueAsDate = new Date();
});

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, [data-go]');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-page') || link.getAttribute('data-go');
      if (!targetPage) return;

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${targetPage}`).classList.add('active');

      document.querySelectorAll('.nav-link').forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-page') === targetPage);
      });

      const titles = {
        dashboard: 'Dashboard',
        barang: 'Data Barang',
        penjualan: 'Data Penjualan',
        keuangan: 'Modal & Keuntungan'
      };
      document.getElementById('pageTitle').textContent = titles[targetPage] || 'Dashboard';
      sidebar.classList.remove('open');
    });
  });
}

function initModals() {
  const barangDialog = document.getElementById('barangDialog');
  document.getElementById('addBarang').addEventListener('click', () => {
    document.getElementById('barangForm').reset();
    document.getElementById('barangId').value = '';
    document.getElementById('barangFormTitle').textContent = 'Tambah Barang';
    document.getElementById('previewUntung').textContent = 'Rp0';
    barangDialog.showModal();
  });

  const penjualanDialog = document.getElementById('penjualanDialog');
  document.getElementById('addPenjualan').addEventListener('click', () => {
    document.getElementById('penjualanForm').reset();
    document.getElementById('penjualanId').value = '';
    document.getElementById('penjualanFormTitle').textContent = 'Catat Penjualan';
    document.getElementById('tanggalPenjualan').valueAsDate = new Date();
    document.getElementById('previewProfit').textContent = 'Rp0';
    penjualanDialog.showModal();
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      document.getElementById(modalId).close();
    });
  });

  const modalHModal = document.getElementById('modalBarang');
  const modalHJual = document.getElementById('jualBarang');
  const updateBarangPreview = () => {
    const m = Number(modalHModal.value) || 0;
    const j = Number(modalHJual.value) || 0;
    const untung = Math.max(0, j - m);
    document.getElementById('previewUntung').textContent = formatRupiah(untung);
  };
  modalHModal.addEventListener('input', updateBarangPreview);
  modalHJual.addEventListener('input', updateBarangPreview);

  const pilihBarang = document.getElementById('pilihBarang');
  const jmlJual = document.getElementById('jumlahPenjualan');
  const hJualTrx = document.getElementById('hargaJualTransaksi');

  pilihBarang.addEventListener('change', () => {
    const selectedId = pilihBarang.value;
    const item = barangList.find(b => b.id == selectedId);
    if (item) {
      hJualTrx.value = item.harga_jual;
      updatePenjualanPreview();
    }
  });

  const updatePenjualanPreview = () => {
    const selectedId = pilihBarang.value;
    const item = barangList.find(b => b.id == selectedId);
    if (!item) return;
    const qty = Number(jmlJual.value) || 0;
    const price = Number(hJualTrx.value) || 0;
    const profit = (price - item.harga_modal) * qty;
    document.getElementById('previewProfit').textContent = formatRupiah(profit);
  };

  jmlJual.addEventListener('input', updatePenjualanPreview);
  hJualTrx.addEventListener('input', updatePenjualanPreview);

  document.getElementById('barangForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('barangId').value;
    const payload = {
      nama: document.getElementById('namaBarang').value,
      harga_modal: Number(modalHModal.value),
      harga_jual: Number(modalHJual.value)
    };

    const url = id ? `/api/barang?id=${id}` : '/api/barang';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Gagal menyimpan barang');
      barangDialog.close();
      loadData();
      showNotice('Barang berhasil disimpan!');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('penjualanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('penjualanId').value;
    const payload = {
      tanggal: document.getElementById('tanggalPenjualan').value,
      barang_id: Number(pilihBarang.value),
      jumlah: Number(jmlJual.value),
      harga_jual_satuan: Number(hJualTrx.value)
    };

    const url = id ? `/api/penjualan?id=${id}` : '/api/penjualan';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Gagal menyimpan penjualan');
      penjualanDialog.close();
      loadData();
      showNotice('Penjualan berhasil dicatat!');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('searchBarang').addEventListener('input', (e) => {
    barangPage = 1;
    renderBarangTable(e.target.value);
  });

  document.getElementById('barangPrev').addEventListener('click', () => {
    if (barangPage > 1) { barangPage--; renderBarangTable(document.getElementById('searchBarang').value); }
  });
  document.getElementById('barangNext').addEventListener('click', () => {
    barangPage++; renderBarangTable(document.getElementById('searchBarang').value);
  });

  document.getElementById('searchPenjualan').addEventListener('input', (e) => {
    penjualanPage = 1;
    renderPenjualanTable(e.target.value);
  });

  document.getElementById('penjualanPrev').addEventListener('click', () => {
    if (penjualanPage > 1) { penjualanPage--; renderPenjualanTable(document.getElementById('searchPenjualan').value); }
  });
  document.getElementById('penjualanNext').addEventListener('click', () => {
    penjualanPage++; renderPenjualanTable(document.getElementById('searchPenjualan').value);
  });

  document.getElementById('downloadBarang').addEventListener('click', () => downloadCSV('barang', barangList));
  document.getElementById('downloadPenjualan').addEventListener('click', () => downloadCSV('penjualan', penjualanList));
  document.getElementById('downloadKeuangan').addEventListener('click', () => downloadCSV('keuangan', penjualanList));
}

async function loadData() {
  try {
    const [resBarang, resPenjualan] = await Promise.all([
      fetch('/api/barang'),
      fetch('/api/penjualan')
    ]);

    if (resBarang.ok) barangList = await resBarang.json();
    if (resPenjualan.ok) penjualanList = await resPenjualan.json();

    renderDashboard();
    renderBarangTable();
    renderPenjualanTable();
    renderKeuangan();
    populateSelectBarang();
  } catch (err) {
    console.error('Gagal memuat data:', err);
    showNotice('Gagal terhubung ke database server.', true);
  }
}

function renderDashboard() {
  const totalBarang = barangList.length;
  let totalModalTerjual = 0;
  let totalOmzet = 0;
  let totalUntung = 0;

  penjualanList.forEach(p => {
    const b = barangList.find(item => item.id == p.barang_id);
    const modalSatuan = b ? b.harga_modal : 0;
    const modalTrx = modalSatuan * p.jumlah;
    const omzetTrx = p.harga_jual_satuan * p.jumlah;

    totalModalTerjual += modalTrx;
    totalOmzet += omzetTrx;
    totalUntung += (omzetTrx - modalTrx);
  });

  document.getElementById('statModal').textContent = formatRupiah(totalModalTerjual);
  document.getElementById('statPenjualan').textContent = formatRupiah(totalOmzet);
  document.getElementById('statUntung').textContent = formatRupiah(totalUntung);
  document.getElementById('statBarang').textContent = totalBarang;

  const recentTbody = document.getElementById('recentSales');
  if (penjualanList.length === 0) {
    recentTbody.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada data penjualan</td></tr>`;
    return;
  }

  const recent = [...penjualanList].slice(0, 5);
  recentTbody.innerHTML = recent.map(p => {
    const b = barangList.find(item => item.id == p.barang_id);
    const nama = b ? b.nama : 'Barang Dihapus';
    const omzet = p.harga_jual_satuan * p.jumlah;
    const modal = (b ? b.harga_modal : 0) * p.jumlah;
    const untung = omzet - modal;

    return `
      <tr>
        <td>${formatDate(p.tanggal)}</td>
        <td><strong>${escapeHtml(nama)}</strong></td>
        <td>${p.jumlah}</td>
        <td>${formatRupiah(omzet)}</td>
        <td><span style="color: #16a34a; font-weight:600;">+${formatRupiah(untung)}</span></td>
      </tr>
    `;
  }).join('');
}

function renderBarangTable(search = '') {
  const filtered = barangList.filter(b => b.nama.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / limit) || 1;
  if (barangPage > totalPages) barangPage = totalPages;

  const start = (barangPage - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const tbody = document.getElementById('barangTable');
  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Tidak ada data barang ditemukan</td></tr>`;
  } else {
    tbody.innerHTML = paginated.map((b, index) => {
      const untungUnit = b.harga_jual - b.harga_modal;
      return `
        <tr>
          <td>${start + index + 1}</td>
          <td><strong>${escapeHtml(b.nama)}</strong></td>
          <td>${formatRupiah(b.harga_modal)}</td>
          <td>${formatRupiah(b.harga_jual)}</td>
          <td>${formatRupiah(untungUnit)}</td>
          <td>
            <button class="btn btn-light btn-sm" onclick="editBarang(${b.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBarang(${b.id})">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('barangInfo').textContent = `Menampilkan ${filtered.length} barang`;
  document.getElementById('barangPage').textContent = `${barangPage} / ${totalPages}`;
}

function renderPenjualanTable(search = '') {
  const filtered = penjualanList.filter(p => {
    const b = barangList.find(item => item.id == p.barang_id);
    const nama = b ? b.nama : '';
    return nama.toLowerCase().includes(search.toLowerCase()) || p.tanggal.includes(search);
  });

  const totalPages = Math.ceil(filtered.length / limit) || 1;
  if (penjualanPage > totalPages) penjualanPage = totalPages;

  const start = (penjualanPage - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const tbody = document.getElementById('penjualanTable');
  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Tidak ada data penjualan ditemukan</td></tr>`;
  } else {
    tbody.innerHTML = paginated.map((p, index) => {
      const b = barangList.find(item => item.id == p.barang_id);
      const nama = b ? b.nama : 'Barang Dihapus';
      const modalSatuan = b ? b.harga_modal : 0;
      const totalModal = modalSatuan * p.jumlah;
      const totalOmzet = p.harga_jual_satuan * p.jumlah;
      const keuntungan = totalOmzet - totalModal;

      return `
        <tr>
          <td>${start + index + 1}</td>
          <td>${formatDate(p.tanggal)}</td>
          <td><strong>${escapeHtml(nama)}</strong></td>
          <td>${p.jumlah}</td>
          <td>${formatRupiah(totalModal)}</td>
          <td>${formatRupiah(totalOmzet)}</td>
          <td><span style="color: #16a34a; font-weight:600;">+${formatRupiah(keuntungan)}</span></td>
          <td>
            <button class="btn btn-light btn-sm" onclick="editPenjualan(${p.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePenjualan(${p.id})">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('penjualanInfo').textContent = `Menampilkan ${filtered.length} transaksi`;
  document.getElementById('penjualanPage').textContent = `${penjualanPage} / ${totalPages}`;
}

function renderKeuangan() {
  let modalTerjual = 0;
  let omzet = 0;

  penjualanList.forEach(p => {
    const b = barangList.find(item => item.id == p.barang_id);
    const mSatuan = b ? b.harga_modal : 0;
    modalTerjual += mSatuan * p.jumlah;
    omzet += p.harga_jual_satuan * p.jumlah;
  });

  const profit = omzet - modalTerjual;

  document.getElementById('financeModal').textContent = formatRupiah(modalTerjual);
  document.getElementById('financeOmzet').textContent = formatRupiah(omzet);
  document.getElementById('financeProfit').textContent = formatRupiah(profit);
}

function populateSelectBarang() {
  const select = document.getElementById('pilihBarang');
  select.innerHTML = '<option value="">Pilih barang</option>' + barangList.map(b => `
    <option value="${b.id}">${escapeHtml(b.nama)} (Modal: ${formatRupiah(b.harga_modal)} | Jual: ${formatRupiah(b.harga_jual)})</option>
  `).join('');
}

window.editBarang = function(id) {
  const b = barangList.find(item => item.id == id);
  if (!b) return;
  document.getElementById('barangId').value = b.id;
  document.getElementById('namaBarang').value = b.nama;
  document.getElementById('modalBarang').value = b.harga_modal;
  document.getElementById('jualBarang').value = b.harga_jual;
  document.getElementById('previewUntung').textContent = formatRupiah(b.harga_jual - b.harga_modal);
  document.getElementById('barangFormTitle').textContent = 'Edit Barang';
  document.getElementById('barangDialog').showModal();
};

window.deleteBarang = async function(id) {
  if (!confirm('Yakin ingin menghapus barang ini?')) return;
  try {
    const res = await fetch(`/api/barang?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus barang');
    loadData();
    showNotice('Barang berhasil dihapus.');
  } catch (err) {
    alert(err.message);
  }
};

window.editPenjualan = function(id) {
  const p = penjualanList.find(item => item.id == id);
  if (!p) return;
  document.getElementById('penjualanId').value = p.id;
  document.getElementById('tanggalPenjualan').value = p.tanggal;
  document.getElementById('pilihBarang').value = p.barang_id;
  document.getElementById('jumlahPenjualan').value = p.jumlah;
  document.getElementById('hargaJualTransaksi').value = p.harga_jual_satuan;

  const b = barangList.find(item => item.id == p.barang_id);
  const profit = b ? (p.harga_jual_satuan - b.harga_modal) * p.jumlah : 0;
  document.getElementById('previewProfit').textContent = formatRupiah(profit);
  document.getElementById('penjualanFormTitle').textContent = 'Edit Penjualan';
  document.getElementById('penjualanDialog').showModal();
};

window.deletePenjualan = async function(id) {
  if (!confirm('Yakin ingin menghapus catatan penjualan ini?')) return;
  try {
    const res = await fetch(`/api/penjualan?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus penjualan');
    loadData();
    showNotice('Penjualan berhasil dihapus.');
  } catch (err) {
    alert(err.message);
  }
};

function downloadCSV(type, data) {
  let csvContent = "data:text/csv;charset=utf-8,";
  if (type === 'barang') {
    csvContent += "No,Nama Barang,Harga Modal,Harga Jual,Untung Per Unit\r\n";
    data.forEach((b, i) => {
      csvContent += `${i + 1},"${b.nama}",${b.harga_modal},${b.harga_jual},${b.harga_jual - b.harga_modal}\r\n`;
    });
  } else if (type === 'penjualan') {
    csvContent += "No,Tanggal,Nama Barang,Jumlah,Total Modal,Total Penjualan,Keuntungan\r\n";
    data.forEach((p, i) => {
      const b = barangList.find(item => item.id == p.barang_id);
      const nama = b ? b.nama : 'Barang Dihapus';
      const m = (b ? b.harga_modal : 0) * p.jumlah;
      const o = p.harga_jual_satuan * p.jumlah;
      csvContent += `${i + 1},${p.tanggal},"${nama}",${p.jumlah},${m},${o},${o - m}\r\n`;
    });
  } else if (type === 'keuangan') {
    csvContent += "Laporan Keuangan Dropship\r\n";
    let m = 0, o = 0;
    data.forEach(p => {
      const b = barangList.find(item => item.id == p.barang_id);
      m += (b ? b.harga_modal : 0) * p.jumlah;
      o += p.harga_jual_satuan * p.jumlah;
    });
    csvContent += `Total Modal Barang Terjual,${m}\r\n`;
    csvContent += `Omzet Penjualan,${o}\r\n`;
    csvContent += `Keuntungan Kotor,${o - m}\r\n`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href
