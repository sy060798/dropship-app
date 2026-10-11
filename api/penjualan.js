const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://projek-1-sy060798.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MDc5MTMsImlkIjoiMDFhMTI2ZGQtZDcwMS03NmRkLWFjMmQtMDM0MmRhYjk1ZDU5Iiwia2lkIjoiTW9HX2plcnRabXRLY3FZTFlNdmRubm8tNnEyMzFudlZuZ1J2T0ZtM0pfdyIsInJpZCI6Ijk2Mzg2YmI4LTA4NTUtNDk0Ny04YjNhLWUzMDc0N2FjOWMzMiJ9.QdjEu8V4UnWS5Z_lPBwe2aqTlTMXv7ucB_3enz0-6oaW0ugNBXsBUkzmyjlLqa5GU_Y1oQD65FuS2eJB8DtYBw"
});

module.exports = async (req, res) => {
  // Header CORS agar diizinkan diakses oleh frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parsing body aman untuk Vercel Serverless Function
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

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
      const { barang_id, jumlah, harga_satuan, pengeluaran_lain } = body;
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
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
