const { createClient } = require("@libsql/client");

const db = createClient({
  url: "libsql://projek-1-sy060798.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MDYyMzgsImlkIjoiMDFhMTI2ZGQtZDcwMS03NmRkLWFjMmQtMDM0MmRhYjk1ZDU5Iiwia2lkIjoiTW9HX2plcnRabXRLY3FZTFlNdmRubm8tNnEyMzFudlZuZ1J2T0ZtM0pfdyIsInJpZCI6Ijk2Mzg2YmI4LTA4NTUtNDk0Ny04YjNhLWUzMDc0N2FjOWMzMiJ9.JIqJjSglywJwTSAiG0XGr0_TwzZi0lnpNRiv9artMqPf-pJ64VQgGjAnaDquykIRnYCD_GAIkzl6Cw_zEa4ICw"
});

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const method = req.method;

  try {
    if (method === 'GET') {
      const rs = await db.execute(`
        SELECT penjualan.*, barang.nama_barang 
        FROM penjualan 
        LEFT JOIN barang ON penjualan.barang_id = barang.id
        ORDER BY penjualan.id DESC
      `);
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { barang_id, jumlah, harga_satuan, pengeluaran_lain } = req.body;
      const total_harga = jumlah * harga_satuan;
      const p_lain = pengeluaran_lain || 0;

      // Ambil harga beli (modal dasar) barang dari katalog
      const cekBarang = await db.execute({
        sql: "SELECT harga_beli FROM barang WHERE id = ?",
        args: [barang_id]
      });

      if (cekBarang.rows.length === 0) {
        return res.status(404).json({ error: "Barang tidak ditemukan di katalog" });
      }

      const hargaBeliSatuan = cekBarang.rows[0].harga_beli;
      const totalModalBarang = hargaBeliSatuan * jumlah;
      const keuntunganBersih = total_harga - (totalModalBarang + p_lain);

      // 1. Simpan transaksi penjualan ke database
      await db.execute({
        sql: `INSERT INTO penjualan (barang_id, jumlah, harga_satuan, total_harga, total_modal, keuntungan, pengeluaran_lain) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [barang_id, jumlah, harga_satuan, total_harga, totalModalBarang, keuntunganBersih, p_lain]
      });

      // 2. Otomatis kurangi saldo modal toko (karena uang dipakai bayar supplier dropship)
      await db.execute({
        sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
        args: [-totalModalBarang, `Belanja Dropship: (Barang ID #${barang_id} x ${jumlah} pcs)`]
      });

      return res.status(201).json({ message: "Penjualan dicatat & saldo modal terpotong otomatis" });
    }
    else if (method === 'DELETE') {
      const { id } = req.query;

      // Jika penjualan dihapus, kembalikan modal yang terpotong sebelumnya ke saldo toko
      const getPenjualan = await db.execute({
        sql: "SELECT total_modal FROM penjualan WHERE id = ?",
        args: [id]
      });

      if (getPenjualan.rows.length > 0) {
        const modalKembali = getPenjualan.rows[0].total_modal;
        await db.execute({
          sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
          args: [modalKembali, `Refund/Pembatalan Penjualan Transaksi #${id}`]
        });
      }

      await db.execute({
        sql: "DELETE FROM penjualan WHERE id = ?",
        args: [id]
      });

      return res.status(200).json({ message: "Penjualan dihapus & saldo modal dikembalikan" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
